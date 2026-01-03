import { Stack } from 'expo-router';
import "../global.css";
import { useEffect, useState } from 'react';
import { View, ActivityIndicator } from 'react-native';
import { initDatabase } from '../services/database';
import { tryAutoSync } from '../services/sync';
import { loadAuthToken } from '../services/api';

let isDbInitialized = false;

import { SyncLoading } from '../components/sync-loading';

// ... (imports remain)

export default function Layout() {
    const [isReady, setIsReady] = useState(false);

    useEffect(() => {
        const init = async () => {
            if (!isDbInitialized) {
                try {
                    // 1. Load Token
                    await loadAuthToken();
                    // 2. Init DB
                    await initDatabase();
                    isDbInitialized = true;
                    // 3. Sync (Wait for it)
                    await tryAutoSync();
                } catch (e) {
                    console.error("Initialization Failed:", e);
                }
            }
            setIsReady(true);
        };

        init();
    }, []);

    if (!isReady) {
        return <SyncLoading onSkip={() => setIsReady(true)} />;
    }

    return (
        <Stack screenOptions={{
            headerShown: false,
            animation: 'slide_from_right',
            contentStyle: { backgroundColor: '#f8fafc' }
        }} />
    );
}
