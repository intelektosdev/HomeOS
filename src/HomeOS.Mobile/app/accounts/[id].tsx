import { View, Text, ScrollView, TouchableOpacity, ActivityIndicator, Alert, SectionList } from 'react-native';
import { useState, useCallback } from 'react';
import { Stack, useLocalSearchParams, useRouter, useFocusEffect } from 'expo-router';
import { AccountsService, TransactionsService } from '../../services/api';
import { getCategories } from '../../services/database';
import { isConnected } from '../../services/sync';
import type { AccountResponse, TransactionResponse, CategoryResponse } from '../../types';
import { format, parseISO, isToday, isYesterday } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Building2, Wallet, TrendingUp, Edit3, Power, AlertCircle, Plus } from 'lucide-react-native';

interface SectionData {
    title: string;
    data: TransactionResponse[];
}

export default function AccountDetailsScreen() {
    const { id } = useLocalSearchParams<{ id: string }>();
    const router = useRouter();
    const [account, setAccount] = useState<AccountResponse | null>(null);
    const [transactions, setTransactions] = useState<TransactionResponse[]>([]);
    const [sections, setSections] = useState<SectionData[]>([]);
    const [categories, setCategories] = useState<Record<string, CategoryResponse>>({});
    const [loading, setLoading] = useState(true);
    const [isOffline, setIsOffline] = useState(false);

    // Statistics
    const [currentBalance, setCurrentBalance] = useState(0);
    const [monthlyIncome, setMonthlyIncome] = useState(0);
    const [monthlyExpense, setMonthlyExpense] = useState(0);

    const loadData = async () => {
        try {
            const connected = await isConnected();
            setIsOffline(!connected);

            // Load categories from cache
            try {
                const cats = await getCategories();
                const catMap: Record<string, CategoryResponse> = {};
                cats.forEach(c => catMap[c.id] = c);
                setCategories(catMap);
            } catch (catError) {
                console.error('Error loading categories:', catError);
            }

            if (!connected) {
                setLoading(false);
                return;
            }

            // Fetch account and transactions
            const [accounts, txs] = await Promise.all([
                AccountsService.getAll(),
                TransactionsService.getAll(undefined, undefined, undefined, id)
            ]);

            const accountData = accounts.find(a => a.id === id);
            if (!accountData) {
                throw new Error('Account not found');
            }

            setAccount(accountData);
            setTransactions(txs);

            // Calculate current balance
            const transactionsTotal = txs.reduce((sum, tx) => sum + tx.amount, 0);
            const balance = accountData.initialBalance + transactionsTotal;
            setCurrentBalance(balance);

            // Calculate monthly statistics
            const today = new Date();
            const firstDayOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
            const monthTxs = txs.filter(tx => new Date(tx.dueDate) >= firstDayOfMonth);

            const income = monthTxs.filter(tx => tx.amount > 0).reduce((sum, tx) => sum + tx.amount, 0);
            const expense = Math.abs(monthTxs.filter(tx => tx.amount < 0).reduce((sum, tx) => sum + tx.amount, 0));

            setMonthlyIncome(income);
            setMonthlyExpense(expense);

            // Group by date
            const sorted = txs.sort((a, b) => new Date(b.dueDate).getTime() - new Date(a.dueDate).getTime());
            const grouped: Record<string, TransactionResponse[]> = {};

            sorted.forEach(tx => {
                const dateKey = tx.dueDate.split('T')[0];
                if (!grouped[dateKey]) grouped[dateKey] = [];
                grouped[dateKey].push(tx);
            });

            const sectionsArray: SectionData[] = Object.keys(grouped)
                .sort((a, b) => new Date(b).getTime() - new Date(a).getTime())
                .map(date => ({
                    title: date,
                    data: grouped[date]
                }));

            setSections(sectionsArray);

        } catch (error) {
            console.error('Error loading account details:', error);
            if (!isOffline) {
                Alert.alert('Erro', 'Não foi possível carregar os detalhes da conta.');
            }
        } finally {
            setLoading(false);
        }
    };

    useFocusEffect(
        useCallback(() => {
            loadData();
        }, [id])
    );

    const handleToggleStatus = async () => {
        if (!account) return;

        Alert.alert(
            account.isActive ? 'Desativar Conta' : 'Ativar Conta',
            `Deseja ${account.isActive ? 'desativar' : 'ativar'} a conta "${account.name}"?`,
            [
                { text: 'Cancelar', style: 'cancel' },
                {
                    text: 'Confirmar',
                    onPress: async () => {
                        try {
                            await AccountsService.toggleStatus(id);
                            Alert.alert('Sucesso', `Conta ${account.isActive ? 'desativada' : 'ativada'} com sucesso!`);
                            loadData();
                        } catch (error) {
                            console.error('Error toggling account status:', error);
                            Alert.alert('Erro', 'Não foi possível alterar o status da conta.');
                        }
                    }
                }
            ]
        );
    };

    const getAccountIcon = (type: string) => {
        switch (type) {
            case 'Checking':
                return { Icon: Building2, color: '#3B82F6' };
            case 'Wallet':
                return { Icon: Wallet, color: '#10B981' };
            case 'Investment':
                return { Icon: TrendingUp, color: '#8B5CF6' };
            default:
                return { Icon: Wallet, color: '#6B7280' };
        }
    };

    const getAccountTypeName = (type: string) => {
        switch (type) {
            case 'Checking': return 'Conta Corrente';
            case 'Wallet': return 'Carteira';
            case 'Investment': return 'Investimento';
            default: return type;
        }
    };

    const getDayLabel = (dateString: string) => {
        const date = parseISO(dateString);
        if (isToday(date)) return 'Hoje';
        if (isYesterday(date)) return 'Ontem';
        return format(date, "EEEE, dd 'de' MMMM", { locale: ptBR });
    };

    const renderTransaction = ({ item }: { item: TransactionResponse }) => {
        const category = categories[item.categoryId];
        const isIncome = item.amount > 0;

        return (
            <View className="flex-row items-center p-4 bg-white mb-[1px]">
                <View className={`w-10 h-10 rounded-full justify-center items-center mr-3 ${isIncome ? 'bg-green-100' : 'bg-orange-100'}`}>
                    <Text className="text-lg">{category?.icon || (isIncome ? '💰' : '💸')}</Text>
                </View>
                <View className="flex-1">
                    <Text className="font-semibold text-gray-800 text-base" numberOfLines={1}>
                        {item.description}
                    </Text>
                    <Text className="text-gray-400 text-xs">
                        {category?.name || 'Sem Categoria'} • {item.status}
                    </Text>
                </View>
                <Text className={`font-bold text-base ${isIncome ? 'text-green-600' : 'text-gray-800'}`}>
                    {isIncome ? '+' : '-'} R$ {Math.abs(item.amount).toFixed(2)}
                </Text>
            </View>
        );
    };

    if (loading) {
        return (
            <View className="flex-1 bg-gray-50 pt-6 justify-center items-center">
                <Stack.Screen options={{ title: 'Carregando...' }} />
                <ActivityIndicator size="large" color="#3B82F6" />
            </View>
        );
    }

    if (!account) {
        return (
            <View className="flex-1 bg-gray-50 pt-6 justify-center items-center px-10">
                <Stack.Screen options={{ title: 'Erro' }} />
                <AlertCircle size={48} color="#EF4444" />
                <Text className="text-gray-800 font-bold text-lg mb-2 mt-4">Conta não encontrada</Text>
                <Text className="text-gray-400 text-center">Não foi possível carregar os detalhes desta conta.</Text>
            </View>
        );
    }

    const { Icon, color } = getAccountIcon(account.type);
    const monthlyChange = monthlyIncome - monthlyExpense;

    return (
        <View className="flex-1 bg-gray-50 pt-6">
            <Stack.Screen
                options={{
                    title: account.name,
                    headerShadowVisible: false,
                    headerStyle: { backgroundColor: '#F9FAFB' },
                    headerRight: () => (
                        <View className="flex-row gap-2">
                            <TouchableOpacity
                                className="p-2"
                                onPress={() => router.push(`/accounts/form?id=${id}`)}
                            >
                                <Edit3 size={20} color="#6B7280" />
                            </TouchableOpacity>
                            <TouchableOpacity
                                className="p-2"
                                onPress={handleToggleStatus}
                            >
                                <Power size={20} color={account.isActive ? '#10B981' : '#EF4444'} />
                            </TouchableOpacity>
                        </View>
                    )
                }}
            />

            {isOffline && (
                <View className="bg-orange-100 p-2 flex-row justify-center items-center">
                    <Text className="text-orange-700 text-xs font-bold">⚠️ Modo Offline</Text>
                </View>
            )}

            <SectionList
                sections={sections}
                keyExtractor={item => item.id}
                renderItem={renderTransaction}
                stickySectionHeadersEnabled={false}
                renderSectionHeader={({ section: { title } }) => (
                    <View className="px-4 py-2 bg-gray-50">
                        <Text className="font-bold text-gray-500 text-xs uppercase">
                            {getDayLabel(title)}
                        </Text>
                    </View>
                )}
                ListHeaderComponent={
                    <>
                        {/* Account Header */}
                        <View className="p-6 mx-4 mt-4 mb-6 rounded-3xl shadow-lg" style={{ backgroundColor: color }}>
                            <View className="flex-row items-center mb-4">
                                <Icon size={32} color="white" />
                                <View className="ml-3">
                                    <Text className="text-white/80 text-sm">{getAccountTypeName(account.type)}</Text>
                                    <Text className="text-white text-2xl font-bold">{account.name}</Text>
                                </View>
                            </View>

                            <View className="mb-4">
                                <Text className="text-white/80 text-sm mb-1">Saldo Atual</Text>
                                <Text className="text-white text-4xl font-bold">
                                    R$ {currentBalance.toFixed(2)}
                                </Text>
                            </View>

                            <View className="flex-row justify-between pt-4 border-t border-white/20">
                                <View>
                                    <Text className="text-white/60 text-xs">Este mês</Text>
                                    <Text className={`font-bold ${monthlyChange >= 0 ? 'text-white' : 'text-red-200'}`}>
                                        {monthlyChange >= 0 ? '+' : ''}R$ {monthlyChange.toFixed(2)}
                                    </Text>
                                </View>
                                {!account.isActive && (
                                    <View className="bg-white/30 px-3 py-1 rounded-full">
                                        <Text className="text-white font-bold text-xs">INATIVA</Text>
                                    </View>
                                )}
                            </View>
                        </View>

                        {/* Statistics */}
                        <View className="px-4 mb-4">
                            <View className="bg-white rounded-2xl p-4 flex-row justify-around">
                                <View className="items-center flex-1">
                                    <Text className="text-gray-400 text-xs mb-1">Receitas</Text>
                                    <Text className="text-green-600 font-bold text-lg">
                                        R$ {monthlyIncome.toFixed(2)}
                                    </Text>
                                </View>
                                <View className="w-[1px] bg-gray-100" />
                                <View className="items-center flex-1">
                                    <Text className="text-gray-400 text-xs mb-1">Despesas</Text>
                                    <Text className="text-red-600 font-bold text-lg">
                                        R$ {monthlyExpense.toFixed(2)}
                                    </Text>
                                </View>
                                <View className="w-[1px] bg-gray-100" />
                                <View className="items-center flex-1">
                                    <Text className="text-gray-400 text-xs mb-1">Transações</Text>
                                    <Text className="text-gray-700 font-bold text-lg">
                                        {transactions.length}
                                    </Text>
                                </View>
                            </View>
                        </View>

                        {/* Section Title */}
                        <View className="px-4 mb-2">
                            <Text className="text-gray-500 font-bold text-xs uppercase">
                                Movimentações
                            </Text>
                        </View>
                    </>
                }
                ListEmptyComponent={
                    <View className="items-center py-20 px-10">
                        <Text className="text-gray-400 text-center">Nenhuma movimentação encontrada nesta conta.</Text>
                    </View>
                }
                contentContainerStyle={{ paddingBottom: 80 }}
            />

            {/* Add Transaction Button */}
            <View className="absolute bottom-6 right-6">
                <TouchableOpacity
                    className="bg-blue-600 w-14 h-14 rounded-full items-center justify-center shadow-lg active:opacity-90"
                    onPress={() => router.push(`/new-transaction?accountId=${id}`)}
                >
                    <Plus size={28} color="white" />
                </TouchableOpacity>
            </View>
        </View>
    );
}
