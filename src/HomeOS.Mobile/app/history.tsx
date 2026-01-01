import { View, Text, SectionList, ActivityIndicator, TouchableOpacity, RefreshControl, Alert } from 'react-native';
import { useState, useCallback } from 'react';
import { Stack, useRouter, useFocusEffect } from 'expo-router';
import { TransactionsService } from '../services/api';
import { getCategories } from '../services/database';
import { isConnected } from '../services/sync';
import type { TransactionResponse, CategoryResponse } from '../types';
import { format, parseISO, isToday, isYesterday } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { ArrowUpRight, ArrowDownLeft, Filter } from 'lucide-react-native';

interface SectionData {
    title: string;
    data: TransactionResponse[];
    total: number;
}

export default function History() {
    const [sections, setSections] = useState<SectionData[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [isOffline, setIsOffline] = useState(false);
    const [categoryMap, setCategoryMap] = useState<Record<string, CategoryResponse>>({});

    const loadData = async () => {
        try {
            const connected = await isConnected();
            setIsOffline(!connected);

            // Load Categories from Cache (Offline fast access)
            try {
                const cats = await getCategories();
                const catMap: Record<string, CategoryResponse> = {};
                cats.forEach(c => catMap[c.id] = c);
                setCategoryMap(catMap);
            } catch (catError) {
                console.error('Error loading categories:', catError);
                // Continue without categories - transactions will show without category names
            }

            if (!connected) {
                setLoading(false);
                setRefreshing(false);
                return;
            }

            // Fetch Transactions
            const data = await TransactionsService.getAll();

            // Sort Descending
            const sorted = data.sort((a, b) => new Date(b.dueDate).getTime() - new Date(a.dueDate).getTime());

            // Group by Date
            const grouped: Record<string, { data: TransactionResponse[], total: number }> = {};

            sorted.forEach(item => {
                const dateKey = item.dueDate.split('T')[0];
                if (!grouped[dateKey]) {
                    grouped[dateKey] = { data: [], total: 0 };
                }
                grouped[dateKey].data.push(item);

                // Assuming negative for Expense for now, or use Category Type if available
                // If amount is absolute, we might need logic.
                // But usually APIs return signed. If not, we will fix later.
                // Let's assume signed for now based on previous simple view.
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
        }, [])
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

    const renderItem = ({ item }: { item: TransactionResponse }) => {
        const category = categoryMap[item.categoryId];
        const isExpense = item.amount < 0;
        // Fallback checks if API sends positive numbers for expenses
        const visualIsExpense = isExpense || (category?.type === 'Expense');

        const amountDisplay = Math.abs(item.amount).toFixed(2);
        const colorClass = visualIsExpense ? 'text-gray-900' : 'text-green-600';

        return (
            <TouchableOpacity className="flex-row items-center p-4 bg-white mb-[1px] last:mb-2 active:bg-gray-50">
                <View className={`w-10 h-10 rounded-full justify-center items-center mr-3 ${visualIsExpense ? 'bg-orange-100' : 'bg-green-100'}`}>
                    <Text className="text-lg">{category?.icon || (visualIsExpense ? '💸' : '💰')}</Text>
                </View>
                <View className="flex-1">
                    <Text className="font-semibold text-gray-800 text-base" numberOfLines={1}>{item.description}</Text>
                    <Text className="text-gray-400 text-xs">
                        {category?.name || 'Sem Categoria'}
                    </Text>
                </View>
                <View>
                    <Text className={`font-bold text-base text-right ${visualIsExpense ? 'text-gray-800' : 'text-green-600'}`}>
                        {visualIsExpense ? '-' : '+'} R$ {amountDisplay}
                    </Text>
                    {item.status !== 'Paid' && (
                        <Text className="text-orange-500 text-[10px] text-right font-bold uppercase">{item.status}</Text>
                    )}
                </View>
            </TouchableOpacity>
        );
    };

    return (
        <View className="flex-1 bg-gray-50 pt-6">
            <Stack.Screen
                options={{
                    title: 'Extrato',
                    headerShadowVisible: false,
                    headerStyle: { backgroundColor: '#F9FAFB' },
                    headerRight: () => (
                        <TouchableOpacity className="p-2 mt-2">
                            <Filter size={20} color="#6B7280" />
                        </TouchableOpacity>
                    )
                }}
            />

            {isOffline && (
                <View className="bg-orange-100 p-2 flex-row justify-center items-center sticky top-0 z-10">
                    <Text className="text-orange-700 text-xs font-bold">⚠️ Modo Offline - Exibindo dados em cache</Text>
                </View>
            )}

            {loading && !refreshing ? (
                <View className="flex-1 justify-center items-center">
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
                        <View className="flex-row justify-between items-center px-4 py-3 mt-2">
                            <Text className="font-bold text-gray-500 text-sm uppercase">
                                {getDayLabel(title)}
                            </Text>
                            <Text className={`text-xs font-bold ${total < 0 ? 'text-red-500' : 'text-green-600'}`}>
                                Total: R$ {Math.abs(total).toFixed(2)}
                            </Text>
                        </View>
                    )}
                    ListEmptyComponent={
                        <View className="items-center py-20 px-10">
                            <View className="w-16 h-16 bg-gray-200 rounded-full items-center justify-center mb-4">
                                <Text className="text-3xl">📄</Text>
                            </View>
                            <Text className="text-gray-800 font-bold text-lg mb-2">Nenhum movimento</Text>
                            <Text className="text-gray-400 text-center">Suas transações aparecerão aqui.</Text>
                        </View>
                    }
                />
            )}
        </View>
    );
}
