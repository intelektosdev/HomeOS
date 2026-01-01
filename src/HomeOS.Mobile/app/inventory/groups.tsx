import { View, Text, TouchableOpacity, TextInput, FlatList, ActivityIndicator, Alert, Modal } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Stack, useRouter } from 'expo-router';
import { useState, useCallback, useEffect } from 'react';
import { ArrowLeft, Plus, Folder, X } from 'lucide-react-native';
import { getProductGroups, createLocalProductGroup, savePendingInventoryUpdate, type LocalProductGroup } from '../../services/database';

export default function ProductGroupsScreen() {
    const router = useRouter();
    const [groups, setGroups] = useState<LocalProductGroup[]>([]);
    const [loading, setLoading] = useState(true);

    // Create Modal State
    const [modalVisible, setModalVisible] = useState(false);
    const [newGroupName, setNewGroupName] = useState('');

    const loadData = async () => {
        setLoading(true);
        try {
            const dbGroups = await getProductGroups();
            setGroups(dbGroups);
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadData();
    }, []);

    const handleCreateGroup = async () => {
        if (!newGroupName.trim()) {
            Alert.alert("Erro", "Nome do grupo é obrigatório");
            return;
        }

        try {
            const tempId = await createLocalProductGroup(newGroupName);
            await savePendingInventoryUpdate('CREATE_PRODUCT_GROUP', {
                tempId,
                name: newGroupName
            });

            setNewGroupName('');
            setModalVisible(false);
            loadData(); // Refresh
        } catch (e) {
            Alert.alert("Erro", "Falha ao criar grupo");
        }
    };

    const renderItem = ({ item }: { item: LocalProductGroup }) => (
        <View className="bg-white p-4 rounded-xl mb-3 border border-slate-100 shadow-sm flex-row items-center">
            <View className="bg-blue-50 p-3 rounded-full mr-4">
                <Folder size={20} color="#3b82f6" />
            </View>
            <Text className="text-slate-900 font-bold text-base flex-1">{item.name}</Text>
        </View>
    );

    return (
        <SafeAreaView className="flex-1 bg-slate-50">
            <Stack.Screen options={{ headerShown: false }} />

            {/* Header */}
            <View className="px-6 py-4 bg-white border-b border-slate-100 flex-row items-center justify-between">
                <View className="flex-row items-center">
                    <TouchableOpacity onPress={() => router.back()} className="p-2 -ml-2 mr-2">
                        <ArrowLeft size={24} color="#334155" />
                    </TouchableOpacity>
                    <Text className="text-xl font-bold text-slate-900">Grupos</Text>
                </View>
                <TouchableOpacity onPress={() => setModalVisible(true)} className="bg-blue-50 p-2 rounded-full">
                    <Plus size={24} color="#3b82f6" />
                </TouchableOpacity>
            </View>

            {/* List */}
            <View className="flex-1 px-4 pt-4">
                {loading ? (
                    <ActivityIndicator size="large" color="#3b82f6" className="mt-10" />
                ) : (
                    <FlatList
                        data={groups}
                        keyExtractor={item => item.id}
                        renderItem={renderItem}
                        showsVerticalScrollIndicator={false}
                        ListEmptyComponent={
                            <View className="flex-1 items-center justify-center mt-20">
                                <Text className="text-slate-400">Nenhum grupo cadastrado.</Text>
                            </View>
                        }
                    />
                )}
            </View>

            {/* Create Modal */}
            <Modal
                transparent={true}
                visible={modalVisible}
                animationType="fade"
                onRequestClose={() => setModalVisible(false)}
            >
                <View className="flex-1 bg-black/50 justify-center items-center px-4">
                    <View className="bg-white w-full rounded-2xl p-6 shadow-xl">
                        <View className="flex-row justify-between items-center mb-6">
                            <Text className="text-xl font-bold text-slate-900">Novo Grupo</Text>
                            <TouchableOpacity onPress={() => setModalVisible(false)}>
                                <X size={24} color="#94a3b8" />
                            </TouchableOpacity>
                        </View>

                        <Text className="text-slate-500 mb-2 font-medium">Nome</Text>
                        <TextInput
                            className="bg-slate-50 border border-slate-200 rounded-xl p-4 text-lg text-slate-900 mb-6"
                            placeholder="Ex: Bebidas, Limpeza"
                            value={newGroupName}
                            onChangeText={setNewGroupName}
                            autoFocus
                        />

                        <TouchableOpacity
                            className="bg-blue-600 rounded-xl py-4 items-center shadow-lg shadow-blue-200"
                            onPress={handleCreateGroup}
                        >
                            <Text className="text-white font-bold text-lg">Criar Grupo</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </Modal>
        </SafeAreaView>
    );
}
