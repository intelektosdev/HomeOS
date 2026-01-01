import { CameraView, CameraType, useCameraPermissions } from 'expo-camera';
import { useState, useEffect } from 'react';
import { Button, StyleSheet, Text, TouchableOpacity, View, Alert, Modal, TextInput, ActivityIndicator, Vibration } from 'react-native';
import { Stack, useRouter } from 'expo-router';
import { fetchProductFromOpenFoodFacts } from '../../services/external-product-api';
import {
    getProductByBarcode,
    createLocalProduct,
    updateLocalProductStock,
    saveKnownProduct,
    getCategories,
    getProductGroups,
    getKnownProduct,
    savePendingInventoryUpdate
} from '../../services/database';
import { X, Check, Search, Plus, Minus, Package } from 'lucide-react-native';

export default function InventoryScanner() {
    const [facing, setFacing] = useState<CameraType>('back');
    const [permission, requestPermission] = useCameraPermissions();
    const [scanned, setScanned] = useState(false);
    const [loading, setLoading] = useState(false);

    // UI Mode: 'scanning' | 'confirm' | 'create'
    const [uiMode, setUiMode] = useState<'scanning' | 'confirm' | 'create'>('scanning');

    // Data State
    const [currentBarcode, setCurrentBarcode] = useState('');
    const [productName, setProductName] = useState('');
    const [currentStock, setCurrentStock] = useState(1);
    const [quantityToAdd, setQuantityToAdd] = useState(1);
    const [productId, setProductId] = useState<string | null>(null);
    const [categories, setCategories] = useState<any[]>([]);
    const [selectedCategory, setSelectedCategory] = useState<string>('');

    const router = useRouter();

    useEffect(() => {
        getCategories().then(setCategories);
    }, []);

    if (!permission) return <View />;
    if (!permission.granted) {
        return (
            <View style={styles.container}>
                <Text style={styles.message}>Precisamos da sua permissão para usar a câmera</Text>
                <Button onPress={requestPermission} title="Garantir permissão" />
            </View>
        );
    }

    const resetScanner = () => {
        setScanned(false);
        setUiMode('scanning');
        setProductId(null);
        setCurrentBarcode('');
        setProductName('');
        setQuantityToAdd(1);
        setCurrentStock(0);
    };

    const handleBarCodeScanned = async ({ type, data }: { type: string; data: string }) => {
        setScanned(true);
        setCurrentBarcode(data);
        setLoading(true);
        Vibration.vibrate();

        try {
            // 1. Check Local DB
            const localProduct = await getProductByBarcode(data);

            if (localProduct) {
                // Found locally: Go to Confirm Mode (Rapid Stock Add)
                setProductId(localProduct.id);
                setProductName(localProduct.name);
                setCurrentStock(localProduct.stockQuantity);
                setUiMode('confirm');
            } else {
                // Not found locally
                // 2. Check Known Cache or External API
                let name = '';
                const known = await getKnownProduct(data);

                if (known) {
                    name = known.name;
                } else {
                    const apiData = await fetchProductFromOpenFoodFacts(data);
                    if (apiData.found) {
                        name = apiData.name;
                    }
                }

                setProductName(name);
                setUiMode('create');
            }
        } catch (error) {
            Alert.alert('Erro', 'Falha ao processar código.');
            resetScanner();
        } finally {
            setLoading(false);
        }
    };

    const handleConfirmStock = async () => {
        if (!productId) return;
        try {
            // Update local stock
            const newStock = currentStock + quantityToAdd;
            await updateLocalProductStock(productId, newStock);

            // Queue sync action
            await savePendingInventoryUpdate('ADJUST_STOCK', {
                id: productId,
                quantityChange: quantityToAdd
            });

            Alert.alert("Sucesso", `Estoque atualizado: ${newStock}`, [
                { text: "OK", onPress: resetScanner }
            ]);
        } catch (e) {
            console.error(e);
            Alert.alert("Erro", "Falha ao atualizar estoque");
        }
    };

    const handleCreateProduct = async () => {
        if (!productName.trim()) {
            Alert.alert("Atenção", "O nome do produto é obrigatório");
            return;
        }

        try {
            // Create Local
            const newId = await createLocalProduct({
                name: productName,
                barcode: currentBarcode,
                stockQuantity: quantityToAdd,
                categoryId: selectedCategory || undefined,
                isActive: 1
            });

            // Queue Create Action
            // We use the local ID as tempId
            await savePendingInventoryUpdate('CREATE_PRODUCT', {
                tempId: newId,
                name: productName,
                barcode: currentBarcode,
                categoryId: selectedCategory || undefined,
                // Note: API Create might not take stock, so we might need a follow up adjust if online,
                // But for the queue processor, we can handle it.
                // Simplified: We assume pending_inventory_updates will be processed smart enough
                // OR we queue ADJUST_STOCK right after.
            });

            // Queue initial stock if > 0
            if (quantityToAdd > 0) {
                await savePendingInventoryUpdate('ADJUST_STOCK', {
                    id: newId, // This matches the tempId above, processInventoryQueue must map it
                    quantityChange: quantityToAdd
                });
            }

            // Save intelligence
            await saveKnownProduct(currentBarcode, productName);

            Alert.alert("Produto Criado", `Estoque inicial: ${quantityToAdd}`, [
                { text: "Próximo", onPress: resetScanner }
            ]);

        } catch (e) {
            console.error(e);
            Alert.alert("Erro", "Falha ao criar produto");
        }
    };

    return (
        <View style={styles.container}>
            <Stack.Screen options={{ headerShown: false }} />

            {uiMode === 'scanning' && (
                <CameraView
                    style={StyleSheet.absoluteFillObject}
                    facing={facing}
                    onBarcodeScanned={scanned ? undefined : handleBarCodeScanned}
                    barcodeScannerSettings={{
                        barcodeTypes: ["ean13", "ean8", "qr"],
                    }}
                />
            )}

            {/* Header / Overlay */}
            <View style={styles.header}>
                <TouchableOpacity onPress={() => router.back()} style={styles.iconButton}>
                    <X color="white" size={24} />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>
                    {uiMode === 'scanning' ? 'Escanear Produto' :
                        uiMode === 'confirm' ? 'Ajuste Rápido' : 'Novo Produto'}
                </Text>
                <View style={{ width: 40 }} />
            </View>

            {/* Scan Overlay Guide */}
            {uiMode === 'scanning' && (
                <View style={styles.overlay}>
                    <View style={styles.scanFrame} />
                    <Text style={styles.scanText}>Aponte para o código de barras</Text>
                </View>
            )}

            {/* Loading */}
            {loading && (
                <View style={styles.loadingOverlay}>
                    <ActivityIndicator size="large" color="#ffffff" />
                </View>
            )}

            {/* Action Card */}
            {(uiMode === 'confirm' || uiMode === 'create') && (
                <View style={styles.bottomCard}>
                    <Text style={styles.label}>Produto</Text>
                    <TextInput
                        style={styles.input}
                        value={productName}
                        onChangeText={setProductName}
                        placeholder="Nome do Produto"
                        editable={uiMode === 'create'} // Editable only if creating
                    />

                    {uiMode === 'create' && (
                        <View style={{ marginBottom: 15 }}>
                            <Text style={styles.label}>Categoria (Opcional)</Text>
                            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                                {categories.slice(0, 5).map(cat => (
                                    <TouchableOpacity
                                        key={cat.id}
                                        onPress={() => setSelectedCategory(cat.id)}
                                        style={[
                                            styles.catChip,
                                            selectedCategory === cat.id && styles.catChipSelected
                                        ]}
                                    >
                                        <Text style={[
                                            styles.catText,
                                            selectedCategory === cat.id && styles.catTextSelected
                                        ]}>{cat.name}</Text>
                                    </TouchableOpacity>
                                ))}
                            </View>
                        </View>
                    )}

                    <Text style={styles.label}>
                        {uiMode === 'confirm' ? `Adicionar ao Estoque (Atual: ${currentStock})` : 'Estoque Inicial'}
                    </Text>

                    <View style={styles.qtyContainer}>
                        <TouchableOpacity onPress={() => setQuantityToAdd(Math.max(1, quantityToAdd - 1))} style={styles.qtyButton}>
                            <Minus size={24} color="#333" />
                        </TouchableOpacity>
                        <Text style={styles.qtyValue}>{quantityToAdd}</Text>
                        <TouchableOpacity onPress={() => setQuantityToAdd(quantityToAdd + 1)} style={styles.qtyButton}>
                            <Plus size={24} color="#333" />
                        </TouchableOpacity>
                    </View>

                    <View style={styles.actionButtons}>
                        <TouchableOpacity style={[styles.btn, styles.btnCancel]} onPress={resetScanner}>
                            <Text style={styles.btnTextCancel}>Cancelar</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                            style={[styles.btn, styles.btnPrimary]}
                            onPress={uiMode === 'confirm' ? handleConfirmStock : handleCreateProduct}
                        >
                            <Text style={styles.btnTextPrimary}>
                                {uiMode === 'confirm' ? 'Salvar Ajuste' : 'Cadastrar'}
                            </Text>
                        </TouchableOpacity>
                    </View>
                </View>
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: 'black' },
    message: { color: 'white', textAlign: 'center', marginBottom: 20, marginTop: 100 },
    header: {
        position: 'absolute', top: 50, left: 0, right: 0,
        flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
        paddingHorizontal: 20, zIndex: 50
    },
    headerTitle: { color: 'white', fontSize: 18, fontWeight: 'bold' },
    iconButton: { padding: 8, backgroundColor: 'rgba(0,0,0,0.5)', borderRadius: 20 },

    overlay: { ...StyleSheet.absoluteFillObject, justifyContent: 'center', alignItems: 'center' },
    scanFrame: { width: 280, height: 280, borderWidth: 2, borderColor: '#3b82f6', borderRadius: 12 },
    scanText: { color: 'white', marginTop: 20, backgroundColor: 'rgba(0,0,0,0.6)', padding: 8, borderRadius: 4 },

    loadingOverlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'center', alignItems: 'center', zIndex: 60 },

    bottomCard: {
        position: 'absolute', bottom: 0, left: 0, right: 0,
        backgroundColor: 'white', borderTopLeftRadius: 24, borderTopRightRadius: 24,
        padding: 24, paddingBottom: 40
    },
    label: { color: '#64748b', marginBottom: 8, fontWeight: '600' },
    input: {
        backgroundColor: '#f1f5f9', borderRadius: 12, padding: 16, fontSize: 18,
        color: '#0f172a', marginBottom: 20
    },
    qtyContainer: {
        flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
        gap: 20, marginBottom: 24
    },
    qtyButton: {
        backgroundColor: '#e2e8f0', width: 50, height: 50, borderRadius: 25,
        alignItems: 'center', justifyContent: 'center'
    },
    qtyValue: { fontSize: 32, fontWeight: 'bold', color: '#0f172a', width: 60, textAlign: 'center' },

    actionButtons: { flexDirection: 'row', gap: 12 },
    btn: { flex: 1, padding: 16, borderRadius: 12, alignItems: 'center' },
    btnCancel: { backgroundColor: '#f1f5f9' },
    btnPrimary: { backgroundColor: '#3b82f6' },
    btnTextCancel: { color: '#64748b', fontWeight: 'bold', fontSize: 16 },
    btnTextPrimary: { color: 'white', fontWeight: 'bold', fontSize: 16 },

    catChip: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 16, backgroundColor: '#f1f5f9', borderWidth: 1, borderColor: '#cbd5e1' },
    catChipSelected: { backgroundColor: '#eff6ff', borderColor: '#3b82f6' },
    catText: { color: '#64748b', fontSize: 12 },
    catTextSelected: { color: '#3b82f6', fontWeight: 'bold' }
});
