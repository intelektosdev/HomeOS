import { View, Text, Switch, TouchableOpacity, ScrollView, Alert, ActivityIndicator } from 'react-native';
import { Stack } from 'expo-router';
import { useState, useEffect } from 'react';
import { getCategories, saveSetting, getSetting } from '../services/database';
import { type CategoryResponse } from '../types';

export default function SettingsScreen() {
    const [categories, setCategories] = useState<CategoryResponse[]>([]);
    const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        try {
            setLoading(true);
            const allCategories = await getCategories();
            // Filter expenses only
            const expenses = allCategories.filter(c => c.type === 'Expense');
            setCategories(expenses);

            const savedId = await getSetting('default_shopping_category');
            if (savedId) {
                setSelectedCategoryId(savedId);
            }
        } catch (error) {
            console.error(error);
            Alert.alert('Erro', 'Falha ao carregar configurações');
        } finally {
            setLoading(false);
        }
    };

    const handleSelectCategory = async (id: string) => {
        try {
            setSelectedCategoryId(id);
            await saveSetting('default_shopping_category', id);
        } catch (error) {
            Alert.alert('Erro', 'Falha ao salvar configuração');
        }
    };

    if (loading) {
        return (
            <View className="flex-1 justify-center items-center bg-gray-50">
                <ActivityIndicator size="large" color="#4F46E5" />
            </View>
        );
    }

    return (
        <View className="flex-1 bg-gray-50">
            <Stack.Screen options={{ title: 'Configurações', presentation: 'modal' }} />

            <ScrollView className="p-4" contentContainerStyle={{ paddingBottom: 50 }}>
                <Text className="text-sm font-bold text-gray-500 uppercase mb-3 ml-2">Preferências de Compras</Text>

                <View className="bg-white rounded-xl shadow-sm overflow-hidden mb-6">
                    <View className="p-4 border-b border-gray-100 bg-gray-50">
                        <Text className="font-bold text-gray-800">Categoria Padrão</Text>
                        <Text className="text-xs text-gray-500 mt-1">
                            Essa categoria será pré-selecionada ao finalizar suas compras.
                        </Text>
                    </View>

                    {categories.length === 0 ? (
                        <View className="p-6 items-center">
                            <Text className="text-gray-400">Nenhuma categoria encontrada.</Text>
                            <Text className="text-gray-400 text-xs text-center mt-2">Sincronize o app primeiro.</Text>
                        </View>
                    ) : (
                        categories.map((cat, index) => (
                            <TouchableOpacity
                                key={cat.id}
                                className={`flex-row items-center justify-between p-4 ${index !== categories.length - 1 ? 'border-b border-gray-100' : ''}`}
                                onPress={() => handleSelectCategory(cat.id)}
                            >
                                <View className="flex-row items-center gap-3">
                                    <Text className="text-xl">{cat.icon || '📁'}</Text>
                                    <Text className={`text-base ${selectedCategoryId === cat.id ? 'font-bold text-blue-600' : 'text-gray-700'}`}>
                                        {cat.name}
                                    </Text>
                                </View>
                                {selectedCategoryId === cat.id && (
                                    <Text className="text-blue-600 font-bold">✓</Text>
                                )}
                            </TouchableOpacity>
                        ))
                    )}
                </View>

                <View className="items-center">
                    <Text className="text-gray-400 text-xs">v1.0.0 HomeOS Mobile</Text>
                </View>
            </ScrollView>
        </View>
    );
}
