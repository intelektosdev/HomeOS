import { useState, useEffect } from 'react';
import {
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
    Area,
    AreaChart,
    ReferenceLine
} from 'recharts';
import { CashFlowService } from '../services/api';
import type { CashFlowForecastResponse } from '../types';

export function CashFlowForecast() {
    const [data, setData] = useState<CashFlowForecastResponse | null>(null);
    const [loading, setLoading] = useState(true);
    const [months, setMonths] = useState(6);

    useEffect(() => {
        const loadForecast = async () => {
            try {
                setLoading(true);
                const result = await CashFlowService.getForecast(months);
                setData(result);
            } catch (error) {
                console.error("Erro ao carregar previsão de fluxo de caixa", error);
            } finally {
                setLoading(false);
            }
        };
        loadForecast();
    }, [months]);

    if (loading) return <div style={{ textAlign: 'center', marginTop: '4rem', color: 'var(--color-text-secondary)' }}>
        <div className="spinner" style={{ margin: '0 auto 1rem' }}></div>
        Calculando projeções financeiras para os próximos {months} meses...
    </div>;

    const chartData = data?.dataPoints?.map(dp => ({
        ...dp,
        DateFormatted: new Date(dp.date).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' }),
        Balance: Number(dp.balance),
    })) || [];

    const minBalance = chartData.length > 0 ? Math.min(...chartData.map(d => d.Balance)) : 0;
    const lowestPoint = chartData.find(d => d.Balance === minBalance);

    return (
        <div className="fade-in">
            <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
                <div>
                    <h1 style={{ margin: 0 }}>Fluxo de Caixa Provisório</h1>
                    <p style={{ color: 'var(--color-text-secondary)', margin: '0.5rem 0 0' }}>
                        Simulação baseada em saldos atuais, contas pendentes e recorrências.
                    </p>
                </div>
                <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
                    <label style={{ fontSize: '0.875rem', color: 'var(--color-text-secondary)' }}>Período de Projeção:</label>
                    <select
                        value={months}
                        onChange={e => setMonths(Number(e.target.value))}
                        className="form-input"
                        style={{ width: 'auto', padding: '0.5rem' }}
                    >
                        <option value={3}>3 Meses</option>
                        <option value={6}>6 Meses</option>
                        <option value={12}>12 Meses</option>
                    </select>
                </div>
            </header>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1.5rem', marginBottom: '2rem' }}>
                <div className="glass-panel" style={{ padding: '1.5rem' }}>
                    <div style={{ color: 'var(--color-text-secondary)', fontSize: '0.875rem', marginBottom: '0.5rem' }}>Saldo Hoje</div>
                    <div style={{ fontSize: '1.75rem', fontWeight: 'bold' }}>
                        R$ {data?.startingBalance.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </div>
                </div>
                <div className="glass-panel" style={{ padding: '1.5rem', borderLeft: '4px solid var(--color-warning)' }}>
                    <div style={{ color: 'var(--color-text-secondary)', fontSize: '0.875rem', marginBottom: '0.5rem' }}>Mínimo de Liquidez (Vale)</div>
                    <div style={{ fontSize: '1.75rem', fontWeight: 'bold', color: minBalance < 0 ? 'var(--color-danger)' : 'var(--color-warning)' }}>
                        R$ {minBalance.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </div>
                    {lowestPoint && (
                        <div style={{ fontSize: '0.75rem', color: 'var(--color-text-secondary)', marginTop: '0.25rem' }}>
                            Previsto para {new Date(lowestPoint.date).toLocaleDateString()}
                        </div>
                    )}
                </div>
                <div className="glass-panel" style={{ padding: '1.5rem' }}>
                    <div style={{ color: 'var(--color-text-secondary)', fontSize: '0.875rem', marginBottom: '0.5rem' }}>Patrimônio Líquido Final</div>
                    <div style={{ fontSize: '1.75rem', fontWeight: 'bold', color: (chartData[chartData.length - 1]?.balance || 0) >= 0 ? 'var(--color-success)' : 'var(--color-danger)' }}>
                        R$ {chartData[chartData.length - 1]?.balance.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </div>
                </div>
            </div>

            <div className="glass-panel" style={{ padding: '2rem', height: '450px', marginBottom: '2rem' }}>
                <h3 style={{ marginTop: 0, marginBottom: '2rem' }}>Curva de Disponibilidade Financeira</h3>
                <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={chartData}>
                        <defs>
                            <linearGradient id="colorBalance" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor="var(--color-primary)" stopOpacity={0.4} />
                                <stop offset="95%" stopColor="var(--color-primary)" stopOpacity={0} />
                            </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
                        <XAxis
                            dataKey="DateFormatted"
                            stroke="var(--color-text-muted)"
                            fontSize={11}
                            tickLine={false}
                            axisLine={false}
                            minTickGap={30}
                        />
                        <YAxis
                            stroke="var(--color-text-muted)"
                            fontSize={11}
                            tickLine={false}
                            axisLine={false}
                            tickFormatter={(value) => `R$ ${value >= 1000 ? (value / 1000).toFixed(1) + 'k' : value}`}
                        />
                        <Tooltip
                            contentStyle={{
                                backgroundColor: 'rgba(15, 23, 42, 0.95)',
                                border: '1px solid var(--color-border)',
                                borderRadius: '12px',
                                boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)',
                                color: '#fff'
                            }}
                            itemStyle={{ color: 'var(--color-primary)' }}
                            formatter={(value: any) => [`R$ ${Number(value).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`, 'Saldo Projetado']}
                        />
                        <Area
                            type="monotone"
                            dataKey="balance"
                            stroke="var(--color-primary)"
                            strokeWidth={4}
                            fillOpacity={1}
                            fill="url(#colorBalance)"
                            animationDuration={2000}
                        />
                        <ReferenceLine y={0} stroke="var(--color-danger)" strokeDasharray="5 5" label={{ position: 'right', value: 'Zero', fill: 'var(--color-danger)', fontSize: 10 }} />
                    </AreaChart>
                </ResponsiveContainer>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', gap: '2rem' }}>
                <div className="glass-panel" style={{ padding: '2rem' }}>
                    <h3 style={{ marginTop: 0, color: 'var(--color-success)', fontSize: '1.1rem' }}>Maiores Aportes Projetados</h3>
                    <div style={{ marginTop: '1rem' }}>
                        {chartData.filter(d => d.incoming > 0).sort((a, b) => b.incoming - a.incoming).slice(0, 5).map((d, i) => (
                            <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '1rem 0', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                                <div>
                                    <div style={{ fontWeight: 500 }}>{new Date(d.date).toLocaleDateString()}</div>
                                    <div style={{ fontSize: '0.75rem', color: 'var(--color-text-secondary)' }}>{d.description}</div>
                                </div>
                                <span style={{ fontWeight: 'bold', color: 'var(--color-success)' }}>+ R$ {d.incoming.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                            </div>
                        ))}
                        {chartData.filter(d => d.incoming > 0).length === 0 && <p style={{ color: 'var(--color-text-muted)', fontSize: '0.875rem' }}>Nenhuma entrada significativa projetada.</p>}
                    </div>
                </div>

                <div className="glass-panel" style={{ padding: '2rem' }}>
                    <h3 style={{ marginTop: 0, color: 'var(--color-danger)', fontSize: '1.1rem' }}>Maiores Saídas Projetadas</h3>
                    <div style={{ marginTop: '1rem' }}>
                        {chartData.filter(d => d.outgoing > 0).sort((a, b) => b.outgoing - a.outgoing).slice(0, 5).map((d, i) => (
                            <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '1rem 0', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                                <div>
                                    <div style={{ fontWeight: 500 }}>{new Date(d.date).toLocaleDateString()}</div>
                                    <div style={{ fontSize: '0.75rem', color: 'var(--color-text-secondary)' }}>{d.description}</div>
                                </div>
                                <span style={{ fontWeight: 'bold', color: 'var(--color-danger)' }}>- R$ {d.outgoing.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                            </div>
                        ))}
                        {chartData.filter(d => d.outgoing > 0).length === 0 && <p style={{ color: 'var(--color-text-muted)', fontSize: '0.875rem' }}>Nenhuma saída significativa projetada.</p>}
                    </div>
                </div>
            </div>
        </div>
    );
}
