import { View, Text, SectionList, ActivityIndicator, TouchableOpacity, RefreshControl, Alert, StyleSheet, Modal } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useState, useCallback } from 'react';
import { Stack, useRouter, useFocusEffect } from 'expo-router';
import { TransactionsService } from '../services/api';
import { getCategories } from '../services/database';
import { isConnected } from '../services/sync';
import type { TransactionResponse, CategoryResponse } from '../types';
import { format, parseISO, isToday, isYesterday, startOfWeek, endOfWeek, startOfMonth, endOfMonth, subMonths } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { ArrowUpRight, ArrowDownLeft, Filter, Calendar, X } from 'lucide-react-native';

interface SectionData {
    title: string;
    data: TransactionResponse[];
    total: number;
}

type FilterPeriod = 'today' | 'week' | 'month' | 'last3months' | 'all';

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#f9fafb',
    },
    offlineBanner: {
        backgroundColor: '#fed7aa',
        padding: 8,
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
    },
    offlineText: {
        color: '#c2410c',
        fontSize: 12,
        fontWeight: 'bold',
    },
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    summaryCard: {
        backgroundColor: 'white',
        marginHorizontal: 16,
        marginBottom: 16,
        padding: 16,
        borderRadius: 12,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 2,
        elevation: 1,
    },
    summaryRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 12,
    },
    summaryLabel: {
        fontSize: 14,
        color: '#6b7280',
        fontWeight: '500',
    },
    summaryValue: {
        fontSize: 18,
        fontWeight: 'bold',
    },
    incomeValue: {
        color: '#059669',
    },
    expenseValue: {
        color: '#dc2626',
    },
    balanceValue: {
        color: '#1f2937',
    },
    divider: {
        height: 1,
        backgroundColor: '#e5e7eb',
        marginVertical: 8,
    },
    filterBadge: {
        position: 'absolute',
        top: 0,
        right: 0,
        width: 8,
        height: 8,
        borderRadius: 4,
        backgroundColor: '#3b82f6',
    },
    sectionHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 16,
        paddingVertical: 12,
        marginTop: 8,
    },
    sectionTitle: {
        fontWeight: 'bold',
        color: '#6b7280',
        fontSize: 12,
        textTransform: 'uppercase',
    },
    sectionTotal: {
        fontSize: 12,
        fontWeight: 'bold',
    },
    transactionItem: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 16,
        backgroundColor: 'white',
        marginBottom: 1,
    },
    iconCircle: {
        width: 40,
        height: 40,
        borderRadius: 20,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 12,
    },
    iconCircleExpense: {
        backgroundColor: '#fed7aa',
    },
    iconCircleIncome: {
        backgroundColor: '#d1fae5',
    },
    transactionInfo: {
        flex: 1,
    },
    transactionDescription: {
        fontWeight: '600',
        color: '#1f2937',
        fontSize: 16,
    },
    transactionCategory: {
        color: '#9ca3af',
        fontSize: 12,
    },
    transactionAmount: {
        fontWeight: 'bold',
        fontSize: 16,
        textAlign: 'right',
    },
    transactionAmountExpense: {
        color: '#1f2937',
    },
    transactionAmountIncome: {
        color: '#059669',
    },
    transactionStatus: {
        color: '#f97316',
        fontSize: 10,
        fontWeight: 'bold',
        textTransform: 'uppercase',
        textAlign: 'right',
    },
    emptyContainer: {
        alignItems: 'center',
        paddingVertical: 80,
        paddingHorizontal: 40,
    },
    emptyIcon: {
        width: 64,
        height: 64,
        backgroundColor: '#e5e7eb',
        borderRadius: 32,
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 16,
    },
    emptyTitle: {
        color: '#1f2937',
        fontWeight: 'bold',
        fontSize: 18,
        marginBottom: 8,
    },
    emptyText: {
        color: '#9ca3af',
        textAlign: 'center',
    },
    // Filter Modal Styles
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.5)',
        justifyContent: 'flex-end',
    },
    modalContent: {
        backgroundColor: 'white',
        borderTopLeftRadius: 24,
        borderTopRightRadius: 24,
        paddingBottom: 40,
    },
    modalHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: 20,
        borderBottomWidth: 1,
        borderBottomColor: '#e5e7eb',
    },
    modalTitle: {
        fontSize: 20,
        fontWeight: 'bold',
        color: '#1f2937',
    },
    filterOption: {
        padding: 16,
        borderBottomWidth: 1,
        borderBottomColor: '#f3f4f6',
        flexDirection: 'row',
        alignItems: 'center',
    },
    filterOptionActive: {
        backgroundColor: '#eff6ff',
    },
    filterOptionText: {
        fontSize: 16,
        color: '#374151',
        marginLeft: 12,
    },
    filterOptionTextActive: {
        color: '#2563eb',
        fontWeight: 'bold',
    },
});

export default function History() {
    const [sections, setSections] = useState<SectionData[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [isOffline, setIsOffline] = useState(false);
    const [categoryMap, setCategoryMap] = useState<Record<string, CategoryResponse>>({});
    const [showFilterModal, setShowFilterModal] = useState(false);
    const [filterPeriod, setFilterPeriod] = useState<FilterPeriod>('month');
    const [totalIncome, setTotalIncome] = useState(0);
    const [totalExpense, setTotalExpense] = useState(0);

    const getDateRange = (period: FilterPeriod): { start?: string, end?: string } => {
        const now = new Date();
        switch (period) {
            case 'today':
                const today = format(now, 'yyyy-MM-dd');
                return { start: today, end: today };
            case 'week':
                return {
                    start: format(startOfWeek(now, { weekStartsOn: 0 }), 'yyyy-MM-dd'),
                    end: format(endOfWeek(now, { weekStartsOn: 0 }), 'yyyy-MM-dd'),
                };
            case 'month':
                return {
                    start: format(startOfMonth(now), 'yyyy-MM-dd'),
                    end: format(endOfMonth(now), 'yyyy-MM-dd'),
                };
            case 'last3months':
                return {
                    start: format(subMonths(startOfMonth(now), 2), 'yyyy-MM-dd'),
                    end: format(endOfMonth(now), 'yyyy-MM-dd'),
                };
            case 'all':
            default:
                return {};
        }
    };

    const loadData = async () => {
        try {
            const connected = await isConnected();
            setIsOffline(!connected);

            // Load Categories from Cache
            try {
                const cats = await getCategories();
                const catMap: Record<string, CategoryResponse> = {};
                cats.forEach(c => catMap[c.id] = c);
                setCategoryMap(catMap);
            } catch (catError) {
                console.error('Error loading categories:', catError);
            }

            if (!connected) {
                setLoading(false);
                setRefreshing(false);
                return;
            }

            // Fetch Transactions with date filter
            const { start, end } = getDateRange(filterPeriod);
            const data = await TransactionsService.getAll(start, end);

            // Calculate totals
            let income = 0;
            let expense = 0;
            data.forEach(t => {
                const category = categoryMap[t.categoryId];
                if (category?.type === 'Income' || t.amount > 0) {
                    income += Math.abs(t.amount);
                } else {
                    expense += Math.abs(t.amount);
                }
            });
            setTotalIncome(income);
            setTotalExpense(expense);

            // Sort Descending (newest first)
            const sorted = data.sort((a, b) => new Date(b.dueDate).getTime() - new Date(a.dueDate).getTime());

            // Group by Date
            const grouped: Record<string, { data: TransactionResponse[], total: number }> = {};

            sorted.forEach(item => {
                const dateKey = item.dueDate.split('T')[0];
                if (!grouped[dateKey]) {
                    grouped[dateKey] = { data: [], total: 0 };
                }
                grouped[dateKey].data.push(item);
                grouped[dateKey].total += item.amount;
            });

            const sectionsArray: SectionData[] = Object.keys(grouped)
                .sort((a, b) => new Date(b).getTime() - new Date(a).getTime())
                .map(date => ({
                    title: date,
                    data: grouped[date].data,
                    total: grouped[date].total
                }));

            setSections(sectionsArray);

        } catch (error) {
            console.error('Error loading history:', error);
            Alert.alert('Erro', 'Não foi possível carregar o histórico. Tente sincronizar os dados.');
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    useFocusEffect(
        useCallback(() => {
            loadData();
        }, [filterPeriod])
    );

    const onRefresh = () => {
        setRefreshing(true);
        loadData();
    };

    const getDayLabel = (dateString: string) => {
        const date = parseISO(dateString);
        if (isToday(date)) return 'Hoje';
        if (isYesterday(date)) return 'Ontem';
        return format(date, "EEEE, dd 'de' MMMM", { locale: ptBR });
    };

    const applyFilter = (period: FilterPeriod) => {
        setFilterPeriod(period);
        setShowFilterModal(false);
        setLoading(true);
    };

    const getFilterLabel = () => {
        switch (filterPeriod) {
            case 'today': return 'Hoje';
            case 'week': return 'Esta Semana';
            case 'month': return 'Este Mês';
            case 'last3months': return 'Últimos 3 Meses';
            case 'all': return 'Tudo';
        }
    };

    const renderItem = ({ item }: { item: TransactionResponse }) => {
        const category = categoryMap[item.categoryId];
        const isExpense = item.amount < 0;
        const visualIsExpense = isExpense || (category?.type === 'Expense');

        const amountDisplay = Math.abs(item.amount).toFixed(2);

        return (
            <TouchableOpacity style={styles.transactionItem}>
                <View style={[styles.iconCircle, visualIsExpense ? styles.iconCircleExpense : styles.iconCircleIncome]}>
                    <Text style={{ fontSize: 18 }}>{category?.icon || (visualIsExpense ? '💸' : '💰')}</Text>
                </View>
                <View style={styles.transactionInfo}>
                    <Text style={styles.transactionDescription} numberOfLines={1}>{item.description}</Text>
                    <Text style={styles.transactionCategory}>
                        {category?.name || 'Sem Categoria'}
                    </Text>
                </View>
                <View>
                    <Text style={[styles.transactionAmount, visualIsExpense ? styles.transactionAmountExpense : styles.transactionAmountIncome]}>
                        {visualIsExpense ? '-' : '+'} R$ {amountDisplay}
                    </Text>
                    {item.status !== 'Paid' && (
                        <Text style={styles.transactionStatus}>{item.status}</Text>
                    )}
                </View>
            </TouchableOpacity>
        );
    };

    return (
        <SafeAreaView style={styles.container} edges={['top']}>
            <Stack.Screen
                options={{
                    title: 'Extrato',
                    headerShown: true,
                    headerShadowVisible: false,
                    headerStyle: { backgroundColor: '#F9FAFB' },
                    headerRight: () => (
                        <TouchableOpacity onPress={() => setShowFilterModal(true)} style={{ padding: 8, marginTop: 8 }}>
                            <Filter size={20} color="#6B7280" />
                            {filterPeriod !== 'month' && <View style={styles.filterBadge} />}
                        </TouchableOpacity>
                    )
                }}
            />

            {isOffline && (
                <View style={styles.offlineBanner}>
                    <Text style={styles.offlineText}>⚠️ Modo Offline - Exibindo dados em cache</Text>
                </View>
            )}

            {/* Summary Card */}
            {!loading && sections.length > 0 && (
                <View style={styles.summaryCard}>
                    <View style={styles.summaryRow}>
                        <Text style={styles.summaryLabel}>Receitas</Text>
                        <Text style={[styles.summaryValue, styles.incomeValue]}>+ R$ {totalIncome.toFixed(2)}</Text>
                    </View>
                    <View style={styles.summaryRow}>
                        <Text style={styles.summaryLabel}>Despesas</Text>
                        <Text style={[styles.summaryValue, styles.expenseValue]}>- R$ {totalExpense.toFixed(2)}</Text>
                    </View>
                    <View style={styles.divider} />
                    <View style={styles.summaryRow}>
                        <Text style={[styles.summaryLabel, { fontWeight: 'bold' }]}>Saldo ({getFilterLabel()})</Text>
                        <Text style={[styles.summaryValue, styles.balanceValue]}>R$ {(totalIncome - totalExpense).toFixed(2)}</Text>
                    </View>
                </View>
            )}

            {loading && !refreshing ? (
                <View style={styles.loadingContainer}>
                    <ActivityIndicator size="large" color="#4F46E5" />
                </View>
            ) : (
                <SectionList
                    sections={sections}
                    keyExtractor={item => item.id}
                    renderItem={renderItem}
                    contentContainerStyle={{ paddingBottom: 20 }}
                    stickySectionHeadersEnabled={false}
                    refreshControl={
                        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#4F46E5']} />
                    }
                    renderSectionHeader={({ section: { title, total } }) => (
                        <View style={styles.sectionHeader}>
                            <Text style={styles.sectionTitle}>
                                {getDayLabel(title)}
                            </Text>
                            <Text style={[styles.sectionTotal, { color: total < 0 ? '#ef4444' : '#059669' }]}>
                                Total: R$ {Math.abs(total).toFixed(2)}
                            </Text>
                        </View>
                    )}
                    ListEmptyComponent={
                        <View style={styles.emptyContainer}>
                            <View style={styles.emptyIcon}>
                                <Text style={{ fontSize: 28 }}>📄</Text>
                            </View>
                            <Text style={styles.emptyTitle}>Nenhum movimento</Text>
                            <Text style={styles.emptyText}>Suas transações aparecerão aqui.</Text>
                        </View>
                    }
                />
            )}

            {/* Filter Modal */}
            <Modal visible={showFilterModal} animationType="slide" transparent>
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContent}>
                        <View style={styles.modalHeader}>
                            <Text style={styles.modalTitle}>Filtrar Período</Text>
                            <TouchableOpacity onPress={() => setShowFilterModal(false)}>
                                <X size={24} color="#6b7280" />
                            </TouchableOpacity>
                        </View>

                        <TouchableOpacity
                            style={[styles.filterOption, filterPeriod === 'today' && styles.filterOptionActive]}
                            onPress={() => applyFilter('today')}
                        >
                            <Calendar size={20} color={filterPeriod === 'today' ? '#2563eb' : '#6b7280'} />
                            <Text style={[styles.filterOptionText, filterPeriod === 'today' && styles.filterOptionTextActive]}>
                                Hoje
                            </Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                            style={[styles.filterOption, filterPeriod === 'week' && styles.filterOptionActive]}
                            onPress={() => applyFilter('week')}
                        >
                            <Calendar size={20} color={filterPeriod === 'week' ? '#2563eb' : '#6b7280'} />
                            <Text style={[styles.filterOptionText, filterPeriod === 'week' && styles.filterOptionTextActive]}>
                                Esta Semana
                            </Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                            style={[styles.filterOption, filterPeriod === 'month' && styles.filterOptionActive]}
                            onPress={() => applyFilter('month')}
                        >
                            <Calendar size={20} color={filterPeriod === 'month' ? '#2563eb' : '#6b7280'} />
                            <Text style={[styles.filterOptionText, filterPeriod === 'month' && styles.filterOptionTextActive]}>
                                Este Mês
                            </Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                            style={[styles.filterOption, filterPeriod === 'last3months' && styles.filterOptionActive]}
                            onPress={() => applyFilter('last3months')}
                        >
                            <Calendar size={20} color={filterPeriod === 'last3months' ? '#2563eb' : '#6b7280'} />
                            <Text style={[styles.filterOptionText, filterPeriod === 'last3months' && styles.filterOptionTextActive]}>
                                Últimos 3 Meses
                            </Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                            style={[styles.filterOption, filterPeriod === 'all' && styles.filterOptionActive]}
                            onPress={() => applyFilter('all')}
                        >
                            <Calendar size={20} color={filterPeriod === 'all' ? '#2563eb' : '#6b7280'} />
                            <Text style={[styles.filterOptionText, filterPeriod === 'all' && styles.filterOptionTextActive]}>
                                Todas as Transações
                            </Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </Modal>
        </SafeAreaView>
    );
}
