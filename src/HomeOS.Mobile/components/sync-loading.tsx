import { View, Text, ActivityIndicator, TouchableOpacity, Image } from 'react-native';
import { useState, useEffect } from 'react';
import { Cloud, ArrowRight } from 'lucide-react-native';

interface SyncLoadingProps {
    onSkip: () => void;
}

export function SyncLoading({ onSkip }: SyncLoadingProps) {
    const [showSkip, setShowSkip] = useState(false);

    useEffect(() => {
        // Show skip button after 5 seconds if sync is slow
        const timer = setTimeout(() => {
            setShowSkip(true);
        }, 5000);

        return () => clearTimeout(timer);
    }, []);

    return (
        <View className="flex-1 bg-blue-600 justify-center items-center px-6">
            <View className="items-center mb-12">
                <View className="bg-white/20 p-6 rounded-full mb-6">
                    <Cloud size={48} color="white" />
                </View>
                <Text className="text-white text-3xl font-bold mb-2">HomeOS</Text>
                <Text className="text-blue-100 text-lg">Sincronizando dados...</Text>
            </View>

            <ActivityIndicator size="large" color="white" className="mb-8" />

            <View className="h-12 justify-center">
                {showSkip && (
                    <TouchableOpacity
                        className="bg-white/10 px-6 py-3 rounded-full flex-row items-center border border-white/20"
                        onPress={onSkip}
                    >
                        <Text className="text-white font-medium mr-2">Pular Sincronização</Text>
                        <ArrowRight size={16} color="white" />
                    </TouchableOpacity>
                )}
            </View>

            <Text className="text-blue-200 text-xs absolute bottom-10">
                Mantendo seus dados atualizados
            </Text>
        </View>
    );
}
