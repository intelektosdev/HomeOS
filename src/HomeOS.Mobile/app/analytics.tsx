import { View, Text, ScrollView, ActivityIndicator, Dimensions, TouchableOpacity } from 'react-native';
import { useState, useCallback } from 'react';
import { Stack, useFocusEffect } from 'expo-router';
import { AnalyticsService, TransactionsService } from '../services/api';
import { getCategories } from '../services/database';
import { isConnected } from '../services/sync';
import type { AnalyticsSummaryResponse, CategoryResponse, TransactionResponse } from '../types';
import { TrendingUp, TrendingDown, DollarSign, AlertCircle } from 'lucide-react-native';

const screenWidth = Dimensions.get('window').width;
const BAR_MAX_WIDTH = screenWidth - 132;

const getCategoryColor = (index: number) => {
    const colors = ['#EF4444', '#F59E0B', '#10B981', '#3B82F6', '#8B5CF6', '#EC4899', '#14B8A6', '#F97316'];
    return colors[index % colors.length];
};

export default function AnalyticsScreen() {
    const [summary, setSummary] = useState<AnalyticsSummaryResponse | null>(null);
    const [previousSummary, setPreviousSummary] = useState<AnalyticsSummaryResponse | null>(null);
    const [topExpenses, setTopExpenses] = useState<TransactionResponse[]>([]);
    const [categories, setCategories] = useState<Record<string, CategoryResponse>>({});
    const [loading, setLoading] = useState(true);
    const [selectedPeriod, setSelectedPeriod] = useState<'month' | 'quarter' | 'year'>('month');

    const loadData = async () => {
        try {
            const connected = await isConnected();
            if (!connected) {
                setLoading(false);
                return;
            }

            try {
                const cats = await getCategories();
                const catMap: Record<string, CategoryResponse> = {};
                cats.forEach(c => catMap[c.id] = c);
                setCategories(catMap);
            } catch (catError) {
                console.error('Error loading categories:', catError);
            }

            const today = new Date();
            let startDate: Date;
            let previousStartDate: Date;
            let previousEndDate: Date;

            switch (selectedPeriod) {
                case 'month':
                    startDate = new Date(today.getFullYear(), today.getMonth(), 1);
                    previousStartDate = new Date(today.getFullYear(), today.getMonth() - 1, 1);
                    previousEndDate = new Date(today.getFullYear(), today.getMonth(), 0); // Last day of previous month
                    break;
                case 'quarter':
                    const currentQuarter = Math.floor(today.getMonth() / 3);
                    startDate = new Date(today.getFullYear(), currentQuarter * 3, 1);
                    previousStartDate = new Date(today.getFullYear(), (currentQuarter - 1) * 3, 1);
                    previousEndDate = new Date(today.getFullYear(), currentQuarter * 3, 0);
                    break;
                case 'year':
                    startDate = new Date(today.getFullYear(), 0, 1);
                    previousStartDate = new Date(today.getFullYear() - 1, 0, 1);
                    previousEndDate = new Date(today.getFullYear() - 1, 11, 31);
                    break;
            }

            const startDateStr = startDate.toISOString().split('T')[0];
            const endDateStr = today.toISOString().split('T')[0];
            const prevStartStr = previousStartDate.toISOString().split('T')[0];
            const prevEndStr = previousEndDate.toISOString().split('T')[0];

            const [summaryData, previousData, transactions] = await Promise.all([
                AnalyticsService.getSummary(startDateStr, endDateStr, 'category'),
                AnalyticsService.getSummary(prevStartStr, prevEndStr, 'category'),
                TransactionsService.getAll(startDateStr, endDateStr)
            ]);

            setSummary(summaryData);
            setPreviousSummary(previousData);

            const expenses = transactions.filter(tx => tx.amount < 0);
            const sorted = expenses.sort((a, b) => a.amount - b.amount);
            setTopExpenses(sorted.slice(0, 5));
        } catch (error) {
            console.error('Error loading analytics:', error);
        } finally {
            setLoading(false);
        }
    };

    useFocusEffect(
        useCallback(() => {
            loadData();
        }, [selectedPeriod])
    );

    if (loading) {
        return (
            <View className="flex-1 bg-gray-50 pt-6 justify-center items-center">
                <Stack.Screen options={{ title: 'Análises' }} />
                <ActivityIndicator size="large" color="#3B82F6" />
            </View>
        );
    }

    const balance = (summary?.totalIncome || 0) - (summary?.totalExpense || 0);
    const previousBalance = (previousSummary?.totalIncome || 0) - (previousSummary?.totalExpense || 0);
    const balanceChange = previousBalance !== 0 ? ((balance - previousBalance) / Math.abs(previousBalance)) * 100 : 0;

    const incomeChange = previousSummary?.totalIncome ? ((summary?.totalIncome || 0) - previousSummary.totalIncome) / previousSummary.totalIncome * 100 : 0;
    const expenseChange = previousSummary?.totalExpense ? ((summary?.totalExpense || 0) - previousSummary.totalExpense) / previousSummary.totalExpense * 100 : 0;

    const expenseGroups = summary?.groups?.filter(g => g.expense > 0)?.sort((a, b) => b.expense - a.expense) || [];

    const getPeriodLabel = () => {
        switch (selectedPeriod) {
            case 'month': return 'Este Mês';
            case 'quarter': return 'Este Trimestre';
            case 'year': return 'Este Ano';
        }
    };

    return (
        <View className="flex-1 bg-gray-50 pt-6">
            <Stack.Screen
                options={{
                    title: 'Análises',
                    headerShadowVisible: false,
                    headerStyle: { backgroundColor: '#F9FAFB' },
                }}
            />

            <ScrollView className="flex-1 px-4">
                <View className="h-4" />

                {/* Period Selector */}
                <View style={{ flexDirection: 'row', marginBottom: 16 }}>
                    {(['month', 'quarter', 'year'] as const).map((period, index) => (
                        <TouchableOpacity
                            key={period}
                            onPress={() => setSelectedPeriod(period)}
                            style={{
                                flex: 1,
                                paddingVertical: 8,
                                paddingHorizontal: 12,
                                borderRadius: 12,
                                marginRight: index < 2 ? 8 : 0,
                                backgroundColor: selectedPeriod === period ? '#3B82F6' : '#FFFFFF',
                                borderWidth: selectedPeriod === period ? 0 : 1,
                                borderColor: '#E5E7EB'
                            }}
                        >
                            <Text style={{
                                textAlign: 'center',
                                fontSize: 14,
                                fontWeight: '600',
                                color: selectedPeriod === period ? '#FFFFFF' : '#374151'
                            }}>
                                {period === 'month' ? 'Mês' : period === 'quarter' ? 'Trimestre' : 'Ano'}
                            </Text>
                        </TouchableOpacity>
                    ))}
                </View>

                {/* Monthly Summary */}
                <View className="bg-white rounded-2xl p-5 mb-4 shadow-sm border border-gray-100">
                    <Text className="text-gray-500 text-sm font-medium mb-3">{getPeriodLabel()}</Text>

                    <View className="flex-row justify-between items-center mb-4">
                        <View className="flex-1">
                            <Text className="text-gray-400 text-xs mb-1">Saldo</Text>
                            <Text style={{ fontSize: 24, fontWeight: 'bold', color: balance >= 0 ? '#10B981' : '#EF4444' }}>
                                {balance >= 0 ? '+' : ''}R$ {Math.abs(balance).toFixed(2)}
                            </Text>
                        </View>
                        <View style={{ padding: 12, borderRadius: 100, backgroundColor: balance >= 0 ? '#D1FAE5' : '#FEE2E2' }}>
                            {balance >= 0 ? (
                                <TrendingUp size={28} color="#10B981" />
                            ) : (
                                <TrendingDown size={28} color="#EF4444" />
                            )}
                        </View>
                    </View>

                    <View className="flex-row justify-between pt-4 border-t border-gray-100 mt-4">
                        <View className="flex-1">
                            <Text className="text-gray-400 text-xs mb-1">Receitas</Text>
                            <Text className="text-green-600 font-bold text-lg">
                                R$ {(summary?.totalIncome || 0).toFixed(2)}
                            </Text>
                            {previousSummary && incomeChange !== 0 && (
                                <Text style={{ fontSize: 10, color: incomeChange > 0 ? '#10B981' : '#EF4444', marginTop: 2 }}>
                                    {incomeChange > 0 ? '+' : ''}{incomeChange.toFixed(1)}% vs anterior
                                </Text>
                            )}
                        </View>
                        <View className="flex-1">
                            <Text className="text-gray-400 text-xs mb-1">Despesas</Text>
                            <Text className="text-red-600 font-bold text-lg">
                                R$ {(summary?.totalExpense || 0).toFixed(2)}
                            </Text>
                            {previousSummary && expenseChange !== 0 && (
                                <Text style={{ fontSize: 10, color: expenseChange > 0 ? '#EF4444' : '#10B981', marginTop: 2 }}>
                                    {expenseChange > 0 ? '+' : ''}{expenseChange.toFixed(1)}% vs anterior
                                </Text>
                            )}
                        </View>
                    </View>
                </View>

                {expenseGroups.length > 0 && (
                    <View className="bg-white rounded-2xl p-5 mb-4 shadow-sm border border-gray-100">
                        <Text className="text-gray-900 font-bold text-base mb-4">Gastos por Categoria</Text>

                        {expenseGroups.map((group, index) => {
                            const percentage = summary?.totalExpense ? (group.expense / summary.totalExpense) * 100 : 0;
                            const barWidth = Math.max(10, (percentage / 100) * BAR_MAX_WIDTH);
                            const color = getCategoryColor(index);

                            return (
                                <View key={group.label} style={{ marginTop: index > 0 ? 12 : 0 }}>
                                    <View className="flex-row justify-between items-center mb-2">
                                        <Text className="text-gray-700 font-semibold text-sm flex-1" numberOfLines={1}>
                                            {group.label}
                                        </Text>
                                        <Text className="text-gray-900 font-bold ml-2">
                                            R$ {group.expense.toFixed(2)}
                                        </Text>
                                    </View>
                                    <View className="flex-row items-center">
                                        <View
                                            style={{
                                                height: 12,
                                                borderRadius: 6,
                                                backgroundColor: color,
                                                width: barWidth
                                            }}
                                        />
                                        <Text className="text-gray-400 text-xs ml-2">
                                            {percentage.toFixed(0)}%
                                        </Text>
                                    </View>
                                </View>
                            );
                        })}
                    </View>
                )}

                {topExpenses.length > 0 && (
                    <View className="bg-white rounded-2xl p-5 mb-4 shadow-sm border border-gray-100">
                        <Text className="text-gray-900 font-bold text-base mb-4">Maiores Despesas</Text>

                        {topExpenses.map((tx, index) => {
                            const category = categories[tx.categoryId];
                            return (
                                <View key={tx.id} style={{ marginTop: index > 0 ? 12 : 0, paddingTop: index > 0 ? 12 : 0, borderTopWidth: index > 0 ? 1 : 0, borderTopColor: '#F3F4F6', flexDirection: 'row', alignItems: 'center' }}>
                                    <View style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: '#FEE2E2', justifyContent: 'center', alignItems: 'center', marginRight: 12 }}>
                                        <Text style={{ fontSize: 18 }}>{category?.icon || '💸'}</Text>
                                    </View>
                                    <View style={{ flex: 1 }}>
                                        <Text className="font-semibold text-gray-800 text-sm" numberOfLines={1}>
                                            {tx.description}
                                        </Text>
                                        <Text className="text-gray-400 text-xs">
                                            {category?.name || 'Sem Categoria'}
                                        </Text>
                                    </View>
                                    <Text className="font-bold text-red-600">
                                        R$ {Math.abs(tx.amount).toFixed(2)}
                                    </Text>
                                </View>
                            );
                        })}
                    </View>
                )}

                {summary && (
                    <View className="mb-6">
                        <Text className="text-gray-500 font-bold text-xs uppercase mb-3">Insights</Text>

                        {balance >= 0 && (
                            <View style={{ backgroundColor: '#D1FAE5', borderWidth: 1, borderColor: '#A7F3D0', borderRadius: 12, padding: 16, marginBottom: 8, flexDirection: 'row', alignItems: 'flex-start' }}>
                                <View style={{ backgroundColor: '#A7F3D0', padding: 8, borderRadius: 20, marginRight: 12 }}>
                                    <TrendingUp size={20} color="#10B981" />
                                </View>
                                <View style={{ flex: 1 }}>
                                    <Text className="text-green-800 font-bold text-sm">Parabéns!</Text>
                                    <Text className="text-green-700 text-xs mt-1">
                                        Você economizou R$ {balance.toFixed(2)} neste período.
                                    </Text>
                                </View>
                            </View>
                        )}

                        {balance < 0 && (
                            <View style={{ backgroundColor: '#FEE2E2', borderWidth: 1, borderColor: '#FECACA', borderRadius: 12, padding: 16, marginBottom: 8, flexDirection: 'row', alignItems: 'flex-start' }}>
                                <View style={{ backgroundColor: '#FECACA', padding: 8, borderRadius: 20, marginRight: 12 }}>
                                    <AlertCircle size={20} color="#EF4444" />
                                </View>
                                <View style={{ flex: 1 }}>
                                    <Text className="text-red-800 font-bold text-sm">Atenção!</Text>
                                    <Text className="text-red-700 text-xs mt-1">
                                        Suas despesas superaram as receitas em R$ {Math.abs(balance).toFixed(2)}.
                                    </Text>
                                </View>
                            </View>
                        )}

                        {expenseGroups.length > 0 && (
                            <View style={{ backgroundColor: '#DBEAFE', borderWidth: 1, borderColor: '#BFDBFE', borderRadius: 12, padding: 16, flexDirection: 'row', alignItems: 'flex-start' }}>
                                <View style={{ backgroundColor: '#BFDBFE', padding: 8, borderRadius: 20, marginRight: 12 }}>
                                    <DollarSign size={20} color="#3B82F6" />
                                </View>
                                <View style={{ flex: 1 }}>
                                    <Text className="text-blue-800 font-bold text-sm">Maior Categoria</Text>
                                    <Text className="text-blue-700 text-xs mt-1">
                                        Você gastou mais em "{expenseGroups[0].label}": R$ {expenseGroups[0].expense.toFixed(2)}
                                    </Text>
                                </View>
                            </View>
                        )}
                    </View>
                )}

                <View className="h-6" />
            </ScrollView>
        </View>
    );
}
