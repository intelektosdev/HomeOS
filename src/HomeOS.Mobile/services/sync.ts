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
        syncShoppingList()
    ]);

    // Upstream sync
    try {
        const result = await syncPendingTransactions();
        if (result.success && result.syncedCount > 0) {
            console.log(`Auto-sync completado: ${result.syncedCount} itens enviados.`);
        }
        return result;
    } catch (e) {
        // Silent fail for auto-sync but return error state
        return { success: false, syncedCount: 0, error: e };
    }
};
