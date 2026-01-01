import { View, Text, TextInput, TouchableOpacity, FlatList, Alert, Modal, SectionList, ScrollView } from 'react-native';
import { useState, useCallback } from 'react';
import { Stack, useFocusEffect, useRouter } from 'expo-router';
import {
    getShoppingItems,
    addShoppingItem,
    toggleShoppingItem,
    deleteShoppingItem,
    clearPurchasedItems,
    updateShoppingItem,
    getCategories,
    getAccounts,
    savePendingTransaction,
    getSetting,
    getCreditCards,
    type LocalShoppingItem
} from '../services/database';
import { tryAutoSync } from '../services/sync';

export default function ShoppingList() {
    const router = useRouter();

    const [items, setItems] = useState<LocalShoppingItem[]>([]);
    const [newItemName, setNewItemName] = useState('');
    const [newItemQuantity, setNewItemQuantity] = useState('1');

    // Modal State for Move to Cart
    const [modalVisible, setModalVisible] = useState(false);
    const [selectedItem, setSelectedItem] = useState<LocalShoppingItem | null>(null);
    const [modalPrice, setModalPrice] = useState('');
    const [modalQuantity, setModalQuantity] = useState('');

    // Checkout Modal State
    const [checkoutModalVisible, setCheckoutModalVisible] = useState(false);
    const [checkoutTotal, setCheckoutTotal] = useState(0);
    const [paymentMethod, setPaymentMethod] = useState<'Account' | 'CreditCard'>('Account');
    const [categories, setCategories] = useState<import('../types').CategoryResponse[]>([]);
    const [accounts, setAccounts] = useState<import('../types').AccountResponse[]>([]);
    const [creditCards, setCreditCards] = useState<{ id: string, name: string }[]>([]);
    const [selectedCategoryId, setSelectedCategoryId] = useState('');
    const [selectedPaymentId, setSelectedPaymentId] = useState('');

    const loadItems = async () => {
        try {
            const data = await getShoppingItems();
            setItems(data);
        } catch (error) {
            console.error(error);
        }
    };

    useFocusEffect(
        useCallback(() => {
            loadItems();
        }, [])
    );

    const handleAddItem = async () => {
        if (!newItemName.trim()) return;

        try {
            const qty = parseFloat(newItemQuantity) || 1;
            await addShoppingItem(newItemName, qty);
            setNewItemName('');
            setNewItemQuantity('1');
            loadItems();
        } catch (error) {
            Alert.alert('Erro', 'Não foi possível adicionar o item.');
        }
    };

    const handleItemPress = (item: LocalShoppingItem) => {
        if (item.is_purchased === 0) {
            // To Buy -> Open Modal to Move to Cart
            setSelectedItem(item);
            setModalQuantity(item.quantity.toString());
            setModalPrice(item.price ? item.price.toString() : '');
            setModalVisible(true);
        } else {
            // In Cart -> Toggle back to To Buy (undo)
            handleToggle(item);
        }
    };

    const handleConfirmMoveToCart = async () => {
        if (!selectedItem) return;

        try {
            const price = modalPrice ? parseFloat(modalPrice.replace(',', '.')) : 0;
            const quantity = parseFloat(modalQuantity) || 1;

            await updateShoppingItem(selectedItem.id, {
                price: price,
                quantity: quantity,
                is_purchased: 1
            });

            setModalVisible(false);
            setSelectedItem(null);
            loadItems();
        } catch (error) {
            Alert.alert('Erro', 'Falha ao atualizar item');
        }
    };

    const handleToggle = async (item: LocalShoppingItem) => {
        try {
            await toggleShoppingItem(item.id, item.is_purchased);
            loadItems();
        } catch (error) {
            console.error(error);
        }
    };

    const handleDelete = async (id: string) => {
        try {
            await deleteShoppingItem(id);
            loadItems();
        } catch (error) {
            console.error(error);
        }
    };

    const handleClearPurchased = () => {
        Alert.alert(
            'Limpar Carrinho',
            'Deseja remover todos os itens do carrinho?',
            [
                { text: 'Cancelar', style: 'cancel' },
                {
                    text: 'Limpar',
                    style: 'destructive',
                    onPress: async () => {
                        await clearPurchasedItems();
                        loadItems();
                    }
                }
            ]
        );
    };

    const handleOpenCheckout = async () => {
        const inCartItems = items.filter(i => i.is_purchased === 1);
        if (inCartItems.length === 0) return;

        const totalAmount = inCartItems.reduce((acc, item) => acc + ((item.price || 0) * item.quantity), 0);
        if (totalAmount <= 0) {
            Alert.alert('Erro', 'O valor total da compra deve ser maior que zero.');
            return;
        }
        setCheckoutTotal(totalAmount);

        try {
            const [cats, accs, cards, defaultCatId] = await Promise.all([
                getCategories(),
                getAccounts(),
                getCreditCards(),
                getSetting('default_shopping_category')
            ]);

            if (cats.length === 0 || accs.length === 0) {
                Alert.alert('Sincronização Necessária', 'Sincronize o app primeiro.', [{ text: 'Sincronizar', onPress: () => tryAutoSync() }]);
                return;
            }

            setCategories(cats);
            setAccounts(accs);
            setCreditCards(cards);

            // Pre-select Category
            if (defaultCatId && cats.find(c => c.id === defaultCatId)) {
                setSelectedCategoryId(defaultCatId);
            } else {
                const fallback = cats.find(c => c.type === 'Expense');
                if (fallback) setSelectedCategoryId(fallback.id);
            }

            // Pre-select Payment Account
            const defaultAcc = accs.find(a => a.type === 'Checking' && a.isActive) || accs[0];
            if (defaultAcc) {
                setPaymentMethod('Account');
                setSelectedPaymentId(defaultAcc.id);
            }

            setCheckoutModalVisible(true);

        } catch (error) {
            console.error(error);
            Alert.alert('Erro', 'Falha ao carregar dados de checkout.');
        }
    };

    const handleConfirmCheckout = async () => {
        try {
            if (!selectedCategoryId || !selectedPaymentId) {
                Alert.alert('Erro', 'Selecione a categoria e o meio de pagamento.');
                return;
            }

            await savePendingTransaction({
                description: 'Supermercado',
                amount: checkoutTotal,
                dueDate: new Date().toISOString(),
                categoryId: selectedCategoryId,
                accountId: paymentMethod === 'Account' ? selectedPaymentId : undefined,
                creditCardId: paymentMethod === 'CreditCard' ? selectedPaymentId : undefined,
                installmentCount: 1
            });

            setCheckoutModalVisible(false);
            await clearPurchasedItems();
            loadItems();

            tryAutoSync().then((res) => {
                if (res.success) Alert.alert('Sucesso', 'Compra registrada e sincronizada!');
                else Alert.alert('Sucesso', 'Compra registrada offline.');
            });

        } catch (error) {
            console.error(error);
            Alert.alert('Erro', 'Falha ao registrar compra.');
        }
    };

    const toBuyOrders = items.filter(i => i.is_purchased === 0);
    const inCartItems = items.filter(i => i.is_purchased === 1);
    const cartTotal = inCartItems.reduce((acc, item) => acc + ((item.price || 0) * item.quantity), 0);

    const sections = [
        { title: `A Comprar (${toBuyOrders.length})`, data: toBuyOrders },
        { title: `No Carrinho (R$ ${cartTotal.toFixed(2)})`, data: inCartItems }
    ];

    return (
        <View className="flex-1 bg-gray-50 pt-10 px-4">
            <Stack.Screen options={{ headerShown: false }} />

            <View>
                <Text className="text-2xl font-bold text-gray-800">Compras 🛒</Text>
                <Text className="text-gray-500 text-sm">Total Carrinho: R$ {cartTotal.toFixed(2)}</Text>
            </View>
            <View className="flex-row gap-2">
                <TouchableOpacity
                    className="bg-gray-100 p-3 rounded-full justify-center items-center w-12 h-12"
                    onPress={() => router.push('/settings')}
                >
                    <Text className="text-xl">⚙️</Text>
                </TouchableOpacity>
                <TouchableOpacity
                    className="bg-gray-200 p-3 rounded-full justify-center items-center w-12 h-12"
                    onPress={() => router.push('/scanner')}
                >
                    <Text className="text-2xl">📷</Text>
                </TouchableOpacity>
            </View>

            {/* Quick Add */}
            <View className="flex-row gap-2 mb-4">
                <View className="flex-1">
                    <TextInput
                        className="bg-white p-3 rounded-lg border border-gray-200"
                        placeholder="Adicionar produto..."
                        value={newItemName}
                        onChangeText={setNewItemName}
                        returnKeyType="next"
                    />
                </View>
                <View className="w-20">
                    <TextInput
                        className="bg-white p-3 rounded-lg border border-gray-200 text-center"
                        placeholder="Qtd"
                        keyboardType="numeric"
                        value={newItemQuantity}
                        onChangeText={setNewItemQuantity}
                        onSubmitEditing={handleAddItem}
                    />
                </View>
                <TouchableOpacity
                    className="bg-blue-600 justify-center items-center px-4 rounded-lg"
                    onPress={handleAddItem}
                >
                    <Text className="text-white font-bold text-xl">+</Text>
                </TouchableOpacity>
            </View>

            <SectionList
                sections={sections}
                keyExtractor={(item) => item.id}
                renderSectionHeader={({ section: { title } }) => (
                    <View className="bg-gray-100 py-2 px-1 mt-2 mb-2 rounded">
                        <Text className="text-gray-700 font-bold">{title}</Text>
                    </View>
                )}
                contentContainerStyle={{ paddingBottom: 100 }}
                renderItem={({ item }) => (
                    <View className={`flex-row items-center p-4 bg-white mb-2 rounded-xl shadow-sm border-l-4 ${item.is_purchased ? 'border-green-500 opacity-80' : 'border-blue-500'}`}>
                        <TouchableOpacity
                            className="flex-1 flex-row items-center gap-3"
                            onPress={() => handleItemPress(item)}
                        >
                            <View className={`w-6 h-6 rounded border-2 justify-center items-center ${item.is_purchased ? 'bg-green-500 border-green-500' : 'border-gray-300'}`}>
                                {item.is_purchased ? <Text className="text-white text-xs">✓</Text> : null}
                            </View>
                            <View>
                                <Text className={`text-lg ${item.is_purchased ? 'text-gray-600' : 'text-gray-800'}`}>
                                    {item.name}
                                </Text>
                                <View className="flex-row gap-2">
                                    <Text className="text-xs text-gray-400">
                                        {item.quantity} {item.unit || 'un'}
                                        {(item.quantity > 1 && (item.price ?? 0) > 0) && ` x R$ ${(item.price ?? 0).toFixed(2)}`}
                                    </Text>
                                    {(item.price ?? 0) * item.quantity > 0 && (
                                        <Text className="text-sm text-green-700 font-bold ml-auto">
                                            R$ {((item.price ?? 0) * item.quantity).toFixed(2)}
                                        </Text>
                                    )}
                                </View>
                            </View>
                        </TouchableOpacity>

                        <TouchableOpacity
                            onPress={() => handleDelete(item.id)}
                            className="p-2"
                        >
                            <Text className="text-red-400 font-bold">✕</Text>
                        </TouchableOpacity>
                    </View >
                )
                }
                ListEmptyComponent={
                    < View className="items-center mt-20" >
                        <Text className="text-gray-400 text-lg">Sua lista está vazia!</Text>
                    </View >
                }
            />

            {
                items.some(i => i.is_purchased === 1) && (
                    <View className="absolute bottom-6 right-6 flex-row gap-2">
                        <TouchableOpacity
                            className="bg-red-100 px-6 py-3 rounded-full shadow-lg"
                            onPress={handleClearPurchased}
                        >
                            <Text className="text-red-600 font-bold">Limpar</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                            className="bg-green-600 px-6 py-3 rounded-full shadow-lg"
                            onPress={handleOpenCheckout}
                        >
                            <Text className="text-white font-bold">Finalizar</Text>
                        </TouchableOpacity>
                    </View>
                )
            }

            {/* Move to Cart Modal */}
            <Modal
                visible={modalVisible}
                transparent={true}
                animationType="slide"
                onRequestClose={() => setModalVisible(false)}
            >
                <View className="flex-1 justify-center items-center bg-black/50 px-4">
                    <View className="bg-white w-full rounded-2xl p-6 shadow-xl">
                        <Text className="text-xl font-bold mb-4 text-center">Colocar no Carrinho</Text>
                        <Text className="text-gray-600 mb-6 text-center">{selectedItem?.name}</Text>

                        <Text className="text-gray-500 mb-2">Quantidade Atualizada</Text>
                        <TextInput
                            className="bg-gray-50 border border-gray-200 rounded-lg p-3 mb-4 text-lg"
                            keyboardType="numeric"
                            value={modalQuantity}
                            onChangeText={setModalQuantity}
                            placeholder="Qtd"
                        />

                        <Text className="text-gray-500 mb-2">Preço Unitário (R$)</Text>
                        <TextInput
                            className="bg-gray-50 border border-gray-200 rounded-lg p-3 mb-6 text-lg"
                            keyboardType="numeric"
                            value={modalPrice}
                            onChangeText={setModalPrice}
                            placeholder="0,00"
                            autoFocus
                        />

                        <View className="flex-row gap-4">
                            <TouchableOpacity
                                className="flex-1 bg-gray-200 p-4 rounded-xl items-center"
                                onPress={() => setModalVisible(false)}
                            >
                                <Text className="font-bold text-gray-700">Cancelar</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                className="flex-1 bg-green-600 p-4 rounded-xl items-center"
                                onPress={handleConfirmMoveToCart}
                            >
                                <Text className="font-bold text-white">Confirmar</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </Modal>

            {/* Checkout Modal */}
            <Modal
                visible={checkoutModalVisible}
                transparent={true}
                animationType="slide"
                onRequestClose={() => setCheckoutModalVisible(false)}
            >
                <View className="flex-1 justify-end bg-black/50">
                    <View className="bg-white rounded-t-3xl p-6 shadow-xl h-[90%]">
                        <View className="items-center mb-6">
                            <View className="w-16 h-1 bg-gray-300 rounded-full mb-4" />
                            <Text className="text-2xl font-bold text-gray-800">Finalizar Compra</Text>
                            <Text className="text-3xl text-green-600 font-bold mt-2">R$ {checkoutTotal.toFixed(2)}</Text>
                        </View>

                        <ScrollView showsVerticalScrollIndicator={false}>
                            {/* Categoria */}
                            <Text className="text-xs font-bold text-gray-500 uppercase mb-2">Categoria</Text>
                            <ScrollView horizontal showsHorizontalScrollIndicator={false} className="mb-6 flex-row gap-2">
                                {categories.filter(c => c.type === 'Expense').map(cat => (
                                    <TouchableOpacity
                                        key={cat.id}
                                        onPress={() => setSelectedCategoryId(cat.id)}
                                        className={`px-4 py-2 mr-2 rounded-full border ${selectedCategoryId === cat.id ? 'bg-blue-100 border-blue-500' : 'bg-gray-50 border-gray-200'}`}
                                    >
                                        <Text className={`${selectedCategoryId === cat.id ? 'text-blue-700 font-bold' : 'text-gray-600'}`}>
                                            {cat.icon} {cat.name}
                                        </Text>
                                    </TouchableOpacity>
                                ))}
                            </ScrollView>

                            {/* Payment Method */}
                            <Text className="text-xs font-bold text-gray-500 uppercase mb-2">Forma de Pagamento</Text>
                            <View className="flex-row bg-gray-100 p-1 rounded-xl mb-4">
                                <TouchableOpacity
                                    style={{ flex: 1, paddingVertical: 8, borderRadius: 8, alignItems: 'center', backgroundColor: paymentMethod === 'Account' ? 'white' : 'transparent' }}
                                    onPress={() => { setPaymentMethod('Account'); if (accounts.length > 0) setSelectedPaymentId(accounts[0].id); }}
                                >
                                    <Text className={`font-bold ${paymentMethod === 'Account' ? 'text-gray-800' : 'text-gray-400'}`}>Conta</Text>
                                </TouchableOpacity>
                                <TouchableOpacity
                                    style={{ flex: 1, paddingVertical: 8, borderRadius: 8, alignItems: 'center', backgroundColor: paymentMethod === 'CreditCard' ? 'white' : 'transparent' }}
                                    onPress={() => { setPaymentMethod('CreditCard'); if (creditCards.length > 0) setSelectedPaymentId(creditCards[0].id); }}
                                >
                                    <Text className={`font-bold ${paymentMethod === 'CreditCard' ? 'text-gray-800' : 'text-gray-400'}`}>Cartão de Crédito</Text>
                                </TouchableOpacity>
                            </View>

                            {/* Payment Source Selection */}
                            <View className="mb-8">
                                {paymentMethod === 'Account' ? (
                                    accounts.length === 0 ? (
                                        <Text className="text-center text-gray-400 py-4">Nenhuma conta sincronizada.</Text>
                                    ) : (
                                        accounts.map(acc => (
                                            <TouchableOpacity
                                                key={acc.id}
                                                onPress={() => setSelectedPaymentId(acc.id)}
                                                className={`p-4 mb-2 rounded-xl border flex-row justify-between items-center ${selectedPaymentId === acc.id ? 'border-green-500 bg-green-50' : 'border-gray-100 bg-white'}`}
                                            >
                                                <Text className="font-bold text-gray-700">{acc.name}</Text>
                                                {selectedPaymentId === acc.id && <Text className="text-green-600">✓</Text>}
                                            </TouchableOpacity>
                                        ))
                                    )
                                ) : (
                                    creditCards.length === 0 ? (
                                        <Text className="text-center text-gray-400 py-4">Nenhum cartão sincronizado.</Text>
                                    ) : (
                                        creditCards.map(card => (
                                            <TouchableOpacity
                                                key={card.id}
                                                onPress={() => setSelectedPaymentId(card.id)}
                                                className={`p-4 mb-2 rounded-xl border flex-row justify-between items-center ${selectedPaymentId === card.id ? 'border-purple-500 bg-purple-50' : 'border-gray-100 bg-white'}`}
                                            >
                                                <Text className="font-bold text-gray-700">{card.name}</Text>
                                                {selectedPaymentId === card.id && <Text className="text-purple-600">✓</Text>}
                                            </TouchableOpacity>
                                        ))
                                    )
                                )}
                            </View>

                            <TouchableOpacity
                                className="bg-green-600 p-4 rounded-xl items-center shadow-lg mb-4"
                                onPress={handleConfirmCheckout}
                            >
                                <Text className="text-white font-bold text-lg">Confirmar Compra</Text>
                            </TouchableOpacity>

                            <TouchableOpacity
                                className="p-4 items-center mb-8"
                                onPress={() => setCheckoutModalVisible(false)}
                            >
                                <Text className="text-gray-500">Cancelar</Text>
                            </TouchableOpacity>
                        </ScrollView>
                    </View>
                </View>
            </Modal>
        </View >
    );
}
