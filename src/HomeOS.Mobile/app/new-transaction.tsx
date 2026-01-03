import { View, Text, TextInput, TouchableOpacity, Alert, ScrollView, StyleSheet } from 'react-native';
import { useState, useCallback } from 'react';
import { Stack, useRouter, useFocusEffect } from 'expo-router';
import { savePendingTransaction, getCategories, getAccounts, getCreditCards } from '../services/database';
import { tryAutoSync } from '../services/sync';
import type { CreateTransactionRequest, TransactionType, CategoryResponse, AccountResponse, CreditCardResponse } from '../types';
import { Wallet, Tag, CreditCard } from 'lucide-react-native';
import { SelectionModal } from '../components/SelectionModal';

type UiTransactionMode = 'Expense' | 'Income' | 'CreditCard';

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#f9fafb',
        paddingTop: 24,
        paddingHorizontal: 16,
    },
    title: {
        fontSize: 24,
        fontWeight: 'bold',
        color: '#1f2937',
        marginBottom: 24,
        marginTop: 16,
    },
    typeSelectorContainer: {
        flexDirection: 'row',
        marginBottom: 24,
        backgroundColor: '#e2e8f0',
        borderRadius: 12,
        padding: 4,
        gap: 4,
    },
    typeButton: {
        flex: 1,
        paddingVertical: 12,
        borderRadius: 8,
        alignItems: 'center',
    },
    typeButtonActive: {
        backgroundColor: 'white',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 2,
        elevation: 1,
    },
    typeButtonText: {
        fontWeight: 'bold',
        color: '#64748b',
    },
    typeButtonTextExpense: {
        color: '#ef4444',
    },
    typeButtonTextIncome: {
        color: '#10b981',
    },
    typeButtonTextCard: {
        color: '#9333ea',
    },
    formContainer: {
        backgroundColor: 'white',
        padding: 24,
        borderRadius: 16,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 2,
        elevation: 1,
        gap: 20,
        borderWidth: 1,
        borderColor: '#e2e8f0',
    },
    fieldContainer: {
        marginBottom: 4,
    },
    label: {
        color: '#64748b',
        fontWeight: '500',
        marginBottom: 6,
        marginLeft: 4,
    },
    input: {
        backgroundColor: '#f1f5f9',
        padding: 16,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: '#e2e8f0',
        fontSize: 16,
        color: '#0f172a',
    },
    inputLarge: {
        fontSize: 24,
        fontWeight: 'bold',
    },
    selectorButton: {
        padding: 16,
        borderRadius: 12,
        borderWidth: 1,
        flexDirection: 'row',
        alignItems: 'center',
    },
    selectorButtonPurple: {
        backgroundColor: '#faf5ff',
        borderColor: '#f3e8ff',
    },
    selectorButtonGreen: {
        backgroundColor: '#ecfdf5',
        borderColor: '#d1fae5',
    },
    selectorButtonGray: {
        backgroundColor: '#f1f5f9',
        borderColor: '#e2e8f0',
    },
    selectorText: {
        flex: 1,
        fontWeight: '500',
        marginLeft: 8,
    },
    selectorTextSelected: {
        color: '#0f172a',
    },
    selectorTextPurple: {
        color: '#581c87',
    },
    selectorTextGreen: {
        color: '#065f46',
    },
    selectorTextPlaceholder: {
        color: '#94a3b8',
    },
    selectorArrow: {
        color: '#cbd5e1',
    },
    selectorArrowPurple: {
        color: '#d8b4fe',
    },
    selectorArrowGreen: {
        color: '#86efac',
    },
    saveButton: {
        padding: 16,
        borderRadius: 12,
        marginTop: 16,
        alignItems: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 2,
        elevation: 1,
    },
    saveButtonRed: {
        backgroundColor: '#dc2626',
    },
    saveButtonGreen: {
        backgroundColor: '#059669',
    },
    saveButtonPurple: {
        backgroundColor: '#9333ea',
    },
    saveButtonText: {
        color: 'white',
        fontWeight: 'bold',
        fontSize: 18,
    },
    footerText: {
        color: '#94a3b8',
        textAlign: 'center',
        marginTop: 24,
        fontSize: 14,
        marginBottom: 40,
    },
});

export default function NewTransaction() {
    const router = useRouter();
    const [description, setDescription] = useState('');
    const [amount, setAmount] = useState('');
    const [mode, setMode] = useState<UiTransactionMode>('Expense');
    const [isLoading, setIsLoading] = useState(false);

    const [categories, setCategories] = useState<CategoryResponse[]>([]);
    const [accounts, setAccounts] = useState<AccountResponse[]>([]);
    const [creditCards, setCreditCards] = useState<CreditCardResponse[]>([]);

    const [selectedCategoryId, setSelectedCategoryId] = useState('');
    const [selectedAccountId, setSelectedAccountId] = useState('');
    const [selectedCardId, setSelectedCardId] = useState('');

    const [showCategoryModal, setShowCategoryModal] = useState(false);
    const [showAccountModal, setShowAccountModal] = useState(false);
    const [showCardModal, setShowCardModal] = useState(false);

    useFocusEffect(
        useCallback(() => {
            loadData();
        }, [])
    );

    const changeMode = (newMode: UiTransactionMode) => {
        setMode(newMode);
        if (newMode === 'CreditCard' && !selectedCardId && creditCards.length > 0) {
            setSelectedCardId(creditCards[0].id);
        } else if (newMode !== 'CreditCard' && !selectedAccountId && accounts.length > 0) {
            setSelectedAccountId(accounts[0].id);
        }
    };

    const loadData = async () => {
        try {
            const [cats, accs, cards] = await Promise.all([
                getCategories(),
                getAccounts(),
                getCreditCards()
            ]);

            setCategories(cats);
            setAccounts(accs);
            setCreditCards(cards.map(c => ({ ...c, limit: c.limit_amount })));

            if (accs.length > 0 && !selectedAccountId) {
                setSelectedAccountId(accs[0].id);
            }
            if (cards.length > 0 && !selectedCardId) {
                setSelectedCardId(cards[0].id);
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

        if (mode === 'CreditCard') {
            if (!selectedCardId) {
                Alert.alert('Erro', 'Selecione um cartão de crédito');
                return;
            }
        } else {
            if (!selectedAccountId) {
                Alert.alert('Erro', 'Selecione uma conta');
                return;
            }
        }

        setIsLoading(true);
        try {
            const numericAmount = parseFloat(amount.replace(',', '.'));

            const newTransaction: CreateTransactionRequest = {
                description,
                amount: numericAmount,
                dueDate: new Date().toISOString(),
                categoryId: selectedCategoryId,
                accountId: mode !== 'CreditCard' ? selectedAccountId : undefined,
                creditCardId: mode === 'CreditCard' ? selectedCardId : undefined,
            };

            await savePendingTransaction(newTransaction);
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

    const currentCategoryType: TransactionType = mode === 'Income' ? 'Income' : 'Expense';
    const filteredCategories = categories.filter(c => c.type === currentCategoryType);

    const selectedCategoryName = categories.find(c => c.id === selectedCategoryId)?.name || 'Selecione a Categoria';
    const selectedAccountName = accounts.find(a => a.id === selectedAccountId)?.name || 'Selecione a Conta';
    const selectedCardName = creditCards.find(c => c.id === selectedCardId)?.name || 'Selecione o Cartão';

    return (
        <ScrollView style={styles.container}>
            <Stack.Screen options={{ title: 'Nova Transação' }} />

            <Text style={styles.title}>Lançar Gastos 💸</Text>

            {/* Type Selector */}
            <View style={styles.typeSelectorContainer}>
                <TouchableOpacity
                    style={[styles.typeButton, mode === 'Expense' && styles.typeButtonActive]}
                    onPress={() => changeMode('Expense')}
                >
                    <Text style={[styles.typeButtonText, mode === 'Expense' && styles.typeButtonTextExpense]}>
                        Despesa
                    </Text>
                </TouchableOpacity>
                <TouchableOpacity
                    style={[styles.typeButton, mode === 'Income' && styles.typeButtonActive]}
                    onPress={() => changeMode('Income')}
                >
                    <Text style={[styles.typeButtonText, mode === 'Income' && styles.typeButtonTextIncome]}>
                        Receita
                    </Text>
                </TouchableOpacity>
                <TouchableOpacity
                    style={[styles.typeButton, mode === 'CreditCard' && styles.typeButtonActive]}
                    onPress={() => changeMode('CreditCard')}
                >
                    <Text style={[styles.typeButtonText, mode === 'CreditCard' && styles.typeButtonTextCard]}>
                        Cartão
                    </Text>
                </TouchableOpacity>
            </View>

            {/* Form */}
            <View style={styles.formContainer}>
                <View style={styles.fieldContainer}>
                    <Text style={styles.label}>Descrição</Text>
                    <TextInput
                        style={styles.input}
                        placeholder="Ex: Almoço, Uber, Salário"
                        value={description}
                        onChangeText={setDescription}
                    />
                </View>

                <View style={styles.fieldContainer}>
                    <Text style={styles.label}>Valor (R$)</Text>
                    <TextInput
                        style={[styles.input, styles.inputLarge]}
                        placeholder="0,00"
                        keyboardType="numeric"
                        value={amount}
                        onChangeText={setAmount}
                    />
                </View>

                <View style={styles.fieldContainer}>
                    <Text style={styles.label}>
                        {mode === 'CreditCard' ? 'Cartão de Crédito' : 'Conta / Carteira'}
                    </Text>

                    {mode === 'CreditCard' ? (
                        <TouchableOpacity
                            style={[styles.selectorButton, styles.selectorButtonPurple]}
                            onPress={() => setShowCardModal(true)}
                        >
                            <CreditCard size={20} color="#9333ea" />
                            <Text style={[styles.selectorText, selectedCardId ? styles.selectorTextPurple : styles.selectorTextPlaceholder]}>
                                {selectedCardName}
                            </Text>
                            <Text style={styles.selectorArrowPurple}>▼</Text>
                        </TouchableOpacity>
                    ) : (
                        <TouchableOpacity
                            style={[styles.selectorButton, styles.selectorButtonGreen]}
                            onPress={() => setShowAccountModal(true)}
                        >
                            <Wallet size={20} color="#059669" />
                            <Text style={[styles.selectorText, selectedAccountId ? styles.selectorTextGreen : styles.selectorTextPlaceholder]}>
                                {selectedAccountName}
                            </Text>
                            <Text style={styles.selectorArrowGreen}>▼</Text>
                        </TouchableOpacity>
                    )}
                </View>

                <View style={styles.fieldContainer}>
                    <Text style={styles.label}>Categoria</Text>
                    <TouchableOpacity
                        style={[styles.selectorButton, styles.selectorButtonGray]}
                        onPress={() => setShowCategoryModal(true)}
                    >
                        <Tag size={20} color="#64748b" />
                        <Text style={[styles.selectorText, selectedCategoryId ? styles.selectorTextSelected : styles.selectorTextPlaceholder]}>
                            {selectedCategoryName}
                        </Text>
                        <Text style={styles.selectorArrow}>▼</Text>
                    </TouchableOpacity>
                </View>

                <TouchableOpacity
                    style={[
                        styles.saveButton,
                        mode === 'Income' ? styles.saveButtonGreen :
                            mode === 'CreditCard' ? styles.saveButtonPurple :
                                styles.saveButtonRed
                    ]}
                    onPress={handleSave}
                    disabled={isLoading}
                >
                    <Text style={styles.saveButtonText}>
                        {isLoading ? 'Salvando...' : 'Salvar Transação'}
                    </Text>
                </TouchableOpacity>
            </View>

            <Text style={styles.footerText}>
                Transações salvas offline e sincronizadas quando possível.
            </Text>

            <SelectionModal
                visible={showCategoryModal}
                onClose={() => setShowCategoryModal(false)}
                title={`Categorias (${mode === 'Income' ? 'Receita' : 'Despesa'})`}
                data={filteredCategories}
                onSelect={setSelectedCategoryId}
                headerIcon={<Tag size={24} color="#666" />}
            />

            <SelectionModal
                visible={showAccountModal}
                onClose={() => setShowAccountModal(false)}
                title="Selecionar Conta"
                data={accounts}
                onSelect={setSelectedAccountId}
                headerIcon={<Wallet size={24} color="#059669" />}
            />

            <SelectionModal
                visible={showCardModal}
                onClose={() => setShowCardModal(false)}
                title="Selecionar Cartão"
                data={creditCards}
                onSelect={setSelectedCardId}
                headerIcon={<CreditCard size={24} color="#9333ea" />}
            />

        </ScrollView>
    );
}
