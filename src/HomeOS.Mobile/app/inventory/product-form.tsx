import { View, Text, TouchableOpacity, TextInput, ScrollView, Alert, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Stack, useRouter, useLocalSearchParams } from 'expo-router';
import { useState, useEffect } from 'react';
import { ArrowLeft, Save, ScanBarcode, ChevronDown } from 'lucide-react-native';
import {
    createLocalProduct,
    savePendingInventoryUpdate,
    saveKnownProduct,
    getCategories,
    getProductGroups,
    generateUUID
} from '../../services/database';

export default function ProductFormScreen() {
    const router = useRouter();
    const params = useLocalSearchParams(); // could receive 'barcode' or 'id' later for edit

    const [name, setName] = useState('');
    const [barcode, setBarcode] = useState(params.barcode as string || '');
    const [stock, setStock] = useState('0');
    const [minStock, setMinStock] = useState('');
    const [unit, setUnit] = useState('un');
    const [selectedCategory, setSelectedCategory] = useState('');
    const [selectedGroup, setSelectedGroup] = useState('');

    const [categories, setCategories] = useState<any[]>([]);
    const [groups, setGroups] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        const loadRefs = async () => {
            const [cats, grps] = await Promise.all([getCategories(), getProductGroups()]);
            setCategories(cats);
            setGroups(grps);
        };
        loadRefs();
    }, []);

    // Update barcode when returning from scanner
    useEffect(() => {
        if (params.barcode && typeof params.barcode === 'string') {
            setBarcode(params.barcode);
        }
    }, [params.barcode]);

    const handleSave = async () => {
        if (!name.trim()) {
            Alert.alert("Erro", "Nome do produto é obrigatório");
            return;
        }

        setLoading(true);
        try {
            const stockQty = parseFloat(stock.replace(',', '.')) || 0;
            const minQty = parseFloat(minStock.replace(',', '.')) || 0;

            const newId = await createLocalProduct({
                name,
                barcode,
                stockQuantity: stockQty,
                minStockAlert: minQty > 0 ? minQty : undefined,
                categoryId: selectedCategory || undefined,
                productGroupId: selectedGroup || undefined,
                unit,
                isActive: 1
            });

            // Queue Create
            await savePendingInventoryUpdate('CREATE_PRODUCT', {
                tempId: newId,
                name,
                barcode: barcode || undefined,
                categoryId: selectedCategory || undefined,
                productGroupId: selectedGroup || undefined,
                unit,
                minStockAlert: minQty > 0 ? minQty : undefined,
            });

            // Queue Initial Stock if > 0
            if (stockQty > 0) {
                await savePendingInventoryUpdate('ADJUST_STOCK', {
                    id: newId,
                    quantityChange: stockQty
                });
            }

            if (barcode) {
                await saveKnownProduct(barcode, name);
            }

            Alert.alert("Sucesso", "Produto cadastrado!", [
                { text: "OK", onPress: () => router.back() }
            ]);

        } catch (e) {
            console.error(e);
            Alert.alert("Erro", "Falha ao salvar produto");
        } finally {
            setLoading(false);
        }
    };

    return (
        <SafeAreaView className="flex-1 bg-slate-50">
            <Stack.Screen options={{ headerShown: false }} />

            {/* Header */}
            <View className="px-6 py-4 bg-white border-b border-slate-100 flex-row items-center justify-between">
                <View className="flex-row items-center">
                    <TouchableOpacity onPress={() => router.back()} className="p-2 -ml-2 mr-2">
                        <ArrowLeft size={24} color="#334155" />
                    </TouchableOpacity>
                    <Text className="text-xl font-bold text-slate-900">Novo Produto</Text>
                </View>
                <TouchableOpacity onPress={handleSave} disabled={loading}>
                    {loading ? <ActivityIndicator color="#3b82f6" /> : <Save size={24} color="#3b82f6" />}
                </TouchableOpacity>
            </View>

            <ScrollView className="flex-1 p-6">

                {/* Basic Info */}
                <View className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm mb-6">
                    <Text className="text-slate-500 font-medium mb-2">Nome do Produto *</Text>
                    <TextInput
                        className="bg-slate-50 border border-slate-200 rounded-xl p-4 text-base text-slate-900 mb-4"
                        placeholder="Ex: Arroz Tipo 1"
                        value={name}
                        onChangeText={setName}
                    />

                    <Text className="text-slate-500 font-medium mb-2">Código de Barras</Text>
                    <View className="flex-row items-center mb-4">
                        <TextInput
                            className="flex-1 bg-slate-50 border border-slate-200 rounded-xl p-4 text-base text-slate-900"
                            placeholder="Opcional"
                            value={barcode}
                            onChangeText={setBarcode}
                            keyboardType="numeric"
                        />
                        <TouchableOpacity
                            className="ml-3 bg-blue-50 p-4 rounded-xl"
                            onPress={() => router.push('/inventory/barcode-scanner')}
                        >
                            <ScanBarcode size={24} color="#3b82f6" />
                        </TouchableOpacity>
                    </View>
                </View>

                {/* Classification */}
                <View className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm mb-6">
                    <Text className="text-slate-900 font-bold text-lg mb-4">Classificação</Text>

                    <Text className="text-slate-500 font-medium mb-2">Grupo</Text>
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} className="mb-4">
                        <View className="flex-row gap-2">
                            {groups.map(g => (
                                <TouchableOpacity
                                    key={g.id}
                                    onPress={() => setSelectedGroup(g.id)}
                                    className={`px-4 py-2 rounded-full border ${selectedGroup === g.id ? 'bg-blue-600 border-blue-600' : 'bg-slate-50 border-slate-200'}`}
                                >
                                    <Text className={selectedGroup === g.id ? 'text-white font-bold' : 'text-slate-600'}>{g.name}</Text>
                                </TouchableOpacity>
                            ))}
                        </View>
                    </ScrollView>

                    <Text className="text-slate-500 font-medium mb-2">Categoria</Text>
                    <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                        <View className="flex-row gap-2">
                            {categories.map(c => (
                                <TouchableOpacity
                                    key={c.id}
                                    onPress={() => setSelectedCategory(c.id)}
                                    className={`px-4 py-2 rounded-full border ${selectedCategory === c.id ? 'bg-emerald-600 border-emerald-600' : 'bg-slate-50 border-slate-200'}`}
                                >
                                    <Text className={selectedCategory === c.id ? 'text-white font-bold' : 'text-slate-600'}>{c.name}</Text>
                                </TouchableOpacity>
                            ))}
                        </View>
                    </ScrollView>
                </View>

                {/* Stock Control */}
                <View className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm mb-10">
                    <Text className="text-slate-900 font-bold text-lg mb-4">Controle de Estoque</Text>

                    <View className="flex-row gap-4 mb-4">
                        <View className="flex-1">
                            <Text className="text-slate-500 font-medium mb-2">Estoque Atual</Text>
                            <TextInput
                                className="bg-slate-50 border border-slate-200 rounded-xl p-4 text-base text-slate-900 text-center font-bold"
                                value={stock}
                                onChangeText={setStock}
                                keyboardType="numeric"
                            />
                        </View>
                        <View className="flex-1">
                            <Text className="text-slate-500 font-medium mb-2">Alerta Mínimo</Text>
                            <TextInput
                                className="bg-slate-50 border border-slate-200 rounded-xl p-4 text-base text-slate-900 text-center"
                                value={minStock}
                                onChangeText={setMinStock}
                                keyboardType="numeric"
                                placeholder="0"
                            />
                        </View>
                    </View>

                    <Text className="text-slate-500 font-medium mb-2">Unidade</Text>
                    <View className="flex-row gap-2">
                        {['un', 'kg', 'L', 'pct'].map(u => (
                            <TouchableOpacity
                                key={u}
                                onPress={() => setUnit(u)}
                                className={`flex-1 py-3 rounded-xl items-center border ${unit === u ? 'bg-slate-800 border-slate-800' : 'bg-slate-50 border-slate-200'}`}
                            >
                                <Text className={unit === u ? 'text-white font-bold' : 'text-slate-600'}>{u.toUpperCase()}</Text>
                            </TouchableOpacity>
                        ))}
                    </View>
                </View>

            </ScrollView>
        </SafeAreaView>
    );
}
