import { View, Text, ScrollView, TouchableOpacity, RefreshControl, ActivityIndicator, Alert } from 'react-native';
import { useState, useCallback } from 'react';
import { Stack, useRouter, useFocusEffect } from 'expo-router';
import { AccountsService, TransactionsService } from '../../services/api';
import { isConnected } from '../../services/sync';
import type { AccountResponse } from '../../types';
import { Building2, Wallet, TrendingUp, Plus, Filter } from 'lucide-react-native';

interface AccountWithBalance extends AccountResponse {
    currentBalance: number;
    monthlyChange: number;
    transactionCount: number;
}

export default function AccountsScreen() {
    const router = useRouter();
    const [accounts, setAccounts] = useState<AccountWithBalance[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [isOffline, setIsOffline] = useState(false);
    const [showInactive, setShowInactive] = useState(false);

    const calculateAccountBalance = async (account: AccountResponse): Promise<AccountWithBalance> => {
        try {
            // Fetch all transactions for this account
            const transactions = await TransactionsService.getAll(
                undefined, // start
                undefined, // end
                undefined, // categoryId
                account.id // accountId
            );

            // Calculate current balance
            const transactionsTotal = transactions.reduce((sum, tx) => sum + tx.amount, 0);
            const currentBalance = account.initialBalance + transactionsTotal;

            // Calculate monthly change
            const today = new Date();
            const firstDayOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
            const monthTransactions = transactions.filter(tx =>
                new Date(tx.dueDate) >= firstDayOfMonth
            );
            const monthlyChange = monthTransactions.reduce((sum, tx) => sum + tx.amount, 0);

            return {
                ...account,
                currentBalance,
                monthlyChange,
                transactionCount: transactions.length
            };
        } catch (error) {
            console.error(`Error calculating balance for account ${account.id}:`, error);
            return {
                ...account,
                currentBalance: account.initialBalance,
                monthlyChange: 0,
                transactionCount: 0
            };
        }
    };

    const loadAccounts = async () => {
        try {
            const connected = await isConnected();
            setIsOffline(!connected);

            if (!connected) {
                setLoading(false);
                setRefreshing(false);
                return;
            }

            // Fetch all accounts
            const allAccounts = await AccountsService.getAll();

            // Calculate balances for each account
            const accountsWithBalances = await Promise.all(
                allAccounts.map(account => calculateAccountBalance(account))
            );

            setAccounts(accountsWithBalances);
        } catch (error) {
            console.error('Error loading accounts:', error);
            Alert.alert('Erro', 'Não foi possível carregar as contas.');
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    useFocusEffect(
        useCallback(() => {
            loadAccounts();
        }, [])
    );

    const onRefresh = () => {
        setRefreshing(true);
        loadAccounts();
    };

    const getAccountIcon = (type: string) => {
        switch (type) {
            case 'Checking':
                return { Icon: Building2, color: '#3B82F6', bg: '#DBEAFE' };
            case 'Wallet':
                return { Icon: Wallet, color: '#10B981', bg: '#D1FAE5' };
            case 'Investment':
                return { Icon: TrendingUp, color: '#8B5CF6', bg: '#EDE9FE' };
            default:
                return { Icon: Wallet, color: '#6B7280', bg: '#F3F4F6' };
        }
    };

    const getAccountTypeName = (type: string) => {
        switch (type) {
            case 'Checking':
                return 'Conta Corrente';
            case 'Wallet':
                return 'Carteira';
            case 'Investment':
                return 'Investimento';
            default:
                return type;
        }
    };

    const renderAccount = (account: AccountWithBalance) => {
        const { Icon, color, bg } = getAccountIcon(account.type);
        const isPositiveChange = account.monthlyChange >= 0;

        return (
            <TouchableOpacity
                key={account.id}
                onPress={() => router.push(`/accounts/${account.id}`)}
                className="bg-white rounded-2xl p-5 mb-3 shadow-sm border border-gray-100 active:opacity-90"
            >
                <View className="flex-row items-center justify-between mb-4">
                    <View className="flex-row items-center flex-1">
                        <View className="p-3 rounded-full mr-3" style={{ backgroundColor: bg }}>
                            <Icon size={24} color={color} />
                        </View>
                        <View className="flex-1">
                            <Text className="font-bold text-gray-900 text-base" numberOfLines={1}>
                                {account.name}
                            </Text>
                            <Text className="text-gray-400 text-xs">
                                {getAccountTypeName(account.type)}
                            </Text>
                        </View>
                    </View>
                    {!account.isActive && (
                        <View className="bg-gray-100 px-2 py-1 rounded-full">
                            <Text className="text-gray-500 text-xs font-bold">INATIVA</Text>
                        </View>
                    )}
                </View>

                <View className="flex-row justify-between items-end">
                    <View className="flex-1">
                        <Text className="text-gray-400 text-xs mb-1">Saldo Atual</Text>
                        <Text className="text-gray-900 font-bold text-2xl">
                            R$ {account.currentBalance.toFixed(2)}
                        </Text>
                    </View>

                    {account.monthlyChange !== 0 && (
                        <View className="items-end">
                            <Text className="text-gray-400 text-xs mb-1">Este mês</Text>
                            <Text className={`font-semibold text-sm ${isPositiveChange ? 'text-green-600' : 'text-red-600'}`}>
                                {isPositiveChange ? '+' : ''}R$ {account.monthlyChange.toFixed(2)}
                            </Text>
                        </View>
                    )}
                </View>

                {account.transactionCount > 0 && (
                    <View className="mt-3 pt-3 border-t border-gray-100">
                        <Text className="text-gray-400 text-xs">
                            {account.transactionCount} {account.transactionCount === 1 ? 'transação' : 'transações'}
                        </Text>
                    </View>
                )}
            </TouchableOpacity>
        );
    };

    const filteredAccounts = showInactive
        ? accounts
        : accounts.filter(acc => acc.isActive);

    return (
        <View className="flex-1 bg-gray-50 pt-6">
            <Stack.Screen
                options={{
                    title: 'Minhas Contas',
                    headerShadowVisible: false,
                    headerStyle: { backgroundColor: '#F9FAFB' },
                    headerRight: () => (
                        <TouchableOpacity
                            className="p-2"
                            onPress={() => setShowInactive(!showInactive)}
                        >
                            <Filter size={20} color={showInactive ? '#3B82F6' : '#6B7280'} />
                        </TouchableOpacity>
                    )
                }}
            />

            {isOffline && (
                <View className="bg-orange-100 p-2 flex-row justify-center items-center">
                    <Text className="text-orange-700 text-xs font-bold">⚠️ Modo Offline - Saldos podem estar desatualizados</Text>
                </View>
            )}

            {loading && !refreshing ? (
                <View className="flex-1 justify-center items-center">
                    <ActivityIndicator size="large" color="#3B82F6" />
                </View>
            ) : (
                <ScrollView
                    className="flex-1 px-4 pt-4"
                    refreshControl={
                        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#3B82F6']} />
                    }
                >
                    {/* Total Balance Card */}
                    {filteredAccounts.length > 0 && (
                        <View className="bg-white rounded-2xl p-6 mb-6 shadow-sm border border-gray-100">
                            <View className="flex-row items-center justify-between mb-4">
                                <View>
                                    <Text className="text-gray-500 text-sm font-medium mb-1">Patrimônio Total</Text>
                                    <Text className="text-gray-900 text-3xl font-bold">
                                        R$ {filteredAccounts.reduce((sum, acc) => sum + acc.currentBalance, 0).toFixed(2)}
                                    </Text>
                                </View>
                                <View className="bg-blue-50 p-3 rounded-full">
                                    <Wallet size={32} color="#3B82F6" />
                                </View>
                            </View>
                            <View className="flex-row items-center pt-3 border-t border-gray-100">
                                <View className="bg-gray-50 px-3 py-1 rounded-full">
                                    <Text className="text-gray-700 text-xs font-semibold">
                                        {filteredAccounts.length} {filteredAccounts.length === 1 ? 'conta ativa' : 'contas ativas'}
                                    </Text>
                                </View>
                            </View>
                        </View>
                    )}

                    {filteredAccounts.length === 0 ? (
                        <View className="items-center py-20 px-10">
                            <View className="w-20 h-20 bg-gray-200 rounded-full items-center justify-center mb-4">
                                <Wallet size={40} color="#9CA3AF" />
                            </View>
                            <Text className="text-gray-800 font-bold text-lg mb-2">
                                {showInactive ? 'Nenhuma conta cadastrada' : 'Nenhuma conta ativa'}
                            </Text>
                            <Text className="text-gray-400 text-center">
                                {showInactive
                                    ? 'Suas contas aparecerão aqui após sincronização.'
                                    : 'Ative suas contas ou adicione uma nova.'}
                            </Text>
                        </View>
                    ) : (
                        filteredAccounts.map(account => renderAccount(account))
                    )}

                    <View className="h-20" />
                </ScrollView>
            )}

            {/* Add Account Button */}
            <View className="absolute bottom-6 right-6">
                <TouchableOpacity
                    className="bg-blue-600 w-14 h-14 rounded-full items-center justify-center shadow-lg active:opacity-90"
                    onPress={() => router.push('/accounts/form')}
                >
                    <Plus size={28} color="white" />
                </TouchableOpacity>
            </View>
        </View>
    );
}
