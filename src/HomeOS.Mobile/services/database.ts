import * as SQLite from 'expo-sqlite';
import { type CreateTransactionRequest } from '../types';

// Open the database asynchronously
// connecting to 'homeos.db'
export const getDb = async () => {
    return await SQLite.openDatabaseAsync('homeos.db');
};

export const initDatabase = async () => {
    const db = await getDb();

    // Create tables if they don't exist
    await db.execAsync(`
        PRAGMA journal_mode = WAL;
        
        -- Tabela de Lista de Compras Offline
        CREATE TABLE IF NOT EXISTS shopping_items (
            id TEXT PRIMARY KEY NOT NULL,
            name TEXT NOT NULL,
            quantity REAL NOT NULL,
            unit TEXT,
            is_purchased INTEGER DEFAULT 0,
            is_synced INTEGER DEFAULT 0, -- 1 = synced with server, 0 = local only change
            created_at TEXT DEFAULT (datetime('now')),
            server_id TEXT, -- references the ID on the server if synced
            price REAL,
            product_id TEXT,
            barcode TEXT
        );
    `);

    // Migrations for existing databases
    try {
        await db.execAsync('ALTER TABLE shopping_items ADD COLUMN price REAL');
    } catch (e) { }
    try {
        await db.execAsync('ALTER TABLE shopping_items ADD COLUMN product_id TEXT');
    } catch (e) { }
    try {
        await db.execAsync('ALTER TABLE shopping_items ADD COLUMN barcode TEXT');
    } catch (e) { }

    await db.execAsync(`
        -- Tabela de Transações Pendentes (Offline)
        CREATE TABLE IF NOT EXISTS pending_transactions (
            id TEXT PRIMARY KEY NOT NULL,
            payload TEXT NOT NULL, -- JSON string of CreateTransactionRequest
            created_at TEXT DEFAULT (datetime('now'))
        );

        -- Tabela de Categorias (Cache)
        CREATE TABLE IF NOT EXISTS categories (
            id TEXT PRIMARY KEY NOT NULL,
            name TEXT NOT NULL,
            type TEXT NOT NULL,
            icon TEXT
        );

        -- Tabela de Contas (Cache)
        CREATE TABLE IF NOT EXISTS accounts (
            id TEXT PRIMARY KEY NOT NULL,
            name TEXT NOT NULL,
            type TEXT NOT NULL,
            initialBalance REAL,
            isActive INTEGER DEFAULT 1
        );

        -- Tabela de Cache de Produtos (Scanner Intelligence)
        CREATE TABLE IF NOT EXISTS known_products (
            barcode TEXT PRIMARY KEY NOT NULL,
            name TEXT NOT NULL,
            created_at TEXT DEFAULT (datetime('now'))
        );

        -- Tabela de Configurações do App (Key-Value)
        CREATE TABLE IF NOT EXISTS app_settings (
            key TEXT PRIMARY KEY NOT NULL,
            value TEXT NOT NULL
        );

        -- Tabela de Cartões de Crédito (Cache)
        CREATE TABLE IF NOT EXISTS credit_cards (
            id TEXT PRIMARY KEY NOT NULL,
            name TEXT NOT NULL,
            closingDay INTEGER,
            dueDay INTEGER,
            limit_amount REAL
        );
    `);

    console.log('Database initialized successfully');
};

// --- Shopping List Helper Methods ---

export interface LocalShoppingItem {
    id: string;
    name: string;
    quantity: number;
    unit?: string;
    is_purchased: number; // 0 or 1
    is_synced: number;
    server_id?: string;
    price?: number;
    product_id?: string;
    barcode?: string;
}

export interface LocalPendingTransaction {
    id: string;
    payload: string;
    created_at: string;
}

// Polyfill for UUID generation in environments where crypto is not available
const generateUUID = () => {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
        const r = (Math.random() * 16) | 0;
        const v = c === 'x' ? r : (r & 0x3) | 0x8;
        return v.toString(16);
    });
};

// Helper to save a pending transaction
export const savePendingTransaction = async (transaction: CreateTransactionRequest) => {
    const db = await getDb();
    const id = generateUUID();
    const payload = JSON.stringify(transaction || {});

    await db.runAsync(
        'INSERT INTO pending_transactions (id, payload) VALUES (?, ?)',
        [id, payload]
    );
    return id;
};

// Helper to get all pending transactions
export const getPendingTransactions = async () => {
    const db = await getDb();
    return await db.getAllAsync<LocalPendingTransaction>('SELECT * FROM pending_transactions ORDER BY created_at ASC', []);
};

// Helper to delete a pending transaction (after sync)
export const deletePendingTransaction = async (id: string) => {
    const db = await getDb();
    await db.runAsync('DELETE FROM pending_transactions WHERE id = ?', [id]);
};

// --- Shopping List CRUD ---

export const getShoppingItems = async () => {
    const db = await getDb();
    return await db.getAllAsync<LocalShoppingItem>('SELECT * FROM shopping_items ORDER BY is_purchased ASC, created_at DESC', []);
};

export const addShoppingItem = async (
    name: string,
    quantity: number,
    unit: string = 'un',
    price?: number,
    barcode?: string,
    productId?: string,
    isPurchased: number = 0
) => {
    const db = await getDb();
    const id = generateUUID();

    const fields = ['id', 'name', 'quantity', 'unit', 'is_purchased', 'is_synced'];
    const values: any[] = [id, name, quantity, unit, isPurchased, 0];
    const placeholders = ['?', '?', '?', '?', '?', '?'];

    if (price !== undefined && price !== null) {
        fields.push('price');
        values.push(price);
        placeholders.push('?');
    }

    if (barcode !== undefined && barcode !== null) {
        fields.push('barcode');
        values.push(barcode);
        placeholders.push('?');
    }

    if (productId !== undefined && productId !== null) {
        fields.push('product_id');
        values.push(productId);
        placeholders.push('?');
    }

    await db.runAsync(
        `INSERT INTO shopping_items (${fields.join(', ')}) VALUES (${placeholders.join(', ')})`,
        values
    );
    return id;
};

export const updateShoppingItem = async (id: string, updates: Partial<LocalShoppingItem>) => {
    const db = await getDb();

    // Construct dynamic query
    const fields: string[] = [];
    const values: any[] = [];

    if (updates.name !== undefined) { fields.push('name = ?'); values.push(updates.name); }
    if (updates.quantity !== undefined) { fields.push('quantity = ?'); values.push(updates.quantity); }
    if (updates.price !== undefined) {
        if (updates.price === null) {
            fields.push('price = NULL');
        } else {
            fields.push('price = ?'); values.push(updates.price);
        }
    }
    if (updates.is_purchased !== undefined) { fields.push('is_purchased = ?'); values.push(updates.is_purchased); }
    if (updates.product_id !== undefined) {
        if (updates.product_id === null) {
            fields.push('product_id = NULL');
        } else {
            fields.push('product_id = ?'); values.push(updates.product_id);
        }
    }
    if (updates.barcode !== undefined) {
        if (updates.barcode === null) {
            fields.push('barcode = NULL');
        } else {
            fields.push('barcode = ?'); values.push(updates.barcode);
        }
    }

    // Always mark as unsynced on update
    fields.push('is_synced = 0');

    if (fields.length === 0) return;

    values.push(id);

    await db.runAsync(
        `UPDATE shopping_items SET ${fields.join(', ')} WHERE id = ?`,
        values
    );
};

export const toggleShoppingItem = async (id: string, currentStatus: number) => {
    const db = await getDb();
    const newStatus = currentStatus === 0 ? 1 : 0;
    await db.runAsync(
        'UPDATE shopping_items SET is_purchased = ?, is_synced = 0 WHERE id = ?',
        [newStatus, id]
    );
};

export const deleteShoppingItem = async (id: string) => {
    const db = await getDb();
    await db.runAsync('DELETE FROM shopping_items WHERE id = ?', [id]);
};

export const clearPurchasedItems = async () => {
    const db = await getDb();
    await db.runAsync('DELETE FROM shopping_items WHERE is_purchased = 1', []);
};

// --- SYNC HELPERS (Categories & Accounts) ---

export const saveCategories = async (categories: import('../types').CategoryResponse[]) => {
    const db = await getDb();
    // Clear existing cache (simple strategy for now)
    await db.runAsync('DELETE FROM categories', []);

    for (const cat of categories) {
        await db.runAsync(
            'INSERT INTO categories (id, name, type, icon) VALUES (?, ?, ?, ?)',
            [cat.id, cat.name || '', cat.type || 'Expense', cat.icon || '']
        );
    }
};

export const getCategories = async () => {
    try {
        const db = await getDb();
        return await db.getAllAsync<import('../types').CategoryResponse>('SELECT * FROM categories ORDER BY name ASC', []);
    } catch (error) {
        console.error('Error in getCategories:', error);
        // Return empty array if database isn't ready or query fails
        return [];
    }
};

export const saveAccounts = async (accounts: import('../types').AccountResponse[]) => {
    const db = await getDb();
    await db.runAsync('DELETE FROM accounts', []);
    for (const acc of accounts) {
        await db.runAsync(
            'INSERT INTO accounts (id, name, type, initialBalance, isActive) VALUES (?, ?, ?, ?, ?)',
            [acc.id, acc.name || '', acc.type || 'Checking', acc.initialBalance ?? 0, acc.isActive ? 1 : 0]
        );
    }
};

export const getAccounts = async () => {
    try {
        const db = await getDb();
        const rows = await db.getAllAsync<{ id: string, name: string, type: any, initialBalance: number, isActive: number }>('SELECT * FROM accounts ORDER BY name ASC', []);
        return rows.map(r => ({
            ...r,
            isActive: r.isActive === 1
        }));
    } catch (error) {
        console.error('Error in getAccounts:', error);
        return [];
    }
};

// --- PRODUCT INTELLIGENCE ---

export const getKnownProduct = async (barcode: string) => {
    const db = await getDb();
    const results = await db.getAllAsync<{ barcode: string, name: string }>('SELECT * FROM known_products WHERE barcode = ?', [barcode]);
    return results.length > 0 ? results[0] : null;
};



export const saveKnownProduct = async (barcode: string, name: string) => {
    const db = await getDb();
    if (!barcode || !name) return; // Defensive check
    await db.runAsync('INSERT OR REPLACE INTO known_products (barcode, name) VALUES (?, ?)', [barcode, name]);
};

// --- APP SETTINGS ---

export const getSetting = async (key: string): Promise<string | null> => {
    const db = await getDb();
    const result = await db.getFirstAsync<{ value: string }>('SELECT value FROM app_settings WHERE key = ?', [key]);
    return result ? result.value : null;
};

export const saveSetting = async (key: string, value: string) => {
    const db = await getDb();
    await db.runAsync('INSERT OR REPLACE INTO app_settings (key, value) VALUES (?, ?)', [key, value]);
};

// --- CREDIT CARDS ---

export const getCreditCards = async () => {
    try {
        const db = await getDb();
        return await db.getAllAsync<{ id: string, name: string, closingDay: number, dueDay: number, limit_amount: number }>('SELECT * FROM credit_cards ORDER BY name ASC', []);
    } catch (error) {
        console.error('Error in getCreditCards:', error);
        return [];
    }
};

export const saveCreditCards = async (cards: import('../types').CreditCardResponse[]) => {
    const db = await getDb();
    await db.runAsync('DELETE FROM credit_cards', []);
    for (const card of cards) {
        await db.runAsync(
            'INSERT INTO credit_cards (id, name, closingDay, dueDay, limit_amount) VALUES (?, ?, ?, ?, ?)',
            [card.id, card.name || '', card.closingDay ?? 1, card.dueDay ?? 10, card.limit ?? 0]
        );
    }
};

