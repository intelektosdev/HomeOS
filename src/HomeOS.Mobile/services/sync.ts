import * as Network from 'expo-network';
import { TransactionsService, CategoriesService, AccountsService, ShoppingListService, CreditCardsService } from './api';
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

                // Send to API
                await TransactionsService.create(transactionData);

                // 4. If successful, delete from local DB
                await deletePendingTransaction(item.id);
                syncedCount++;

            } catch (error) {
                console.error(`Erro ao sincronizar transação ${item.id}:`, error);
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
        try {
            // Re-fetch payload to ensure freshness
            const currentItem = (await getPendingInventoryUpdates()).find(i => i.id === item.id);
            if (!currentItem) continue;

            const payload = JSON.parse(currentItem.payload);

            // Apply in-memory map locally too
            if (payload.id && idMap.has(payload.id)) payload.id = idMap.get(payload.id);
            if (payload.productGroupId && idMap.has(payload.productGroupId)) payload.productGroupId = idMap.get(payload.productGroupId);

            if (item.type === 'CREATE_PRODUCT') {
                // Sanitize Payload: Remove tempId before sending to API to avoid 400 Bad Request
                const { tempId, ...apiPayload } = payload;

                const response = await ProductsService.create(apiPayload);
                const serverId = response.id;

                if (tempId) {
                    idMap.set(tempId, serverId);
                    await updatePendingItemsWithServerId(tempId, serverId);
                    console.log(`Mapped/Persisted Temp ID ${tempId} -> Server ID ${serverId}`);
                }
                await deletePendingInventoryUpdate(item.id);

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
                const response = await ProductGroupsService.create(apiPayload);

                if (tempId) {
                    idMap.set(tempId, response.id);
                    await updatePendingItemsWithServerId(tempId, response.id);
                    console.log(`Mapped/Persisted Group Temp ID ${tempId} -> Server ID ${response.id}`);
                }
                await deletePendingInventoryUpdate(item.id);
            }

        } catch (error) {
            console.error(`Falha ao processar item da fila ${item.id} (${item.type}):`, error);
        }
    }
};
