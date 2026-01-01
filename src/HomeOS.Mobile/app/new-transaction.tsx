import { View, Text, TextInput, TouchableOpacity, Alert, ScrollView, Modal, FlatList } from 'react-native';
import { useState, useCallback } from 'react';
import { Stack, useRouter, useFocusEffect } from 'expo-router';
import { savePendingTransaction, getCategories, getAccounts } from '../services/database';
import { tryAutoSync } from '../services/sync';
import type { CreateTransactionRequest, TransactionType, CategoryResponse, AccountResponse } from '../types';
import { CircleDollarSign, Wallet, Tag } from 'lucide-react-native';

export default function NewTransaction() {
    const router = useRouter();
    const [description, setDescription] = useState('');
    const [amount, setAmount] = useState('');
    const [type, setType] = useState<TransactionType>('Expense');
    const [isLoading, setIsLoading] = useState(false);

    // Data State
    const [categories, setCategories] = useState<CategoryResponse[]>([]);
    const [accounts, setAccounts] = useState<any[]>([]); // using any temporarily to reuse getAccounts return type

    // Selection State
    const [selectedCategoryId, setSelectedCategoryId] = useState('');
    const [selectedAccountId, setSelectedAccountId] = useState('');

    // UI State
    const [showCategoryModal, setShowCategoryModal] = useState(false);
    const [showAccountModal, setShowAccountModal] = useState(false);

    useFocusEffect(
        useCallback(() => {
            loadData();
        }, [])
    );

    // Reset selection when type changes
    const changeType = (newType: TransactionType) => {
        setType(newType);
        setSelectedCategoryId(''); // Clear category as list changes
    };

    const loadData = async () => {
        try {
            const cats = await getCategories();
            const accs = await getAccounts();
            setCategories(cats);
            setAccounts(accs);

            // Auto-select first active account if available
            if (accs.length > 0 && !selectedAccountId) {
                setSelectedAccountId(accs[0].id);
            }
        } catch (e) {
            console.error("Failed to load local data", e);
        }
    };

    const handleSave = async () => {
        if (!description.trim() || !amount.trim()) {
            Alert.alert('Erro', 'Preencha descrição e valor');
            return;
        }

        if (!selectedCategoryId) {
            Alert.alert('Erro', 'Selecione uma categoria');
            return;
        }

        if (!selectedAccountId) {
            Alert.alert('Erro', 'Selecione uma conta');
            return;
        }

        setIsLoading(true);
        try {
            const numericAmount = parseFloat(amount.replace(',', '.'));

            const newTransaction: CreateTransactionRequest = {
                description,
                amount: numericAmount,
                dueDate: new Date().toISOString(),
                categoryId: selectedCategoryId,
                accountId: selectedAccountId,
            };

            // 1. Save offline first
            await savePendingTransaction(newTransaction);

            // 2. Try to sync
            const syncResult = await tryAutoSync();

            Alert.alert(
                'Sucesso',
                'Transação salva!' + (syncResult?.success ? '' : ' (Offline - Será enviado depois)'),
                [{ text: 'OK', onPress: () => router.back() }]
            );

        } catch (error) {
            Alert.alert('Erro', 'Falha ao salvar transação');
            console.error(error);
        } finally {
            setIsLoading(false);
        }
    };

    const filteredCategories = categories.filter(c => c.type === type);
    const selectedCategoryName = categories.find(c => c.id === selectedCategoryId)?.name || 'Selecione a Categoria';
    const selectedAccountName = accounts.find(a => a.id === selectedAccountId)?.name || 'Selecione a Conta';

    // Helper Modal Component
    const SelectionModal = ({ visible, onClose, title, data, onSelect, icon: Icon }: any) => (
        <Modal visible={visible} animationType="slide" transparent>
            <View className="flex-1 justify-end bg-black/50">
                <View className="bg-white rounded-t-3xl h-[60%]">
                    <View className="p-4 border-b border-gray-100 flex-row justify-between items-center">
                        <Text className="text-xl font-bold text-gray-800">{title}</Text>
                        <TouchableOpacity onPress={onClose} className="p-2">
                            <Text className="text-blue-600 font-bold">Fechar</Text>
                        </TouchableOpacity>
                    </View>
                    <FlatList
                        data={data}
                        keyExtractor={item => item.id}
                        contentContainerStyle={{ padding: 16 }}
                        renderItem={({ item }) => (
                            <TouchableOpacity
                                className="flex-row items-center p-4 border-b border-gray-50 active:bg-gray-50"
                                onPress={() => {
                                    onSelect(item.id);
                                    onClose();
                                }}
                            >
                                <View className={`p-2 rounded-full mr-4 ${title.includes('Conta') ? 'bg-green-100' : 'bg-blue-100'}`}>
                                    {Icon ? <Icon size={20} color="#333" /> : (
                                        <Text className="text-lg">{item.icon || '📦'}</Text>
                                    )}
                                </View>
                                <Text className="text-lg text-gray-700">{item.name}</Text>
                                {item.type && <Text className="ml-2 text-xs text-gray-400 bg-gray-100 px-2 py-1 rounded">{item.type}</Text>}
                            </TouchableOpacity>
                        )}
                        ListEmptyComponent={
                            <View className="items-center py-10">
                                <Text className="text-gray-400">Nenhum item encontrado.</Text>
                                <Text className="text-gray-400 text-xs">Sincronize o app primeiro.</Text>
                            </View>
                        }
                    />
                </View>
            </View>
        </Modal>
    );

    return (
        <ScrollView className="flex-1 bg-gray-50 pt-6 px-4">
            <Stack.Screen options={{ title: 'Nova Transação' }} />

            <Text className="text-2xl font-bold text-gray-800 mb-6 mt-4">Lançar Gastos 💸</Text>

            {/* Type Selector */}
            <View className="flex-row mb-6 bg-gray-200 rounded-lg p-1">
                <TouchableOpacity
                    className={`flex-1 py-3 rounded-md ${type === 'Expense' ? 'bg-white shadow-sm' : ''}`}
                    onPress={() => changeType('Expense')}
                >
                    <Text className={`text-center font-bold ${type === 'Expense' ? 'text-red-600' : 'text-gray-500'}`}>
                        Despesa
                    </Text>
                </TouchableOpacity>
                <TouchableOpacity
                    className={`flex-1 py-3 rounded-md ${type === 'Income' ? 'bg-white shadow-sm' : ''}`}
                    onPress={() => changeType('Income')}
                >
                    <Text className={`text-center font-bold ${type === 'Income' ? 'text-green-600' : 'text-gray-500'}`}>
                        Receita
                    </Text>
                </TouchableOpacity>
            </View>

            {/* Form */}
            <View className="bg-white p-6 rounded-2xl shadow-sm gap-4">
                <View>
                    <Text className="text-gray-500 mb-1 ml-1">Descrição</Text>
                    <TextInput
                        className="bg-gray-50 p-4 rounded-xl border border-gray-100 text-lg"
                        placeholder="Ex: Almoço, Uber, Salário"
                        value={description}
                        onChangeText={setDescription}
                    />
                </View>

                <View>
                    <Text className="text-gray-500 mb-1 ml-1">Valor (R$)</Text>
                    <TextInput
                        className="bg-gray-50 p-4 rounded-xl border border-gray-100 text-2xl font-bold text-gray-800"
                        placeholder="0,00"
                        keyboardType="numeric"
                        value={amount}
                        onChangeText={setAmount}
                    />
                </View>

                {/* Account Selector */}
                <View>
                    <Text className="text-gray-500 mb-1 ml-1">Conta / Carteira</Text>
                    <TouchableOpacity
                        className="bg-gray-50 p-4 rounded-xl border border-gray-100 flex-row items-center"
                        onPress={() => setShowAccountModal(true)}
                    >
                        <Wallet size={20} color="#64748b" className="mr-2" />
                        <Text className={`flex-1 ${selectedAccountId ? 'text-gray-800' : 'text-gray-400'}`}>
                            {selectedAccountName}
                        </Text>
                        <Text className="text-gray-400">▼</Text>
                    </TouchableOpacity>
                </View>

                {/* Category Selector */}
                <View>
                    <Text className="text-gray-500 mb-1 ml-1">Categoria</Text>
                    <TouchableOpacity
                        className="bg-gray-50 p-4 rounded-xl border border-gray-100 flex-row items-center"
                        onPress={() => setShowCategoryModal(true)}
                    >
                        <Tag size={20} color="#64748b" className="mr-2" />
                        <Text className={`flex-1 ${selectedCategoryId ? 'text-gray-800' : 'text-gray-400'}`}>
                            {selectedCategoryName}
                        </Text>
                        <Text className="text-gray-400">▼</Text>
                    </TouchableOpacity>
                </View>

                <TouchableOpacity
                    className={`p-4 rounded-xl mt-4 items-center ${type === 'Expense' ? 'bg-red-600' : 'bg-green-600'}`}
                    onPress={handleSave}
                    disabled={isLoading}
                >
                    <Text className="text-white font-bold text-lg">
                        {isLoading ? 'Salvando...' : 'Salvar Transação'}
                    </Text>
                </TouchableOpacity>
            </View>

            <Text className="text-gray-400 text-center mt-6 text-sm">
                Transações salvas offline.
            </Text>

            {/* Modals */}
            <SelectionModal
                visible={showCategoryModal}
                onClose={() => setShowCategoryModal(false)}
                title={`Categorias (${type === 'Income' ? 'Receita' : 'Despesa'})`}
                data={filteredCategories}
                onSelect={setSelectedCategoryId}
            // Don't pass icon here, let it render item's icon or fallback
            />

            <SelectionModal
                visible={showAccountModal}
                onClose={() => setShowAccountModal(false)}
                title="Selecionar Conta"
                data={accounts}
                onSelect={setSelectedAccountId}
                icon={Wallet}
            />

        </ScrollView>
    );
}
