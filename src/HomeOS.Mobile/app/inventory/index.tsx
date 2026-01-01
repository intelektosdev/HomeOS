import { View, Text, TouchableOpacity, TextInput, FlatList, ActivityIndicator, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Stack, useRouter, useFocusEffect } from 'expo-router';
import { useState, useCallback } from 'react';
import { Search, Plus, ScanBarcode, ArrowLeft, Package, PackageOpen, Minus } from 'lucide-react-native';
import { getProducts, getCategories, updateLocalProductStock, savePendingInventoryUpdate, type LocalProduct } from '../../services/database';

export default function InventoryScreen() {
    const router = useRouter();
    const [products, setProducts] = useState<LocalProduct[]>([]);
    const [filteredProducts, setFilteredProducts] = useState<LocalProduct[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [categories, setCategories] = useState<any[]>([]);

    const loadData = async () => {
        // Don't show full loading spinner on refresh to keep UI responsive
        try {
            const dbProducts = await getProducts();
            const dbCategories = await getCategories();
            setProducts(dbProducts);

            // Re-apply filter
            if (searchQuery.trim()) {
                const lower = searchQuery.toLowerCase();
                setFilteredProducts(dbProducts.filter(p =>
                    p.name.toLowerCase().includes(lower) ||
                    (p.barcode && p.barcode.includes(lower))
                ));
            } else {
                setFilteredProducts(dbProducts);
            }

            setCategories(dbCategories);
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    };

    useFocusEffect(
        useCallback(() => {
            loadData();
        }, [])
    );

    const handleSearch = (text: string) => {
        setSearchQuery(text);
        if (!text.trim()) {
            setFilteredProducts(products);
            return;
        }
        const lower = text.toLowerCase();
        setFilteredProducts(products.filter(p =>
            p.name.toLowerCase().includes(lower) ||
            (p.barcode && p.barcode.includes(lower))
        ));
    };

    const handleAdjustStock = async (product: LocalProduct, change: number) => {
        try {
            const newStock = product.stockQuantity + change;
            if (newStock < 0) return;

            // Optimistic Update
            const updatedProducts = products.map(p =>
                p.id === product.id ? { ...p, stockQuantity: newStock } : p
            );
            setProducts(updatedProducts);

            // Also update filtered list if needed
            if (searchQuery.trim()) {
                setFilteredProducts(filteredProducts.map(p =>
                    p.id === product.id ? { ...p, stockQuantity: newStock } : p
                ));
            }

            // DB Update
            await updateLocalProductStock(product.id, newStock);
            await savePendingInventoryUpdate('ADJUST_STOCK', {
                id: product.id,
                quantityChange: change
            });
        } catch (e) {
            Alert.alert("Erro", "Falha ao atualizar estoque");
            loadData(); // Revert on error
        }
    };

    const getCategoryName = (id?: string) => {
        if (!id) return 'Geral';
        const cat = categories.find(c => c.id === id);
        return cat ? cat.name : 'Geral';
    };

    const renderItem = ({ item }: { item: LocalProduct }) => (
        <View className="bg-white p-4 rounded-xl mb-3 border border-slate-100 shadow-sm flex-row justify-between items-center">
            <View className="flex-1 mr-4">
                <Text className="text-slate-900 font-bold text-base mb-1" numberOfLines={1}>{item.name}</Text>
                <View className="flex-row items-center">
                    <View className="bg-slate-100 px-2 py-0.5 rounded mr-2">
                        <Text className="text-slate-500 text-xs">{getCategoryName(item.categoryId)}</Text>
                    </View>
                    {item.barcode && (
                        <Text className="text-slate-400 text-xs">#{item.barcode.slice(-4)}</Text>
                    )}
                </View>
                {item.minStockAlert && item.stockQuantity <= item.minStockAlert && (
                    <Text className="text-red-500 text-xs font-medium mt-1">Baixo Estoque ({item.minStockAlert})</Text>
                )}
            </View>

            <View className="flex-row items-center bg-slate-50 rounded-lg p-1 border border-slate-200">
                <TouchableOpacity
                    onPress={() => handleAdjustStock(item, -1)}
                    className="w-8 h-8 items-center justify-center bg-white rounded shadow-sm border border-slate-100"
                >
                    <Minus size={16} color="#ef4444" />
                </TouchableOpacity>

                <View className="min-w-[40px] items-center px-2">
                    <Text className={`font-bold text-base ${item.stockQuantity <= (item.minStockAlert || 0) ? 'text-red-600' : 'text-slate-700'}`}>
                        {item.stockQuantity}
                    </Text>
                    <Text className="text-[10px] text-slate-400 font-medium">{item.unit}</Text>
                </View>

                <TouchableOpacity
                    onPress={() => handleAdjustStock(item, 1)}
                    className="w-8 h-8 items-center justify-center bg-white rounded shadow-sm border border-slate-100"
                >
                    <Plus size={16} color="#3b82f6" />
                </TouchableOpacity>
            </View>
        </View>
    );

    return (
        <SafeAreaView className="flex-1 bg-slate-50">
            <Stack.Screen options={{ headerShown: false }} />

            {/* Header */}
            <View className="px-6 py-4 bg-white border-b border-slate-100 z-10">
                <View className="flex-row justify-between items-center mb-4">
                    <TouchableOpacity onPress={() => router.back()} className="p-2 -ml-2">
                        <ArrowLeft size={24} color="#334155" />
                    </TouchableOpacity>
                    <Text className="text-xl font-bold text-slate-900">Meu Estoque</Text>
                    <View className="flex-row gap-2">
                        <TouchableOpacity onPress={() => router.push('/inventory/groups')} className="bg-slate-50 p-2 rounded-full border border-slate-200">
                            <Package size={20} color="#64748b" />
                        </TouchableOpacity>
                        <TouchableOpacity onPress={() => router.push('/inventory/product-form')} className="bg-slate-50 p-2 rounded-full border border-slate-200">
                            <Plus size={20} color="#64748b" />
                        </TouchableOpacity>
                        <TouchableOpacity onPress={() => router.push('/inventory/scanner')} className="bg-blue-50 p-2 rounded-full border border-blue-100">
                            <ScanBarcode size={20} color="#3b82f6" />
                        </TouchableOpacity>
                    </View>
                </View>

                {/* Search Bar */}
                <View className="flex-row items-center bg-slate-100 rounded-xl px-4 py-3">
                    <Search size={20} color="#94a3b8" className="mr-3" />
                    <TextInput
                        className="flex-1 text-slate-700 text-base"
                        placeholder="Buscar produto..."
                        placeholderTextColor="#94a3b8"
                        value={searchQuery}
                        onChangeText={handleSearch}
                    />
                </View>
            </View>

            {/* List */}
            <View className="flex-1 px-4 pt-4">
                {loading ? (
                    <ActivityIndicator size="large" color="#3b82f6" className="mt-10" />
                ) : (
                    <FlatList
                        data={filteredProducts}
                        keyExtractor={item => item.id}
                        renderItem={renderItem}
                        showsVerticalScrollIndicator={false}
                        contentContainerStyle={{ paddingBottom: 100 }}
                        ListEmptyComponent={
                            <View className="flex-1 items-center justify-center mt-20">
                                <PackageOpen size={64} color="#cbd5e1" />
                                <Text className="text-slate-400 mt-4 text-center">Nenhum produto encontrado.{'\n'}Toque no scanner para adicionar.</Text>
                            </View>
                        }
                    />
                )}
            </View>

            {/* Floating Action Button */}
            <View className="absolute bottom-6 right-6">
                <TouchableOpacity
                    className="bg-blue-600 w-14 h-14 rounded-full items-center justify-center shadow-lg shadow-blue-300"
                    onPress={() => router.push('/inventory/scanner')}
                >
                    <Plus size={32} color="white" />
                </TouchableOpacity>
            </View>
        </SafeAreaView>
    );
}
