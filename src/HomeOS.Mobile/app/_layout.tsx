import { Stack } from 'expo-router';
import "../global.css";
import { useEffect } from 'react';
import { initDatabase } from '../services/database';
import { tryAutoSync } from '../services/sync';
import { loadAuthToken } from '../services/api';

let isDbInitialized = false;

export default function Layout() {
    useEffect(() => {
        const init = async () => {
            if (!isDbInitialized) {
                // 1. Load Token
                await loadAuthToken();
                // 2. Init DB
                await initDatabase();
                isDbInitialized = true;
                // 3. Sync
                tryAutoSync();
            }
        };

        init().catch(err => console.error("Initialization Failed:", err));
    }, []);

    return (
        <Stack screenOptions={{
            headerShown: false,
            animation: 'slide_from_right',
            contentStyle: { backgroundColor: '#f8fafc' }
        }} />
    );
}
