import { CameraView, CameraType, useCameraPermissions } from 'expo-camera';
import { useState } from 'react';
import { Button, StyleSheet, Text, TouchableOpacity, View, Alert, Modal, TextInput, ActivityIndicator } from 'react-native';
import { Stack, useRouter } from 'expo-router';
import { fetchProductFromOpenFoodFacts } from '../services/external-product-api';
import {
    addShoppingItem,
    getShoppingItems,
    updateShoppingItem,
    getKnownProduct,
    saveKnownProduct,
    type LocalShoppingItem
} from '../services/database';

export default function App() {
    const [facing, setFacing] = useState<CameraType>('back');
    const [permission, requestPermission] = useCameraPermissions();
    const [scanned, setScanned] = useState(false);
    const [loading, setLoading] = useState(false);
    const [modalVisible, setModalVisible] = useState(false);

    // Data State
    const [currentBarcode, setCurrentBarcode] = useState('');
    const [productName, setProductName] = useState('');
    const [quantity, setQuantity] = useState('1');
    const [price, setPrice] = useState('');

    // Logic State
    const [existingItem, setExistingItem] = useState<LocalShoppingItem | null>(null);

    const router = useRouter();

    if (!permission) {
        return <View />;
    }

    if (!permission.granted) {
        return (
            <View style={styles.container}>
                <Text style={styles.message}>Precisamos da sua permissão para usar a câmera</Text>
                <Button onPress={requestPermission} title="Garantir permissão" />
            </View>
        );
    }

    const handleBarCodeScanned = async ({ type, data }: { type: string; data: string }) => {
        setScanned(true);
        setCurrentBarcode(data);
        setLoading(true);
        setExistingItem(null);
        setPrice('');
        setQuantity('1');

        try {
            // 1. Check if item is already in Shopping List (To Buy or In Cart)
            const shoppingItems = await getShoppingItems();

            // Try to find by specific barcode first
            let found = shoppingItems.find(i => i.barcode === data);

            // If not found by barcode, try local intelligence to get a name, then fuzzy match name
            if (!found) {
                const known = await getKnownProduct(data);
                if (known) {
                    found = shoppingItems.find(i => i.name.trim().toLowerCase() === known.name.trim().toLowerCase() && i.is_purchased === 0);
                    // Match found by name in "To Buy" list
                    // We will upsert the barcode to this item later
                    setProductName(known.name);
                } else {
                    // Try external API
                    const apiData = await fetchProductFromOpenFoodFacts(data);
                    if (apiData.found) {
                        found = shoppingItems.find(i => i.name.trim().toLowerCase() === apiData.name.trim().toLowerCase() && i.is_purchased === 0);
                        setProductName(apiData.name);
                    }
                }
            } else {
                setProductName(found.name);
            }

            if (found) {
                setExistingItem(found);
                setProductName(found.name);
                setQuantity(found.quantity.toString());
                if (found.price) setPrice(found.price.toString());
            }

            setModalVisible(true);

        } catch (error) {
            Alert.alert('Erro', 'Falha ao processar código de barras.');
            setScanned(false);
        } finally {
            setLoading(false);
        }
    };

    const handleSaveProduct = async () => {
        if (!productName.trim()) {
            Alert.alert('Atenção', 'Informe o nome do produto.');
            return;
        }

        try {
            const qtyVal = parseFloat(quantity) || 1;
            const priceVal = price ? parseFloat(price.replace(',', '.')) : undefined;

            if (existingItem) {
                // Update existing item (Move to Cart)
                await updateShoppingItem(existingItem.id, {
                    is_purchased: 1, // Move to Cart
                    quantity: qtyVal,
                    price: priceVal,
                    barcode: currentBarcode // Ensure barcode is saved
                });
            } else {
                // Add new item (Directly to Cart)
                await addShoppingItem(
                    productName,
                    qtyVal,
                    'un',
                    priceVal,
                    currentBarcode,
                    undefined,
                    1 // isPurchased = 1 (In Cart)
                );
            }

            // Save to Local Intelligence text
            if (currentBarcode) {
                await saveKnownProduct(currentBarcode, productName.trim());
            }

            // UX: Ask next
            Alert.alert('Sucesso', existingItem ? 'Item atualizado no carrinho!' : 'Adicionado ao carrinho!', [
                {
                    text: 'Finalizar',
                    style: 'cancel',
                    onPress: () => {
                        handleCloseModal();
                        router.back();
                    }
                },
                {
                    text: 'Escanear Outro',
                    onPress: () => {
                        setModalVisible(false);
                        setProductName('');
                        setQuantity('1');
                        setPrice('');
                        setCurrentBarcode('');
                        setExistingItem(null);
                        setScanned(false);
                    }
                }
            ]);
        } catch (error) {
            Alert.alert('Erro', 'Não foi possível salvar o item.');
        }
    };

    const handleCloseModal = () => {
        setModalVisible(false);
        setScanned(false);
        setCurrentBarcode('');
        setExistingItem(null);
    };

    return (
        <View style={styles.container}>
            <Stack.Screen options={{ title: 'Escanear Produto', headerShown: false }} />

            <CameraView
                style={StyleSheet.absoluteFillObject}
                facing={facing}
                onBarcodeScanned={scanned ? undefined : handleBarCodeScanned}
                barcodeScannerSettings={{
                    barcodeTypes: ["ean13", "ean8", "qr"],
                }}
            />

            <TouchableOpacity
                style={styles.closeButton}
                onPress={() => router.back()}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
                <Text style={styles.closeButtonText}>✕</Text>
            </TouchableOpacity>

            <View style={styles.overlay} pointerEvents="none">
                <View style={styles.scanFrame} />
                <Text style={styles.scanText}>Aponte para o código de barras</Text>
            </View>

            {loading && (
                <View style={styles.loadingOverlay}>
                    <ActivityIndicator size="large" color="#ffffff" />
                    <Text style={styles.loadingText}>Verificando...</Text>
                </View>
            )}

            <Modal
                animationType="slide"
                transparent={true}
                visible={modalVisible}
                onRequestClose={handleCloseModal}
            >
                <View style={styles.modalContainer}>
                    <View style={styles.modalContent}>
                        <Text style={styles.modalTitle}>
                            {existingItem ? 'Atualizar Item' : 'Adicionar ao Carrinho'}
                        </Text>

                        <Text style={styles.label}>Nome do Produto</Text>
                        <TextInput
                            style={styles.input}
                            value={productName}
                            onChangeText={setProductName}
                            placeholder="Ex: Arroz 5kg"
                        />

                        <View style={{ flexDirection: 'row', gap: 10 }}>
                            <View style={{ flex: 1 }}>
                                <Text style={styles.label}>Qtd</Text>
                                <TextInput
                                    style={styles.input}
                                    value={quantity}
                                    onChangeText={setQuantity}
                                    keyboardType="numeric"
                                />
                            </View>
                            <View style={{ flex: 1 }}>
                                <Text style={styles.label}>Preço (R$)</Text>
                                <TextInput
                                    style={styles.input}
                                    value={price}
                                    onChangeText={setPrice}
                                    keyboardType="numeric"
                                    placeholder="0,00"
                                />
                            </View>
                        </View>

                        <View style={styles.modalButtons}>
                            <TouchableOpacity style={[styles.button, styles.buttonCancel]} onPress={handleCloseModal}>
                                <Text style={styles.buttonText}>Cancelar</Text>
                            </TouchableOpacity>

                            <TouchableOpacity style={[styles.button, styles.buttonSave]} onPress={handleSaveProduct}>
                                <Text style={[styles.buttonText, { color: 'white' }]}>
                                    {existingItem ? 'Confirmar' : 'Adicionar'}
                                </Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </Modal>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#000',
    },
    closeButton: {
        position: 'absolute',
        top: 50,
        right: 20,
        backgroundColor: 'rgba(0,0,0,0.6)',
        width: 44,
        height: 44,
        borderRadius: 22,
        justifyContent: 'center',
        alignItems: 'center',
        zIndex: 50,
    },
    closeButtonText: {
        color: 'white',
        fontSize: 24,
        fontWeight: 'bold',
        lineHeight: 28,
    },
    message: {
        textAlign: 'center',
        paddingBottom: 10,
        color: 'white',
    },
    overlay: {
        ...StyleSheet.absoluteFillObject,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: 'rgba(0,0,0,0.3)',
    },
    scanFrame: {
        width: 250,
        height: 250,
        borderWidth: 2,
        borderColor: '#00ff00',
        backgroundColor: 'transparent',
    },
    scanText: {
        color: 'white',
        marginTop: 20,
        fontSize: 16,
        fontWeight: 'bold',
        backgroundColor: 'rgba(0,0,0,0.5)',
        padding: 8,
        borderRadius: 4,
    },
    loadingOverlay: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: 'rgba(0,0,0,0.8)',
        justifyContent: 'center',
        alignItems: 'center',
        zIndex: 10,
    },
    loadingText: {
        color: 'white',
        marginTop: 10,
    },
    modalContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: 'rgba(0,0,0,0.5)',
    },
    modalContent: {
        width: '85%',
        backgroundColor: 'white',
        borderRadius: 20,
        padding: 20,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.25,
        shadowRadius: 4,
        elevation: 5,
    },
    modalTitle: {
        fontSize: 20,
        fontWeight: 'bold',
        marginBottom: 20,
        textAlign: 'center',
    },
    label: {
        fontSize: 14,
        color: '#666',
        marginBottom: 5,
    },
    input: {
        borderWidth: 1,
        borderColor: '#ddd',
        borderRadius: 8,
        padding: 12,
        marginBottom: 15,
        fontSize: 16,
    },
    modalButtons: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginTop: 10,
    },
    button: {
        flex: 1,
        padding: 15,
        borderRadius: 8,
        alignItems: 'center',
        marginHorizontal: 5,
    },
    buttonCancel: {
        backgroundColor: '#f1f1f1',
    },
    buttonSave: {
        backgroundColor: '#2563eb',
    },
    buttonText: {
        fontWeight: 'bold',
        color: '#333',
    },
});
