import { View, Text, TouchableOpacity, ScrollView, StatusBar, Dimensions, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Link, useFocusEffect } from 'expo-router';
import { useState, useCallback } from 'react';
import {
    ShoppingCart,
    PlusCircle,
    LayoutDashboard,
    ArrowUpRight,
    ArrowDownLeft,
    CreditCard,
    LineChart,
    Settings,
    History,
    ScanBarcode as ScannerIcon,
    Wallet
} from 'lucide-react-native';
import { AnalyticsService } from '../services/api';
import type { AnalyticsSummaryResponse } from '../types';

import { isConnected } from '../services/sync';

const { width } = Dimensions.get('window');
const COLUMN_WIDTH = (width - 48 - 16) / 2; // (Screen - padding - gap) / columns

export default function Home() {
    const [summary, setSummary] = useState<AnalyticsSummaryResponse | null>(null);
    const [loading, setLoading] = useState(true);
    const [cardsData, setCardsData] = useState<{ totalBills: number; nextDueDate: string | null; cardsCount: number }>({ totalBills: 0, nextDueDate: null, cardsCount: 0 });
    const [loadingCards, setLoadingCards] = useState(true);

    const loadDashboard = async () => {
        try {
            if (!await isConnected()) {
                setLoading(false);
                return;
            }

            const today = new Date();
            const firstDay = new Date(today.getFullYear(), today.getMonth(), 1);

            // Fetch Current Month
            const data = await AnalyticsService.getSummary(
                firstDay.toISOString().split('T')[0],
                today.toISOString().split('T')[0],
                'category'
            );
            setSummary(data);
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    };

    const loadCards = async () => {
        try {
            if (!await isConnected()) {
                setLoadingCards(false);
                return;
            }

            const { CreditCardsService } = await import('../services/api');
            const cards = await CreditCardsService.getAll();

            if (cards.length === 0) {
                setLoadingCards(false);
                return;
            }

            // Fetch balances for all cards
            const balances = await Promise.all(
                cards.map(async (card) => {
                    try {
                        const balance = await CreditCardsService.getBalance(card.id);
                        return { ...card, ...balance };
                    } catch {
                        return { ...card, usedLimit: 0, dueDay: card.dueDay };
                    }
                })
            );

            // Calculate totals
            const totalBills = balances.reduce((sum, card) => sum + (card.usedLimit || 0), 0);

            // Find next due date
            const today = new Date();
            const currentDay = today.getDate();
            const dueDates = balances.map(card => {
                const dueDay = card.dueDay;
                let dueDate = new Date(today.getFullYear(), today.getMonth(), dueDay);
                if (currentDay > dueDay) {
                    dueDate = new Date(today.getFullYear(), today.getMonth() + 1, dueDay);
                }
                return { date: dueDate, cardName: card.name };
            }).sort((a, b) => a.date.getTime() - b.date.getTime());

            const nextDue = dueDates[0];

            setCardsData({
                totalBills,
                nextDueDate: nextDue ? `${nextDue.cardName} - Dia ${nextDue.date.getDate()}` : null,
                cardsCount: cards.length
            });
        } catch (e) {
            console.error('Error loading cards:', e);
        } finally {
            setLoadingCards(false);
        }
    };

    useFocusEffect(
        useCallback(() => {
            loadDashboard();
            loadCards();
        }, [])
    );

    // Prepare Chart Data
    const pieData = summary?.groups
        .filter(g => g.expense > 0)
        .map((g, index) => ({
            value: g.expense,
            color: getConfigColor(index),
            text: `${((g.expense / summary.totalExpense) * 100).toFixed(0)}%`,
            label: g.label
        })) || [];

    return (
        <SafeAreaView className="flex-1 bg-slate-50">
            <StatusBar barStyle="dark-content" />

            <ScrollView className="flex-1 px-6">
                {/* Header */}
                <View className="py-8 flex-row justify-between items-center">
                    <View>
                        <Text className="text-slate-400 text-sm font-medium uppercase tracking-wider">Bem-vindo ao</Text>
                        <Text className="text-slate-900 text-3xl font-bold">HomeOS <Text className="text-blue-600">Mobile</Text></Text>
                    </View>
                    <TouchableOpacity className="bg-white p-3 rounded-full shadow-sm border border-slate-100">
                        <Settings size={20} color="#64748b" />
                    </TouchableOpacity>
                </View>

                {/* Summary Card */}
                <View className="bg-blue-600 rounded-3xl p-6 mb-8 shadow-lg shadow-blue-200">
                    <Text className="text-blue-100 text-sm mb-1">Saldo (Mês Atual)</Text>
                    {loading ? (
                        <ActivityIndicator color="white" className="self-start py-2" />
                    ) : (
                        <Text className="text-white text-3xl font-bold mb-6">
                            R$ {summary?.balance.toFixed(2) || '0,00'}
                        </Text>
                    )}

                    <View className="flex-row justify-between">
                        <View className="flex-row items-center">
                            <View className="bg-white/20 p-2 rounded-full mr-3">
                                <ArrowUpRight size={16} color="#fff" />
                            </View>
                            <View>
                                <Text className="text-blue-100 text-xs">Receitas</Text>
                                <Text className="text-white font-medium">
                                    R$ {summary?.totalIncome.toFixed(2) || '0,00'}
                                </Text>
                            </View>
                        </View>
                        <View className="flex-row items-center">
                            <View className="bg-white/20 p-2 rounded-full mr-3">
                                <ArrowDownLeft size={16} color="#fff" />
                            </View>
                            <View>
                                <Text className="text-blue-100 text-xs">Despesas</Text>
                                <Text className="text-white font-medium">
                                    R$ {summary?.totalExpense.toFixed(2) || '0,00'}
                                </Text>
                            </View>
                        </View>
                    </View>
                </View>

                {/* Credit Cards Widget */}
                {!loadingCards && cardsData.cardsCount > 0 && (
                    <Link href="/cards" asChild>
                        <TouchableOpacity className="bg-white rounded-2xl p-5 mb-6 shadow-sm border border-gray-100 active:opacity-90">
                            <View className="flex-row items-center justify-between mb-3">
                                <View className="flex-row items-center">
                                    <View className="bg-pink-100 p-2 rounded-full mr-3">
                                        <CreditCard size={20} color="#ec4899" />
                                    </View>
                                    <Text className="text-gray-900 font-bold text-base">Cartões de Crédito</Text>
                                </View>
                                <View className="bg-pink-50 px-2 py-1 rounded-full">
                                    <Text className="text-pink-600 font-bold text-xs">{cardsData.cardsCount} {cardsData.cardsCount === 1 ? 'cartão' : 'cartões'}</Text>
                                </View>
                            </View>

                            <View className="flex-row justify-between items-center">
                                <View className="flex-1 mr-3">
                                    <Text className="text-gray-400 text-xs mb-1">Faturas Pendentes</Text>
                                    <Text className="text-gray-900 font-bold text-lg">
                                        R$ {cardsData.totalBills.toFixed(2)}
                                    </Text>
                                </View>
                                {cardsData.nextDueDate && (
                                    <View className="flex-1">
                                        <Text className="text-gray-400 text-xs mb-1">Próximo Vencimento</Text>
                                        <Text className="text-orange-600 font-semibold text-sm">{cardsData.nextDueDate}</Text>
                                    </View>
                                )}
                            </View>
                        </TouchableOpacity>
                    </Link>
                )}


                <Text className="text-slate-900 text-lg font-bold mb-4">Funcionalidades</Text>

                {/* Grid Menu */}
                <View className="flex-row flex-wrap justify-between">
                    <MenuButton
                        href="/shopping-list"
                        title="Compras"
                        subtitle="Lista Offline"
                        icon={<ShoppingCart size={24} color="#6366f1" />}
                        bgColor="bg-indigo-50"
                    />
                    <MenuButton
                        href="/new-transaction"
                        title="Lançar"
                        subtitle="Transação"
                        icon={<PlusCircle size={24} color="#10b981" />}
                        bgColor="bg-emerald-50"
                    />
                    <MenuButton
                        href="/scanner"
                        title="Scanner"
                        subtitle="Código Barras"
                        icon={<ScannerIcon size={24} color="#f59e0b" />}
                        bgColor="bg-amber-50"
                    />
                    <MenuButton
                        href="/history"
                        title="Histórico"
                        subtitle="Extrato"
                        icon={<History size={24} color="#3b82f6" />}
                        bgColor="bg-blue-50"
                    />
                    <MenuButton
                        href="/cards"
                        title="Cartões"
                        subtitle="Faturas"
                        icon={<CreditCard size={24} color="#ec4899" />}
                        bgColor="bg-pink-50"
                    />
                    <MenuButton
                        href="/analytics"
                        title="Análise"
                        subtitle="Gráficos"
                        icon={<LineChart size={24} color="#8b5cf6" />}
                        bgColor="bg-violet-50"
                    />
                </View>

                {/* Secondary Actions */}
                <View className="mt-4 mb-10">
                    <Link href="/accounts" asChild>
                        <TouchableOpacity className="flex-row items-center bg-white p-5 rounded-2xl border border-slate-100 shadow-sm active:opacity-90">
                            <View className="bg-slate-100 p-3 rounded-xl mr-4">
                                <Wallet size={24} color="#475569" />
                            </View>
                            <View className="flex-1">
                                <Text className="text-slate-900 font-bold text-base">Minhas Contas</Text>
                                <Text className="text-slate-400 text-xs">Gerenciar contas e saldos</Text>
                            </View>
                            <ArrowUpRight size={20} color="#cbd5e1" />
                        </TouchableOpacity>
                    </Link>
                </View>
            </ScrollView>
        </SafeAreaView>
    );
}

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#6366f1'];
function getConfigColor(index: number) {
    return COLORS[index % COLORS.length];
}

function MenuButton({ href, title, subtitle, icon, bgColor }: any) {
    return (
        <Link href={href} asChild>
            <TouchableOpacity
                style={{ width: COLUMN_WIDTH }}
                className="bg-white p-5 rounded-3xl mb-4 border border-slate-100 shadow-sm items-start"
            >
                <View className={`${bgColor} p-3 rounded-2xl mb-4`}>
                    {icon}
                </View>
                <Text className="text-slate-900 font-bold text-base">{title}</Text>
                <Text className="text-slate-400 text-xs mt-1">{subtitle}</Text>
            </TouchableOpacity>
        </Link>
    );
}
