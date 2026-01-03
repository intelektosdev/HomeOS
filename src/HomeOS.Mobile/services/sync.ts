import * as Network from 'expo-network';
import { TransactionsService, CategoriesService, AccountsService, ShoppingListService, CreditCardsService } from './api';
import { ProductGroupsService, ProductsService, api } from './api';
import {
    getPendingTransactions,
    deletePendingTransaction,
    saveCategories,
    saveAccounts,
    saveCreditCards,
    getShoppingItems,
    addShoppingItem,
    updateShoppingItem,
    type LocalPendingTransaction
} from './database';
import { type CreateTransactionRequest } from '../types';

export const isConnected = async () => {
    const networkState = await Network.getNetworkStateAsync();
    return networkState.isConnected && networkState.isInternetReachable;
};

export const syncCategories = async () => {
    try {
        if (!await isConnected()) return false;
        const categories = await CategoriesService.getAll();
        await saveCategories(categories);
        console.log(`Categorias sincronizadas: ${categories.length}`);
        return true;
    } catch (error) {
        console.error('Erro ao sincronizar categorias:', error);
        return false;
    }
};

export const syncAccounts = async () => {
    try {
        if (!await isConnected()) return false;
        const accounts = await AccountsService.getAll();
        await saveAccounts(accounts);
        console.log(`Contas sincronizadas: ${accounts.length}`);
        return true;
    } catch (error) {
        console.error('Erro ao sincronizar contas:', error);
        return false;
    }
};

export const syncCreditCards = async () => {
    try {
        if (!await isConnected()) return false;
        const cards = await CreditCardsService.getAll();
        await saveCreditCards(cards);
        console.log(`Cartões sincronizados: ${cards.length}`);
        return true;
    } catch (error) {
        console.error('Erro ao sincronizar cartões:', error);
        return false;
    }
};

export const syncShoppingList = async () => {
    if (!await isConnected()) return;

    try {
        console.log('Syncing Shopping List...');
        const serverItems = await ShoppingListService.getPending();
        const localItems = await getShoppingItems();

        for (const sItem of serverItems) {
            // Check if linked
            const linkedLocal = localItems.find(l => l.server_id === sItem.id);

            if (linkedLocal) {
                if (linkedLocal.is_synced === 0) {
                    await updateShoppingItem(linkedLocal.id, { is_synced: 1 });
                }
            } else {
                // Check duplicate by name (case insensitive)
                const sameNameLocal = localItems.find(l =>
                    l.name.trim().toLowerCase() === sItem.name.trim().toLowerCase()
                    && !l.server_id
                );

                if (sameNameLocal) {
                    await updateShoppingItem(sameNameLocal.id, {
                        server_id: sItem.id,
                        product_id: sItem.productId || undefined,
                        price: sItem.estimatedPrice || undefined,
                        is_synced: 1
                    });
                } else {
                    const newId = await addShoppingItem(
                        sItem.name,
                        sItem.quantity,
                        sItem.unit || 'un',
                        sItem.estimatedPrice || undefined,
                        undefined,
                        sItem.productId || undefined
                    );

                    await updateShoppingItem(newId, {
                        server_id: sItem.id,
                        is_synced: 1
                    });
                }
            }
        }
        console.log(`Lista de compras sincronizada: ${serverItems.length} itens no servidor.`);
    } catch (error) {
        console.error("Error syncing shopping list:", error);
    }
};

export const syncPendingTransactions = async () => {
    // 1. Check internet connection
    const connected = await isConnected();
    if (!connected) {
        return { success: false, syncedCount: 0, error: 'Sem conexão com a internet' };
    }

    try {
        // 2. Get pending items from SQLite
        const pendingItems = await getPendingTransactions();

        if (pendingItems.length === 0) {
            return { success: true, syncedCount: 0 };
        }

        console.log(`Iniciando sincronização de ${pendingItems.length} transações...`);
        let syncedCount = 0;

        // 3. Iterate and send to API
        for (const item of pendingItems) {
            try {
                // Parse the JSON payload back to the request object
                const transactionData: CreateTransactionRequest = JSON.parse(item.payload);

                // Route to correct endpoint based on transaction type
                if (transactionData.creditCardId) {
                    // Credit card transactions go to /api/credit-cards/transactions
                    // Transform to match CreateCreditCardTransactionRequest
                    const creditCardPayload = {
                        creditCardId: transactionData.creditCardId,
                        categoryId: transactionData.categoryId,
                        description: transactionData.description,
                        amount: transactionData.amount,
                        transactionDate: transactionData.dueDate, // Map dueDate to transactionDate
                        installments: transactionData.installmentCount || null,
                        productId: (transactionData as any).productId || null
                    };
                    await api.post('/credit-cards/transactions', creditCardPayload);
                } else {
                    // Account transactions go to /api/transactions
                    await TransactionsService.create(transactionData);
                }

                // 4. If successful, delete from local DB
                await deletePendingTransaction(item.id);
                syncedCount++;

            } catch (error: any) {
                console.error(`Erro ao sincronizar transação ${item.id}:`, error);
                if (error.response?.data) {
                    console.error("Detalhes do erro da API:", JSON.stringify(error.response.data));
                }
                if (error.response?.status) {
                    console.error("Status HTTP:", error.response.status);
                }
            }
        }

        return { success: true, syncedCount };

    } catch (error) {
        console.error('Erro geral na sincronização:', error);
        return { success: false, syncedCount: 0, error };
    }
};

// Auto-sync function (can be called on app start or periodically)
export const tryAutoSync = async () => {
    console.log("Iniciando Auto-Sync...");

    // Parallelize downstream syncs
    await Promise.all([
        syncCategories(),
        syncAccounts(),
        syncCreditCards(),
        syncShoppingList(),
        syncProductGroups()
    ]);

    // Upstream sync
    try {
        const result = await syncPendingTransactions();
        const invResult = await syncProducts(); // This handles both up and down for products

        let totalSynced = (result.success ? result.syncedCount : 0) + (invResult ? 1 : 0); // Simplified count

        if (totalSynced > 0) {
            console.log(`Auto-sync completado.`);
        }
        return result;
    } catch (e) {
        // Silent fail for auto-sync but return error state
        return { success: false, syncedCount: 0, error: e };
    }
};

// --- Inventory Sync ---

export const syncProductGroups = async () => {
    try {
        if (!await isConnected()) return false;
        const groups = await import('./api').then(m => m.ProductGroupsService.getAll());
        await import('./database').then(m => m.saveProductGroups(groups));
        console.log(`Grupos de produtos sincronizados: ${groups.length}`);
        return true;
    } catch (error) {
        console.error('Erro ao sincronizar grupos:', error);
        return false;
    }
};

export const syncProducts = async () => {
    if (!await isConnected()) return false;

    // 1. Process Upstream Queue (Offline Actions)
    await processInventoryQueue();

    // 2. Downstream Sync (Fetch latest from server)
    try {
        const products = await import('./api').then(m => m.ProductsService.getAll(true)); // Include inactive to sync status
        await import('./database').then(m => m.saveProducts(products));
        console.log(`Produtos sincronizados: ${products.length}`);
        return true;
    } catch (error) {
        console.error('Erro ao baixar produtos:', error);
        return false;
    }
};

const processInventoryQueue = async () => {
    // Import getDb to allow direct updates to pending items
    const { getPendingInventoryUpdates, deletePendingInventoryUpdate, getDb } = await import('./database');
    const { ProductsService } = await import('./api');

    const queue = await getPendingInventoryUpdates();
    if (queue.length === 0) return;

    console.log(`Processando ${queue.length} ações de inventário offline...`);

    // Map to track temporary local IDs -> Real Server IDs
    const idMap = new Map<string, string>();
    const failedTempIds = new Set<string>();

    // Helper to replace IDs in pending items permanently in SQLite
    const updatePendingItemsWithServerId = async (tempId: string, serverId: string) => {
        const pending = await getPendingInventoryUpdates();

        for (const item of pending) {
            let payload = JSON.parse(item.payload);
            let changed = false;

            if (payload.id === tempId) { payload.id = serverId; changed = true; }
            if (payload.productId === tempId) { payload.productId = serverId; changed = true; }
            if (payload.productGroupId === tempId) { payload.productGroupId = serverId; changed = true; }

            if (changed) {
                const db = await getDb();
                await db.runAsync('UPDATE pending_inventory_updates SET payload = ? WHERE id = ?', [JSON.stringify(payload), item.id]);
                console.log(`Updated pending item ${item.type} with real server ID`);
            }
        }
    };

    for (const item of queue) {
        let payload: any;
        try {
            // Re-fetch payload to ensure freshness
            const currentItem = (await getPendingInventoryUpdates()).find(i => i.id === item.id);
            if (!currentItem) continue;

            payload = JSON.parse(currentItem.payload);

            // Apply in-memory map locally too
            if (payload.id && idMap.has(payload.id)) payload.id = idMap.get(payload.id);
            if (payload.productGroupId && idMap.has(payload.productGroupId)) payload.productGroupId = idMap.get(payload.productGroupId);
            if (payload.categoryId && idMap.has(payload.categoryId)) payload.categoryId = idMap.get(payload.categoryId);

            // Skip if dependency failed
            if (payload.id && failedTempIds.has(payload.id)) {
                console.log(`Skipping ${item.type} for ${payload.id} because dependency creation failed.`);
                continue;
            }

            if (item.type === 'CREATE_PRODUCT') {
                // Sanitize Payload: Remove tempId before sending to API to avoid 400 Bad Request
                const { tempId, ...apiPayload } = payload;

                // Fix for unsupported unit 'pct' -> 'un', and ensure unit is present
                if (!apiPayload.unit || apiPayload.unit === 'pct') apiPayload.unit = 'un';

                // Ensure name is present (defensive)
                if (!apiPayload.name) apiPayload.name = 'Produto Sem Nome (Recuperado)';

                try {
                    const response = await ProductsService.create(apiPayload);
                    const serverId = response.id;

                    if (tempId) {
                        idMap.set(tempId, serverId);
                        await updatePendingItemsWithServerId(tempId, serverId);
                        console.log(`Mapped/Persisted Temp ID ${tempId} -> Server ID ${serverId}`);
                    }
                    await deletePendingInventoryUpdate(item.id);
                } catch (e) {
                    if (payload.tempId) failedTempIds.add(payload.tempId);
                    throw e;
                }

            } else if (item.type === 'UPDATE_PRODUCT') {
                await ProductsService.update(payload.id, payload);
                await deletePendingInventoryUpdate(item.id);

            } else if (item.type === 'ADJUST_STOCK') {
                await ProductsService.adjustStock(payload.id, payload.quantityChange);
                await deletePendingInventoryUpdate(item.id);

            } else if (item.type === 'CREATE_PRODUCT_GROUP') {
                const { ProductGroupsService } = await import('./api');
                // Sanitize
                const { tempId, ...apiPayload } = payload;

                try {
                    const response = await ProductGroupsService.create(apiPayload);

                    if (tempId) {
                        idMap.set(tempId, response.id);
                        await updatePendingItemsWithServerId(tempId, response.id);
                        console.log(`Mapped/Persisted Group Temp ID ${tempId} -> Server ID ${response.id}`);
                    }
                    await deletePendingInventoryUpdate(item.id);
                } catch (e) {
                    if (payload.tempId) failedTempIds.add(payload.tempId);
                    throw e;
                }
            }

        } catch (error: any) {
            console.error(`Falha ao processar item da fila ${item.id} (${item.type}):`, error);
            if (error.response?.data) {
                console.error("Detalhes do erro API:", typeof error.response.data === 'object' ? JSON.stringify(error.response.data) : error.response.data);
            }

            // Handle 404 - Resource not found (Orphaned item or stale ID)
            if (error.response && error.response.status === 404) {
                console.log(`Item ${item.id} returned 404. Removing from queue to unblock.`);
                await deletePendingInventoryUpdate(item.id);
            }
        }
    }
};
