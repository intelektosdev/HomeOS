import { useState, useEffect } from 'react';
import { AnalyticsService, DebtsService, InvestmentsService } from '../services/api';
import type { AnalyticsSummaryResponse, GroupedDataResponse, DebtStatistics, PortfolioSummary } from '../types';
import { BarChart, Bar, PieChart, Pie, Cell, ResponsiveContainer, XAxis, YAxis, Tooltip, Legend } from 'recharts';

type PeriodFilter = 'today' | 'week' | 'month' | 'year' | 'custom';
type GroupBy = 'category' | 'account' | 'status';

export function Dashboard() {
    const [summary, setSummary] = useState<AnalyticsSummaryResponse | null>(null);
    const [prevSummary, setPrevSummary] = useState<AnalyticsSummaryResponse | null>(null);
    const [debtStats, setDebtStats] = useState<DebtStatistics | null>(null);
    const [portfolio, setPortfolio] = useState<PortfolioSummary | null>(null);
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

    const getPreviousPeriodDates = (_period: PeriodFilter, start: string, end: string): { start: string; end: string } => {
        const startDate = new Date(start);
        const endDate = new Date(end);
        const diffDays = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)) + 1;

        const prevEndDate = new Date(startDate);
        prevEndDate.setDate(startDate.getDate() - 1);

        const prevStartDate = new Date(prevEndDate);
        prevStartDate.setDate(prevEndDate.getDate() - diffDays + 1);

        return {
            start: prevStartDate.toISOString().split('T')[0],
            end: prevEndDate.toISOString().split('T')[0]
        };
    };

    useEffect(() => {
        loadSummary();
    }, [periodFilter, groupBy, customStartDate, customEndDate]);

    const loadSummary = async () => {
        setLoading(true);
        try {
            const { start, end } = getPeriodDates(periodFilter);
            if (!start || !end) return;

            const { start: pStart, end: pEnd } = getPreviousPeriodDates(periodFilter, start, end);

            const [summaryData, prevSummaryData, debtData, portfolioData] = await Promise.all([
                AnalyticsService.getSummary(start, end, groupBy),
                AnalyticsService.getSummary(pStart, pEnd, groupBy),
                DebtsService.getStatistics(),
                InvestmentsService.getPortfolio()
            ]);

            setSummary(summaryData);
            setPrevSummary(prevSummaryData);
            setDebtStats(debtData);
            setPortfolio(portfolioData);
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

            {/* KPI Cards & Insights */}
            {summary && (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '1.5rem', marginBottom: '2rem' }}>
                    {/* Receitas */}
                    <div className="glass-panel" style={{ padding: '1.5rem' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                            <span style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>Receitas</span>
                            {prevSummary && (
                                <span className={`badge ${summary.totalIncome >= prevSummary.totalIncome ? 'income' : 'expense'}`} style={{ fontSize: '0.75rem' }}>
                                    {summary.totalIncome >= prevSummary.totalIncome ? '▲' : '▼'}
                                    {Math.abs(((summary.totalIncome - prevSummary.totalIncome) / (prevSummary.totalIncome || 1)) * 100).toFixed(0)}%
                                </span>
                            )}
                        </div>
                        <div style={{ fontSize: '2rem', fontWeight: 800, color: 'var(--income-color)' }}>
                            {summary.totalIncome.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                        </div>
                        <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.5rem' }}>vs. período anterior</p>
                    </div>

                    {/* Despesas */}
                    <div className="glass-panel" style={{ padding: '1.5rem' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                            <span style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>Despesas</span>
                            {prevSummary && (
                                <span className={`badge ${summary.totalExpense <= prevSummary.totalExpense ? 'income' : 'expense'}`} style={{ fontSize: '0.75rem' }}>
                                    {summary.totalExpense <= prevSummary.totalExpense ? '▼' : '▲'}
                                    {Math.abs(((summary.totalExpense - prevSummary.totalExpense) / (prevSummary.totalExpense || 1)) * 100).toFixed(0)}%
                                </span>
                            )}
                        </div>
                        <div style={{ fontSize: '2rem', fontWeight: 800, color: 'var(--expense-color)' }}>
                            {summary.totalExpense.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                        </div>
                        <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.5rem' }}>vs. período anterior</p>
                    </div>

                    {/* Saldo */}
                    <div className="glass-panel" style={{ padding: '1.5rem' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                            <span style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>Saldo</span>
                            <span className="badge" style={{ backgroundColor: summary.balance >= 0 ? 'rgba(16, 185, 129, 0.1)' : 'rgba(239, 68, 68, 0.1)' }}>
                                {summary.balance >= 0 ? 'Positivo' : 'Negativo'}
                            </span>
                        </div>
                        <div style={{ fontSize: '2rem', fontWeight: 800, color: summary.balance >= 0 ? 'var(--income-color)' : 'var(--expense-color)' }}>
                            {summary.balance.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                        </div>
                        <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.5rem' }}>Líquido no período</p>
                    </div>

                    {/* Taxa de Poupança */}
                    <div className="glass-panel" style={{ padding: '1.5rem' }}>
                        <div style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', marginBottom: '0.5rem' }}>Taxa de Poupança</div>
                        <div style={{ fontSize: '2.5rem', fontWeight: 800, color: 'var(--color-primary)' }}>
                            {summary.totalIncome > 0
                                ? Math.max(0, ((summary.totalIncome - summary.totalExpense) / summary.totalIncome) * 100).toFixed(0)
                                : '0'}%
                        </div>
                        <div className="progress-bar-container" style={{ height: '4px', background: 'rgba(255,255,255,0.05)', marginTop: '0.5rem' }}>
                            <div className="progress-bar" style={{
                                width: `${Math.max(0, Math.min(100, (summary.totalIncome > 0 ? ((summary.totalIncome - summary.totalExpense) / summary.totalIncome) * 100 : 0)))}%`,
                                background: 'var(--gradient-primary)'
                            }}></div>
                        </div>
                    </div>
                </div>
            )}

            {/* AI Insights Section */}
            {summary && (
                <div className="glass-panel" style={{ marginBottom: '2rem', background: 'rgba(99, 102, 241, 0.05)', border: '1px solid rgba(99, 102, 241, 0.2)' }}>
                    <h3 style={{ fontSize: '1.25rem', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        ✨ Insights Financeiros
                    </h3>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '1rem' }}>
                        {summary.balance > 0 ? (
                            <div style={{ padding: '1rem', borderRadius: '8px', background: 'rgba(16, 185, 129, 0.1)', border: '1px solid rgba(16, 185, 129, 0.2)' }}>
                                <strong style={{ color: 'var(--income-color)', display: 'block', marginBottom: '0.25rem' }}>Bom trabalho!</strong>
                                <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
                                    Você economizou {((summary.balance / summary.totalIncome) * 100).toFixed(0)}% da sua renda este mês.
                                    Considere investir o excedente para acelerar seus objetivos.
                                </p>
                            </div>
                        ) : (
                            <div style={{ padding: '1rem', borderRadius: '8px', background: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.2)' }}>
                                <strong style={{ color: 'var(--expense-color)', display: 'block', marginBottom: '0.25rem' }}>Atenção ao Saldo</strong>
                                <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
                                    Suas despesas superaram suas receitas neste período. Verifique as maiores categorias abaixo para encontrar oportunidades de economia.
                                </p>
                            </div>
                        )}

                        {prevSummary && summary.totalExpense < prevSummary.totalExpense && (
                            <div style={{ padding: '1rem', borderRadius: '8px', background: 'rgba(16, 185, 129, 0.1)', border: '1px solid rgba(16, 185, 129, 0.2)' }}>
                                <strong style={{ color: 'var(--income-color)', display: 'block', marginBottom: '0.25rem' }}>Redução de Gastos</strong>
                                <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
                                    Suas despesas caíram {(((prevSummary.totalExpense - summary.totalExpense) / prevSummary.totalExpense) * 100).toFixed(0)}% em relação ao período anterior. Continue assim!
                                </p>
                            </div>
                        )}

                        {summary.pendingCount > 0 && (
                            <div style={{ padding: '1rem', borderRadius: '8px', background: 'rgba(245, 158, 11, 0.1)', border: '1px solid rgba(245, 158, 11, 0.2)' }}>
                                <strong style={{ color: 'var(--warning-color)', display: 'block', marginBottom: '0.25rem' }}>Contas Pendentes</strong>
                                <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
                                    Você tem {summary.pendingCount} transações pendentes. Não esqueça de conciliar para manter seus dados precisos.
                                </p>
                            </div>
                        )}
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

            {/* Wealth & Debt Section */}
            {(debtStats || portfolio) && (
                <div style={{ marginBottom: '2rem' }}>
                    <h2 style={{ fontSize: '1.5rem', marginBottom: '1.5rem', marginTop: '2rem' }}>Patrimônio e Dívidas</h2>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', gap: '2rem' }}>

                        {/* Investments Card */}
                        <div className="glass-panel" style={{ padding: '1.5rem' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem' }}>
                                <div>
                                    <h3 style={{ marginBottom: '0.5rem' }}>Investimentos</h3>
                                    <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>Total Investido</p>
                                    <div style={{ fontSize: '1.75rem', fontWeight: 'bold', color: 'var(--income-color)' }}>
                                        {portfolio?.summary?.CurrentValue?.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }) || 'R$ 0,00'}
                                    </div>
                                </div>
                                <div style={{ textAlign: 'right' }}>
                                    <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>Retorno</p>
                                    <div style={{
                                        color: (portfolio?.summary?.TotalReturn || 0) >= 0 ? 'var(--income-color)' : 'var(--expense-color)',
                                        fontWeight: '600'
                                    }}>
                                        {(portfolio?.summary?.TotalReturn || 0) > 0 ? '+' : ''}
                                        {portfolio?.summary?.TotalReturn?.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }) || 'R$ 0,00'}
                                    </div>
                                </div>
                            </div>

                            {portfolio?.byType && portfolio.byType.length > 0 ? (
                                <ResponsiveContainer width="100%" height={200}>
                                    <PieChart>
                                        <Pie
                                            data={portfolio.byType}
                                            cx="50%"
                                            cy="50%"
                                            innerRadius={60}
                                            outerRadius={80}
                                            paddingAngle={5}
                                            dataKey="CurrentValue"
                                        >
                                            {portfolio.byType.map((_, index) => (
                                                <Cell key={`cell-${index}`} fill={['#6366f1', '#ec4899', '#10b981', '#f59e0b'][index % 4]} />
                                            ))}
                                        </Pie>
                                        <Tooltip
                                            formatter={(value: any) => value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                                            contentStyle={{ background: 'rgba(17, 24, 39, 0.9)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px' }}
                                        />
                                        <Legend />
                                    </PieChart>
                                </ResponsiveContainer>
                            ) : (
                                <div className="empty-state" style={{ padding: '2rem 0' }}>Sem investimentos registrados</div>
                            )}
                        </div>

                        {/* Debts Card */}
                        <div className="glass-panel" style={{ padding: '1.5rem', position: 'relative', overflow: 'hidden' }}>
                            <div style={{ position: 'relative', zIndex: 1 }}>
                                <h3 style={{ marginBottom: '1.5rem' }}>Dívidas Ativas</h3>
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
                                    <div>
                                        <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginBottom: '0.25rem' }}>Total Devedor</p>
                                        <div style={{ fontSize: '2rem', fontWeight: 'bold', color: 'var(--expense-color)' }}>
                                            {debtStats?.totalDebt.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }) || 'R$ 0,00'}
                                        </div>
                                    </div>
                                    <div>
                                        <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginBottom: '0.25rem' }}>Contratos Ativos</p>
                                        <div style={{ fontSize: '2rem', fontWeight: 'bold', color: 'var(--text-primary)' }}>
                                            {debtStats?.activeDebtCount || 0}
                                        </div>
                                    </div>
                                </div>
                                <div style={{ marginTop: '2rem' }}>
                                    <div className="progress-bar-container" style={{ height: '0.5rem', background: 'rgba(239, 68, 68, 0.2)' }}>
                                        {/* Just a visual bar for now, since we don't have limit vs debt readily available here without more calls */}
                                        <div className="progress-bar" style={{ width: '100%', background: 'var(--expense-color)' }}></div>
                                    </div>
                                    <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '0.5rem', textAlign: 'center' }}>
                                        Mantenha suas dívidas sob controle
                                    </p>
                                </div>
                            </div>
                        </div>

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
