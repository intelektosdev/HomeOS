import { View, Text, ScrollView, TouchableOpacity, RefreshControl, ActivityIndicator } from 'react-native';
import { useState, useCallback } from 'react';
import { Stack, useRouter, useFocusEffect } from 'expo-router';
import { CreditCardsService } from '../../services/api';
import { isConnected } from '../../services/sync';
import type { CreditCardBalanceResponse, CreditCardResponse } from '../../types';
import { CreditCard, TrendingUp, Calendar } from 'lucide-react-native';

type CardWithBalance = CreditCardResponse & Omit<CreditCardBalanceResponse, 'id' | 'name' | 'limit'> & {
    usedLimit: number;
    availableLimit: number;
    pendingTransactionsCount: number;
};

export default function CardsScreen() {
    const router = useRouter();
    const [cards, setCards] = useState<CardWithBalance[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [isOffline, setIsOffline] = useState(false);

    const loadCards = async () => {
        try {
            const connected = await isConnected();
            setIsOffline(!connected);

            if (!connected) {
                setLoading(false);
                setRefreshing(false);
                return;
            }

            const allCards = await CreditCardsService.getAll();

            const cardsWithBalance = await Promise.all(
                allCards.map(async (card) => {
                    try {
                        const balance = await CreditCardsService.getBalance(card.id);
                        return {
                            ...card,
                            usedLimit: balance.usedLimit,
                            availableLimit: balance.availableLimit,
                            pendingTransactionsCount: balance.pendingTransactionsCount
                        } as CardWithBalance;
                    } catch (error) {
                        console.error(`Error fetching balance for card ${card.id}:`, error);
                        return {
                            ...card,
                            usedLimit: 0,
                            availableLimit: card.limit,
                            pendingTransactionsCount: 0
                        } as CardWithBalance;
                    }
                })
            );

            setCards(cardsWithBalance);
        } catch (error) {
            console.error('Error loading cards:', error);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    useFocusEffect(
        useCallback(() => {
            loadCards();
        }, [])
    );

    const onRefresh = () => {
        setRefreshing(true);
        loadCards();
    };

    const getGradientColors = (index: number): [string, string] => {
        const gradients: [string, string][] = [
            ['#4F46E5', '#7C3AED'],
            ['#10B981', '#14B8A6'],
            ['#F59E0B', '#EF4444'],
            ['#EC4899', '#8B5CF6'],
            ['#06B6D4', '#3B82F6'],
        ];
        return gradients[index % gradients.length];
    };

    const getDaysUntil = (day: number): number => {
        const today = new Date();
        const currentDay = today.getDate();
        const currentMonth = today.getMonth();
        const currentYear = today.getFullYear();

        let targetDate = new Date(currentYear, currentMonth, day);

        if (currentDay > day) {
            targetDate = new Date(currentYear, currentMonth + 1, day);
        }

        const diffTime = targetDate.getTime() - today.getTime();
        return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    };

    const renderCard = (card: CardWithBalance, index: number) => {
        const [color1, color2] = getGradientColors(index);
        const usagePercent = (card.usedLimit / card.limit) * 100;
        const daysToClosing = getDaysUntil(card.closingDay);
        const daysToDue = getDaysUntil(card.dueDay);

        return (
            <TouchableOpacity
                key={card.id}
                onPress={() => router.push(`/cards/${card.id}`)}
                className="mb-4 rounded-3xl overflow-hidden shadow-lg active:opacity-90"
                style={{
                    backgroundColor: color1,
                    minHeight: 200
                }}
            >
                <View
                    className="absolute inset-0 opacity-40"
                    style={{ backgroundColor: color2 }}
                />

                <View className="p-6">
                    <View className="flex-row justify-between items-start mb-6">
                        <View>
                            <Text className="text-white/80 text-sm font-medium mb-1">Cartão de Crédito</Text>
                            <Text className="text-white text-2xl font-bold">{card.name}</Text>
                        </View>
                        <View className="bg-white/20 p-3 rounded-full">
                            <CreditCard size={24} color="white" />
                        </View>
                    </View>

                    <View className="mb-4">
                        <View className="flex-row justify-between items-baseline mb-2">
                            <Text className="text-white/80 text-xs">Limite utilizado</Text>
                            <Text className="text-white text-lg font-bold">
                                R$ {card.usedLimit.toFixed(2)}
                            </Text>
                        </View>

                        <View className="h-2 bg-white/20 rounded-full overflow-hidden">
                            <View
                                className="h-full bg-white rounded-full"
                                style={{ width: `${Math.min(usagePercent, 100)}%` }}
                            />
                        </View>

                        <View className="flex-row justify-between mt-1">
                            <Text className="text-white/60 text-xs">
                                Disponível: R$ {card.availableLimit.toFixed(2)}
                            </Text>
                            <Text className="text-white/60 text-xs">
                                de R$ {card.limit.toFixed(2)}
                            </Text>
                        </View>
                    </View>

                    <View className="flex-row justify-between items-center">
                        <View>
                            <Text className="text-white/70 text-xs">
                                Fecha em {daysToClosing} {daysToClosing === 1 ? 'dia' : 'dias'}
                            </Text>
                            <Text className="text-white/70 text-xs">
                                Vence em {daysToDue} {daysToDue === 1 ? 'dia' : 'dias'}
                            </Text>
                        </View>

                        {card.pendingTransactionsCount > 0 && (
                            <View className="bg-white/30 px-3 py-1 rounded-full">
                                <Text className="text-white font-bold text-xs">
                                    {card.pendingTransactionsCount} {card.pendingTransactionsCount === 1 ? 'transação' : 'transações'}
                                </Text>
                            </View>
                        )}
                    </View>
                </View>
            </TouchableOpacity>
        );
    };

    return (
        <View className="flex-1 bg-gray-50 pt-6">
            <Stack.Screen
                options={{
                    title: 'Meus Cartões',
                    headerShadowVisible: false,
                    headerStyle: { backgroundColor: '#F9FAFB' },
                }}
            />

            {isOffline && (
                <View className="bg-orange-100 p-2 flex-row justify-center items-center">
                    <Text className="text-orange-700 text-xs font-bold">⚠️ Modo Offline - Dados podem estar desatualizados</Text>
                </View>
            )}

            {loading && !refreshing ? (
                <View className="flex-1 justify-center items-center">
                    <ActivityIndicator size="large" color="#4F46E5" />
                </View>
            ) : (
                <ScrollView
                    className="flex-1 px-4 pt-4"
                    refreshControl={
                        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#4F46E5']} />
                    }
                >
                    {cards.length === 0 ? (
                        <View className="items-center py-20 px-10">
                            <View className="w-20 h-20 bg-gray-200 rounded-full items-center justify-center mb-4">
                                <CreditCard size={40} color="#9CA3AF" />
                            </View>
                            <Text className="text-gray-800 font-bold text-lg mb-2">Nenhum cartão cadastrado</Text>
                            <Text className="text-gray-400 text-center">
                                Seus cartões de crédito aparecerão aqui após sincronização.
                            </Text>
                        </View>
                    ) : (
                        cards.map((card, index) => renderCard(card, index))
                    )}

                    <View className="h-6" />
                </ScrollView>
            )}
        </View>
    );
}
