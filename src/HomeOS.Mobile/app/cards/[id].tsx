import { View, Text, ScrollView, TouchableOpacity, ActivityIndicator, Alert, Modal } from 'react-native';
import { useState, useCallback } from 'react';
import { Stack, useLocalSearchParams, useFocusEffect } from 'expo-router';
import { CreditCardsService } from '../../services/api';
import { getCategories, getAccounts } from '../../services/database';
import { isConnected } from '../../services/sync';
import type { CreditCardBalanceResponse, CreditCardResponse, PendingTransaction, CategoryResponse, AccountResponse } from '../../types';
import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Wallet, Calendar, TrendingDown, AlertCircle } from 'lucide-react-native';

export default function CardDetailsScreen() {
    const { id } = useLocalSearchParams<{ id: string }>();
    const [card, setCard] = useState<CreditCardResponse | null>(null);
    const [balance, setBalance] = useState<CreditCardBalanceResponse | null>(null);
    const [transactions, setTransactions] = useState<PendingTransaction[]>([]);
    const [categories, setCategories] = useState<Record<string, CategoryResponse>>({});
    const [accounts, setAccounts] = useState<AccountResponse[]>([]);
    const [loading, setLoading] = useState(true);
    const [isOffline, setIsOffline] = useState(false);

    // Payment Modal State
    const [paymentModalVisible, setPaymentModalVisible] = useState(false);
    const [selectedAccountId, setSelectedAccountId] = useState('');
    const [selectedCategoryId, setSelectedCategoryId] = useState('');
    const [paying, setPaying] = useState(false);

    const loadData = async () => {
        try {
            const connected = await isConnected();
            setIsOffline(!connected);

            // Load categories from cache
            const cats = await getCategories();
            const catMap: Record<string, CategoryResponse> = {};
            cats.forEach(c => catMap[c.id] = c);
            setCategories(catMap);

            // Load accounts for payment
            const accs = await getAccounts();
            setAccounts(accs);

            if (!connected) {
                setLoading(false);
                return;
            }

            // Fetch card details, balance and transactions
            const [cardData, balanceData, txs] = await Promise.all([
                CreditCardsService.getAll().then(cards => cards.find(c => c.id === id)),
                CreditCardsService.getBalance(id),
                CreditCardsService.getPendingTransactions(id)
            ]);

            if (!cardData) {
                throw new Error('Card not found');
            }

            setCard(cardData);
            setBalance(balanceData);
            setTransactions(txs);

            // Pre-select first active account
            const defaultAccount = accs.find(a => a.isActive) || accs[0];
            if (defaultAccount) setSelectedAccountId(defaultAccount.id);

            // Pre-select a default category (e.g., first Expense category or one named "Pagamento")
            const expenseCats = Object.values(catMap).filter(c => c.type === 'Expense');
            if (expenseCats.length > 0) {
                const defaultCat = expenseCats.find(c => c.name.toLowerCase().includes('pagamento') || c.name.toLowerCase().includes('fatura')) || expenseCats[0];
                setSelectedCategoryId(defaultCat.id);
            }

        } catch (error) {
            console.error('Error loading card details:', error);
            if (!isOffline) {
                Alert.alert('Erro', 'Não foi possível carregar os detalhes do cartão.');
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

    const handleOpenPayment = () => {
        if (!selectedAccountId || accounts.length === 0) {
            Alert.alert('Atenção', 'Você precisa ter uma conta cadastrada para pagar a fatura.');
            return;
        }

        if (!balance || balance.usedLimit <= 0) {
            Alert.alert('Atenção', 'Não há valor a pagar nesta fatura.');
            return;
        }

        setPaymentModalVisible(true);
    };

    const handlePayBill = () => {
        const selectedAccount = accounts.find(a => a.id === selectedAccountId);
        const amount = balance?.usedLimit || 0;

        // Phase 2: Confirmation before paying
        Alert.alert(
            'Confirmar Pagamento',
            `Deseja pagar R$ ${amount.toFixed(2)} usando a conta "${selectedAccount?.name}"?`,
            [
                { text: 'Cancelar', style: 'cancel' },
                { text: 'Confirmar', onPress: () => processPayment() }
            ]
        );
    };

    const processPayment = async () => {
        if (!selectedAccountId || !balance || !card || !selectedCategoryId) {
            return;
        }

        try {
            setPaying(true);

            // Using local time for payment date
            const now = new Date();
            const paymentDate = new Date(now.getTime() - (now.getTimezoneOffset() * 60000)).toISOString();

            // Format YYYYMM as string
            const referenceMonth = format(now, "yyyyMM");
            const transactionIds = transactions.map(t => t.id);

            await CreditCardsService.payBill(id, {
                accountId: selectedAccountId,
                referenceMonth,
                amount: balance.usedLimit,
                paymentDate,
                categoryId: selectedCategoryId,
                transactionIds
            });

            setPaymentModalVisible(false);

            Alert.alert(
                '✅ Pagamento Registrado!',
                `O pagamento de R$ ${balance.usedLimit.toFixed(2)} foi registrado com sucesso.`,
                [{ text: 'OK', onPress: () => loadData() }]
            );

        } catch (error: any) {
            console.error('Error paying bill:', error);

            let errorMessage = 'Não foi possível registrar o pagamento. Tente novamente.';

            // Show specific error from backend if available
            if (error.response?.data?.error) {
                errorMessage = error.response.data.error;
            } else if (error.response?.status === 400) {
                errorMessage = 'Dados inválidos. Verifique as informações e tente novamente.';
            } else if (!await isConnected()) {
                errorMessage = 'Sem conexão com a internet.';
            }

            Alert.alert('Erro no Pagamento', errorMessage, [{ text: 'OK' }]);
        } finally {
            setPaying(false);
        }
    };

    const groupedTransactions = transactions.reduce((acc, tx) => {
        const cat = categories[tx.categoryId];
        const catName = cat?.name || 'Sem Categoria';
        if (!acc[catName]) acc[catName] = [];
        acc[catName].push(tx);
        return acc;
    }, {} as Record<string, PendingTransaction[]>);

    if (loading) {
        return (
            <View className="flex-1 bg-gray-50 pt-6 justify-center items-center">
                <Stack.Screen options={{ title: 'Carregando...' }} />
                <ActivityIndicator size="large" color="#4F46E5" />
            </View>
        );
    }

    if (!card || !balance) {
        return (
            <View className="flex-1 bg-gray-50 pt-6 justify-center items-center px-10">
                <Stack.Screen options={{ title: 'Erro' }} />
                <AlertCircle size={48} color="#EF4444" />
                <Text className="text-gray-800 font-bold text-lg mb-2 mt-4">Cartão não encontrado</Text>
                <Text className="text-gray-400 text-center">Não foi possível carregar os detalhes deste cartão.</Text>
            </View>
        );
    }

    const usagePercent = (balance.usedLimit / balance.limit) * 100;
    const totalAmount = balance.usedLimit;

    return (
        <View className="flex-1 bg-gray-50 pt-6">
            <Stack.Screen
                options={{
                    title: card.name,
                    headerShadowVisible: false,
                    headerStyle: { backgroundColor: '#F9FAFB' },
                }}
            />

            {isOffline && (
                <View className="bg-orange-100 p-2 flex-row justify-center items-center">
                    <Text className="text-orange-700 text-xs font-bold">⚠️ Modo Offline</Text>
                </View>
            )}

            <ScrollView className="flex-1">
                {/* Card Header */}
                <View className="bg-white p-6 mx-4 mt-4 rounded-2xl shadow-sm border border-gray-100">
                    <View className="flex-row items-center justify-between mb-4">
                        <View className="flex-1">
                            <Text className="text-gray-500 text-sm font-medium mb-1">Fatura Atual</Text>
                            <Text className="text-gray-900 text-3xl font-bold">
                                R$ {totalAmount.toFixed(2)}
                            </Text>
                        </View>
                        <View className="bg-pink-50 p-3 rounded-full">
                            <TrendingDown size={32} color="#ec4899" />
                        </View>
                    </View>

                    {/* Progress Bar */}
                    <View className="mb-4">
                        <View className="flex-row justify-between mb-2">
                            <Text className="text-gray-600 text-xs">Limite utilizado</Text>
                            <Text className="text-gray-600 text-xs font-semibold">
                                {usagePercent.toFixed(0)}%
                            </Text>
                        </View>
                        <View className="h-2 bg-gray-100 rounded-full overflow-hidden">
                            <View
                                className="h-full bg-pink-500 rounded-full"
                                style={{ width: `${Math.min(usagePercent, 100)}%` }}
                            />
                        </View>
                        <View className="flex-row justify-between mt-2">
                            <Text className="text-gray-400 text-xs">
                                Usado: R$ {balance.usedLimit.toFixed(2)}
                            </Text>
                            <Text className="text-gray-400 text-xs">
                                Limite: R$ {balance.limit.toFixed(2)}
                            </Text>
                        </View>
                    </View>

                    {/* Dates */}
                    <View className="flex-row justify-between pt-4 border-t border-gray-100">
                        <View>
                            <Text className="text-gray-400 text-xs">Fechamento</Text>
                            <Text className="text-gray-900 font-bold">Dia {card.closingDay}</Text>
                        </View>
                        <View>
                            <Text className="text-gray-400 text-xs">Vencimento</Text>
                            <Text className="text-gray-900 font-bold">Dia {card.dueDay}</Text>
                        </View>
                    </View>
                </View>

                {/* Spending by Category */}
                {transactions.length > 0 && (
                    <View className="px-4 mt-6 mb-4">
                        <Text className="text-gray-500 font-bold text-xs uppercase mb-3">
                            Gastos por Categoria
                        </Text>
                        <View className="bg-white rounded-2xl p-4">
                            {Object.keys(groupedTransactions).map((catName, index) => {
                                const catTransactions = groupedTransactions[catName];
                                const catTotal = catTransactions.reduce((sum, tx) => sum + tx.amount, 0);
                                const catPercent = (catTotal / totalAmount) * 100;
                                const cat = categories[catTransactions[0].categoryId];

                                return (
                                    <View key={catName} className={index > 0 ? 'mt-3 pt-3 border-t border-gray-100' : ''}>
                                        <View className="flex-row items-center justify-between mb-2">
                                            <View className="flex-row items-center flex-1">
                                                <Text className="text-xl mr-2">{cat?.icon || '📁'}</Text>
                                                <Text className="text-gray-700 font-semibold">{catName}</Text>
                                            </View>
                                            <View className="items-end">
                                                <Text className="text-gray-900 font-bold">R$ {catTotal.toFixed(2)}</Text>
                                                <Text className="text-gray-400 text-xs">{catPercent.toFixed(0)}%</Text>
                                            </View>
                                        </View>
                                        <View className="h-2 bg-gray-100 rounded-full overflow-hidden">
                                            <View
                                                className="h-full bg-orange-400 rounded-full"
                                                style={{ width: `${catPercent}%` }}
                                            />
                                        </View>
                                    </View>
                                );
                            })}
                        </View>
                    </View>
                )}

                {/* Transactions List */}
                <View className="px-4 mt-6">
                    <Text className="text-gray-500 font-bold text-xs uppercase mb-3">
                        Transações ({transactions.length})
                    </Text>

                    {transactions.length === 0 ? (
                        <View className="bg-white rounded-2xl p-10 items-center">
                            <Text className="text-gray-400 text-center">Nenhuma transação pendente</Text>
                        </View>
                    ) : (
                        Object.keys(groupedTransactions).map(catName => (
                            <View key={catName} className="mb-4">
                                <Text className="text-gray-700 font-bold mb-2">{catName}</Text>
                                {groupedTransactions[catName].map(tx => {
                                    const cat = categories[tx.categoryId];
                                    return (
                                        <View
                                            key={tx.id}
                                            className="bg-white p-4 mb-[1px] flex-row items-center"
                                        >
                                            <View className="w-10 h-10 rounded-full bg-orange-100 justify-center items-center mr-3">
                                                <Text className="text-lg">{cat?.icon || '💳'}</Text>
                                            </View>
                                            <View className="flex-1">
                                                <Text className="font-semibold text-gray-800" numberOfLines={1}>
                                                    {tx.description}
                                                </Text>
                                                <Text className="text-gray-400 text-xs">
                                                    {format(parseISO(tx.dueDate), "dd 'de' MMM", { locale: ptBR })}
                                                    {tx.installmentNumber && ` • ${tx.installmentNumber}/${tx.totalInstallments}`}
                                                </Text>
                                            </View>
                                            <Text className="font-bold text-gray-800">
                                                R$ {tx.amount.toFixed(2)}
                                            </Text>
                                        </View>
                                    );
                                })}
                            </View>
                        ))
                    )}
                </View>

                <View className="h-24" />
            </ScrollView>

            {/* Pay Bill Button */}
            {totalAmount > 0 && (
                <View className="absolute bottom-6 left-6 right-6">
                    <TouchableOpacity
                        className="bg-green-600 p-4 rounded-xl items-center shadow-lg active:opacity-90"
                        onPress={handleOpenPayment}
                    >
                        <Text className="text-white font-bold text-lg">Pagar Fatura</Text>
                    </TouchableOpacity>
                </View>
            )}

            {/* Payment Modal */}
            <Modal
                visible={paymentModalVisible}
                transparent={true}
                animationType="slide"
                onRequestClose={() => setPaymentModalVisible(false)}
            >
                <View className="flex-1 justify-end bg-black/50">
                    <View className="bg-white rounded-t-3xl p-6 shadow-xl">
                        <View className="items-center mb-6">
                            <View className="w-16 h-1 bg-gray-300 rounded-full mb-4" />
                            <Text className="text-2xl font-bold text-gray-800">Pagar Fatura</Text>
                            <Text className="text-3xl text-green-600 font-bold mt-2">
                                R$ {totalAmount.toFixed(2)}
                            </Text>
                            <Text className="text-gray-500 text-sm mt-1">{card.name}</Text>
                        </View>

                        <Text className="text-xs font-bold text-gray-500 uppercase mb-2">Pagar com</Text>

                        <ScrollView className="max-h-96 mb-6">
                            <Text className="text-xs font-bold text-gray-500 uppercase mb-2 mt-2">Conta de Pagamento</Text>
                            {accounts.length === 0 ? (
                                <View className="bg-orange-50 p-4 rounded-xl border border-orange-200">
                                    <Text className="text-center text-orange-700">Nenhuma conta disponível.</Text>
                                </View>
                            ) : (
                                accounts.map(acc => (
                                    <TouchableOpacity
                                        key={acc.id}
                                        onPress={() => setSelectedAccountId(acc.id)}
                                        className={`p-4 mb-2 rounded-xl border flex-row justify-between items-center ${selectedAccountId === acc.id
                                            ? 'border-green-500 bg-green-50'
                                            : 'border-gray-100 bg-white'
                                            }`}
                                    >
                                        <View>
                                            <Text className="font-bold text-gray-700">{acc.name}</Text>
                                            <Text className="text-gray-400 text-xs">{acc.type}</Text>
                                        </View>
                                        {selectedAccountId === acc.id && <Text className="text-green-600 text-xl">✓</Text>}
                                    </TouchableOpacity>
                                ))
                            )}

                            <Text className="text-xs font-bold text-gray-500 uppercase mb-2 mt-4">Categoria do Lançamento</Text>
                            {Object.values(categories).filter(c => c.type === 'Expense').map(cat => (
                                <TouchableOpacity
                                    key={cat.id}
                                    onPress={() => setSelectedCategoryId(cat.id)}
                                    className={`p-3 mb-2 rounded-xl border flex-row items-center ${selectedCategoryId === cat.id
                                        ? 'border-green-500 bg-green-50'
                                        : 'border-gray-100 bg-white'
                                        }`}
                                >
                                    <View className="w-8 h-8 rounded-full bg-gray-100 justify-center items-center mr-3">
                                        <Text>{cat.icon || '📁'}</Text>
                                    </View>
                                    <Text className="font-medium text-gray-700 flex-1">{cat.name}</Text>
                                    {selectedCategoryId === cat.id && <Text className="text-green-600">✓</Text>}
                                </TouchableOpacity>
                            ))}
                        </ScrollView>

                        <TouchableOpacity
                            className={`p-4 rounded-xl items-center shadow-lg mb-4 ${paying || !selectedAccountId || !selectedCategoryId ? 'bg-gray-400' : 'bg-green-600'}`}
                            onPress={handlePayBill}
                            disabled={paying || !selectedAccountId || !selectedCategoryId}
                        >
                            {paying ? (
                                <ActivityIndicator color="white" />
                            ) : (
                                <Text className="text-white font-bold text-lg">Confirmar Pagamento</Text>
                            )}
                        </TouchableOpacity>

                        <TouchableOpacity
                            className="p-4 items-center"
                            onPress={() => setPaymentModalVisible(false)}
                        >
                            <Text className="text-gray-500">Cancelar</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </Modal>
        </View>
    );
}
