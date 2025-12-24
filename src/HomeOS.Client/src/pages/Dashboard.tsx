import { useState, useEffect } from 'react';
import { AnalyticsService } from '../services/api';
import type { AnalyticsSummaryResponse, GroupedDataResponse } from '../types';
import { BarChart, Bar, PieChart, Pie, Cell, ResponsiveContainer, XAxis, YAxis, Tooltip, Legend } from 'recharts';

type PeriodFilter = 'today' | 'week' | 'month' | 'year' | 'custom';
type GroupBy = 'category' | 'account' | 'status';

export function Dashboard() {
    const [summary, setSummary] = useState<AnalyticsSummaryResponse | null>(null);
    const [loading, setLoading] = useState(true);
    const [periodFilter, setPeriodFilter] = useState<PeriodFilter>('month');
    const [groupBy, setGroupBy] = useState<GroupBy>('category');
    const [customStartDate, setCustomStartDate] = useState('');
    const [customEndDate, setCustomEndDate] = useState('');
    const [expandedGroup, setExpandedGroup] = useState<string | null>(null);

    const getPeriodDates = (period: PeriodFilter): { start: string; end: string } => {
        const now = new Date();
        const end = now.toISOString().split('T')[0];
        let start: Date;

        switch (period) {
            case 'today':
                start = now;
                break;
            case 'week':
                start = new Date(now);
                start.setDate(now.getDate() - 7);
                break;
            case 'month':
                start = new Date(now.getFullYear(), now.getMonth(), 1);
                break;
            case 'year':
                start = new Date(now.getFullYear(), 0, 1);
                break;
            case 'custom':
                return { start: customStartDate, end: customEndDate };
            default:
                start = new Date(now.getFullYear(), now.getMonth(), 1);
        }

        return { start: start.toISOString().split('T')[0], end };
    };

    useEffect(() => {
        loadSummary();
    }, [periodFilter, groupBy, customStartDate, customEndDate]);

    const loadSummary = async () => {
        setLoading(true);
        try {
            const { start, end } = getPeriodDates(periodFilter);
            if (!start || !end) return; // Skip if custom dates not set

            const data = await AnalyticsService.getSummary(start, end, groupBy);
            setSummary(data);
        } catch (error) {
            console.error('Failed to load analytics', error);
        } finally {
            setLoading(false);
        }
    };

    const periodLabels: Record<PeriodFilter, string> = {
        today: 'Hoje',
        week: 'Esta Semana',
        month: 'Este Mês',
        year: 'Este Ano',
        custom: 'Personalizado'
    };

    const groupByLabels: Record<GroupBy, string> = {
        category: 'Categoria',
        account: 'Conta',
        status: 'Status'
    };

    // Chart colors
    const COLORS = ['#38bdf8', '#fb7185', '#34d399', '#fbbf24', '#a78bfa', '#f472b6', '#60a5fa'];

    // Prepare chart data
    const barChartData = summary?.groups.slice(0, 10).map((g: GroupedDataResponse) => ({
        name: g.label.length > 15 ? g.label.substring(0, 15) + '...' : g.label,
        Receita: g.income,
        Despesa: g.expense
    })) || [];

    const pieChartData = summary?.groups.map((g: GroupedDataResponse, idx: number) => ({
        name: g.label,
        value: g.expense,
        color: COLORS[idx % COLORS.length]
    })) || [];

    if (loading && !summary) {
        return (
            <div className="page">
                <div className="glass-panel" style={{ padding: '2rem', textAlign: 'center' }}>
                    Carregando analytics...
                </div>
            </div>
        );
    }

    return (
        <div className="page">
            <header className="page-header">
                <div>
                    <h1 className="page-title">Dashboard Analytics</h1>
                    <p className="page-description">Visão completa das suas finanças</p>
                </div>
            </header>

            {/* Period Filter */}
            <div className="glass-panel" style={{ padding: '1.5rem', marginBottom: '2rem' }}>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '1rem', alignItems: 'center' }}>
                    <div style={{ flex: 1, minWidth: '200px' }}>
                        <label className="form-label">Período</label>
                        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                            {(Object.keys(periodLabels) as PeriodFilter[]).map((p) => (
                                <button
                                    key={p}
                                    className={`btn ${periodFilter === p ? 'btn-primary' : 'btn-secondary'}`}
                                    onClick={() => setPeriodFilter(p)}
                                    style={{ fontSize: '0.875rem', padding: '0.5rem 1rem' }}
                                >
                                    {periodLabels[p]}
                                </button>
                            ))}
                        </div>
                    </div>

                    {periodFilter === 'custom' && (
                        <div style={{ display: 'flex', gap: '1rem', flex: 1, minWidth: '300px' }}>
                            <input
                                type="date"
                                className="form-input"
                                value={customStartDate}
                                onChange={(e) => setCustomStartDate(e.target.value)}
                                placeholder="Data Início"
                            />
                            <input
                                type="date"
                                className="form-input"
                                value={customEndDate}
                                onChange={(e) => setCustomEndDate(e.target.value)}
                                placeholder="Data Fim"
                            />
                        </div>
                    )}

                    <div style={{ flex: 1, minWidth: '200px' }}>
                        <label className="form-label">Agrupar por</label>
                        <select
                            className="form-input"
                            value={groupBy}
                            onChange={(e) => setGroupBy(e.target.value as GroupBy)}
                        >
                            {(Object.keys(groupByLabels) as GroupBy[]).map((g) => (
                                <option key={g} value={g}>{groupByLabels[g]}</option>
                            ))}
                        </select>
                    </div>
                </div>
            </div>

            {/* KPI Cards */}
            {summary && (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '1.5rem', marginBottom: '2rem' }}>
                    <div className="glass-panel" style={{ padding: '1.5rem', textAlign: 'center' }}>
                        <div style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', marginBottom: '0.5rem' }}>Receitas</div>
                        <div style={{ fontSize: '2rem', fontWeight: 'bold', color: 'var(--income-color)' }}>
                            {summary.totalIncome.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                        </div>
                    </div>
                    <div className="glass-panel" style={{ padding: '1.5rem', textAlign: 'center' }}>
                        <div style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', marginBottom: '0.5rem' }}>Despesas</div>
                        <div style={{ fontSize: '2rem', fontWeight: 'bold', color: 'var(--expense-color)' }}>
                            {summary.totalExpense.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                        </div>
                    </div>
                    <div className="glass-panel" style={{ padding: '1.5rem', textAlign: 'center' }}>
                        <div style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', marginBottom: '0.5rem' }}>Saldo</div>
                        <div style={{ fontSize: '2rem', fontWeight: 'bold', color: summary.balance >= 0 ? 'var(--income-color)' : 'var(--expense-color)' }}>
                            {summary.balance.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                        </div>
                    </div>
                    <div className="glass-panel" style={{ padding: '1.5rem', textAlign: 'center' }}>
                        <div style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', marginBottom: '0.5rem' }}>Pendentes</div>
                        <div style={{ fontSize: '2rem', fontWeight: 'bold', color: 'var(--warning-color)' }}>
                            {summary.pendingCount}
                        </div>
                    </div>
                </div>
            )}

            {/* Charts */}
            {summary && summary.groups.length > 0 && (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', gap: '2rem', marginBottom: '2rem' }}>
                    <div className="glass-panel" style={{ padding: '1.5rem' }}>
                        <h3 style={{ marginBottom: '1rem' }}>Receitas vs Despesas</h3>
                        <ResponsiveContainer width="100%" height={300}>
                            <BarChart data={barChartData}>
                                <XAxis dataKey="name" stroke="var(--text-secondary)" />
                                <YAxis stroke="var(--text-secondary)" />
                                <Tooltip
                                    contentStyle={{ background: 'rgba(17, 24, 39, 0.9)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px' }}
                                    formatter={(value: any) => (value !== undefined ? value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }) : 'N/A')}
                                />
                                <Legend />
                                <Bar dataKey="Receita" fill="#34d399" />
                                <Bar dataKey="Despesa" fill="#fb7185" />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>

                    <div className="glass-panel" style={{ padding: '1.5rem' }}>
                        <h3 style={{ marginBottom: '1rem' }}>Distribuição de Despesas</h3>
                        <ResponsiveContainer width="100%" height={300}>
                            <PieChart>
                                <Pie
                                    data={pieChartData}
                                    cx="50%"
                                    cy="50%"
                                    labelLine={false}
                                    label={(props: any) => `${props.name ?? 'N/A'}: ${((props.percent ?? 0) * 100).toFixed(0)}%`}
                                    outerRadius={80}
                                    fill="#8884d8"
                                    dataKey="value"
                                >
                                    {pieChartData.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={entry.color} />
                                    ))}
                                </Pie>
                                <Tooltip
                                    contentStyle={{ background: 'rgba(17, 24, 39, 0.9)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px' }}
                                    formatter={(value: any) => (value !== undefined ? value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }) : 'N/A')}
                                />
                            </PieChart>
                        </ResponsiveContainer>
                    </div>
                </div>
            )}

            {/* Drill-Down Table */}
            {summary && (
                <div className="glass-panel" style={{ padding: '1.5rem' }}>
                    <h3 style={{ marginBottom: '1rem' }}>Detalhamento por {groupByLabels[groupBy]}</h3>
                    <div style={{ overflowX: 'auto' }}>
                        <table className="data-table" style={{ width: '100%' }}>
                            <thead>
                                <tr>
                                    <th style={{ textAlign: 'left' }}>{groupByLabels[groupBy]}</th>
                                    <th style={{ textAlign: 'right' }}>Receitas</th>
                                    <th style={{ textAlign: 'right' }}>Despesas</th>
                                    <th style={{ textAlign: 'right' }}>Saldo</th>
                                    <th style={{ textAlign: 'center' }}>Qtd</th>
                                    <th style={{ textAlign: 'center' }}>Ações</th>
                                </tr>
                            </thead>
                            <tbody>
                                {summary.groups.map((group: GroupedDataResponse) => (
                                    <tr key={group.key} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                                        <td style={{ fontWeight: 500 }}>{group.label}</td>
                                        <td style={{ textAlign: 'right', color: 'var(--income-color)' }}>
                                            {group.income.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                                        </td>
                                        <td style={{ textAlign: 'right', color: 'var(--expense-color)' }}>
                                            {group.expense.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                                        </td>
                                        <td style={{ textAlign: 'right', color: (group.income - group.expense) >= 0 ? 'var(--income-color)' : 'var(--expense-color)' }}>
                                            {(group.income - group.expense).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                                        </td>
                                        <td style={{ textAlign: 'center' }}>{group.count}</td>
                                        <td style={{ textAlign: 'center' }}>
                                            <button
                                                className="btn btn-text"
                                                onClick={() => setExpandedGroup(expandedGroup === group.key ? null : group.key)}
                                                style={{ fontSize: '0.75rem', padding: '0.25rem 0.5rem' }}
                                            >
                                                {expandedGroup === group.key ? '▲ Fechar' : '▼ Ver Detalhes'}
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                    {expandedGroup && (
                        <div style={{ marginTop: '1rem', padding: '1rem', background: 'rgba(255,255,255,0.02)', borderRadius: '8px' }}>
                            <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
                                Drill-down para transações individuais do grupo "{summary.groups.find(g => g.key === expandedGroup)?.label}" virá em futuras melhorias.
                            </p>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
