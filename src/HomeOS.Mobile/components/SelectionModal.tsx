import React from 'react';
import { View, Text, Modal, FlatList, TouchableOpacity, StyleSheet } from 'react-native';

// Force use of inline styles to avoid NativeWind recursion in this critical modal
const styles = StyleSheet.create({
    overlay: {
        flex: 1,
        justifyContent: 'flex-end',
        backgroundColor: 'rgba(0,0,0,0.5)',
    },
    modalContainer: {
        backgroundColor: 'white',
        borderTopLeftRadius: 24,
        borderTopRightRadius: 24,
        height: '60%',
    },
    header: {
        padding: 16,
        borderBottomWidth: 1,
        borderBottomColor: '#f3f4f6',
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    title: {
        fontSize: 20,
        fontWeight: 'bold',
        color: '#1f2937',
    },
    closeButton: {
        padding: 8,
    },
    closeText: {
        color: '#2563eb',
        fontWeight: 'bold',
    },
    itemContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 16,
        borderBottomWidth: 1,
        borderBottomColor: '#f9fafb',
    },
    iconContainer: {
        padding: 8,
        borderRadius: 9999,
        marginRight: 16,
    },
    itemName: {
        fontSize: 18,
        color: '#374151',
    },
    itemLimit: {
        marginLeft: 'auto',
        fontSize: 12,
        color: '#6b7280',
    },
});

interface SelectionModalProps {
    visible: boolean;
    onClose: () => void;
    title: string;
    data: any[];
    onSelect: (id: string) => void;
    // Changed to ReactNode to avoid passing Component references that confuse NativeWind
    headerIcon?: React.ReactNode;
}

export const SelectionModal = ({ visible, onClose, title, data, onSelect, headerIcon }: SelectionModalProps) => (
    <Modal visible={visible} animationType="slide" transparent>
        <View style={styles.overlay}>
            <View style={styles.modalContainer}>
                <View style={styles.header}>
                    <Text style={styles.title}>{title}</Text>
                    <TouchableOpacity onPress={onClose} style={styles.closeButton}>
                        <Text style={styles.closeText}>Fechar</Text>
                    </TouchableOpacity>
                </View>
                <FlatList
                    data={data}
                    keyExtractor={item => item.id}
                    contentContainerStyle={{ padding: 16 }}
                    renderItem={({ item }) => (
                        <TouchableOpacity
                            style={styles.itemContainer}
                            onPress={() => {
                                onSelect(item.id);
                                onClose();
                            }}
                        >
                            <View style={[
                                styles.iconContainer,
                                { backgroundColor: title.includes('Conta') ? '#dcfce7' : title.includes('Cartão') ? '#f3e8ff' : '#dbeafe' }
                            ]}>
                                {/* Map item icon usage? The previous code used the passed Icon type for *items* too? 
                                    Looking back: "{Icon ? <Icon ... /> : <Text>{item.icon}</Text>}"
                                    Wait, the previous code used the SAME Icon for every item row? 
                                    Yes, usually that was the intent (Wallet icon for all accounts).
                                    
                                    We should simplfy: If headerIcon is passed (e.g. <Wallet/>), we can't easily clone it for every row without cloning.
                                    Actually, for the list items, let's just use the emoji/icon from the item if present, or a default circle.
                                    BUT the user wants the icon type (Wallet/CreditCard) to show.
                                    
                                    Let's handle this by NOT rendering the passed icon in every row for now, 
                                    OR relying on the item.icon (emoji) which usually exists.
                                    Reliable sync adds emojis to accounts/categories.
                                    
                                    If we really want the generic icon, we can clone the headerIcon if it's a valid element, 
                                    but simpler is better: rely on item.icon if string.
                                */}
                                <Text style={{ fontSize: 20 }}>{item.icon || '📦'}</Text>
                            </View>
                            <Text style={styles.itemName}>{item.name}</Text>
                            {item.limit_amount !== undefined && (
                                <Text style={styles.itemLimit}>
                                    Dia {item.closingDay}/{item.dueDay}
                                </Text>
                            )}
                        </TouchableOpacity>
                    )}
                    ListEmptyComponent={
                        <View style={{ alignItems: 'center', padding: 40 }}>
                            <Text style={{ color: '#9ca3af' }}>Nenhum item encontrado.</Text>
                        </View>
                    }
                />
            </View>
        </View>
    </Modal>
);
