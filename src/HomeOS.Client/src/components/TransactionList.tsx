import { useEffect, useState } from 'react';
import { TransactionsService } from '../services/api';
import type { TransactionResponse, CategoryResponse } from '../types';

interface TransactionListProps {
    onEdit: (t: TransactionResponse) => void;
    onCancel: (t: TransactionResponse) => void;
    onConciliate: (t: TransactionResponse) => void;
    onPay: (t: TransactionResponse) => void;
    refreshTrigger: number;
    categories: CategoryResponse[];
    filters: {
        month: number;
        year: number;
        categoryId?: string;
        accountId?: string;
    };
}

export function TransactionList({ onEdit, onCancel, onConciliate, onPay, refreshTrigger, categories, filters }: TransactionListProps) {
    // Helper to get category info
    const getCategoryById = (categoryId: string) => categories.find(c => c.id === categoryId);
    const [transactions, setTransactions] = useState<TransactionResponse[]>([]);
    const [loading, setLoading] = useState(true);

    const loadTransactions = async () => {
        try {
            setLoading(true);
            const startDate = new Date(filters.year, filters.month - 1, 1);
            const endDate = new Date(filters.year, filters.month, 0); // Last day of month

            // Format YYYY-MM-DD
            const startStr = startDate.toISOString().split('T')[0];
            const endStr = endDate.toISOString().split('T')[0];

            const data = await TransactionsService.getAll(startStr, endStr, filters.categoryId, filters.accountId);
            setTransactions(data);
        } catch (error) {
            console.error("Erro ao carregar transações", error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadTransactions();
    }, [refreshTrigger, filters]);

    if (loading) return <div style={{ textAlign: 'center', marginTop: '2rem' }}>Carregando extrato...</div>;

    return (
        <div className="glass-panel" style={{ padding: '2rem', marginTop: '2rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                <h2 style={{ margin: 0 }}>Extrato Recente</h2>
                <button onClick={loadTransactions} className="btn-icon" title="Atualizar">↻</button>
            </div>

            {transactions.length === 0 ? (
                <p style={{ color: 'var(--color-text-secondary)', textAlign: 'center' }}>Nenhuma transação encontrada.</p>
            ) : (
                <div style={{ overflowX: 'auto' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                        <thead>
                            <tr style={{ borderBottom: '1px solid var(--color-border)', color: 'var(--color-text-muted)' }}>
                                <th style={{ padding: '1rem', width: '40px', textAlign: 'center' }}>Tipo</th>
                                <th style={{ padding: '1rem' }}>Descrição</th>
                                <th style={{ padding: '1rem' }}>Categoria</th>
                                <th style={{ padding: '1rem' }}>Vencimento</th>
                                <th style={{ padding: '1rem' }}>Valor</th>
                                <th style={{ padding: '1rem' }}>Status</th>
                                <th style={{ padding: '1rem', textAlign: 'right' }}>Ações</th>
                            </tr>
                        </thead>
                        <tbody>
                            {transactions.map(t => {
                                const category = getCategoryById(t.categoryId);
                                const isIncome = category?.type === 'Income';
                                return (
                                    <tr key={t.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)', opacity: t.status === 'Cancelled' ? 0.5 : 1 }}>
                                        <td style={{ padding: '1rem', textAlign: 'center' }}>
                                            <span style={{
                                                display: 'inline-flex',
                                                alignItems: 'center',
                                                justifyContent: 'center',
                                                width: '28px',
                                                height: '28px',
                                                borderRadius: '50%',
                                                background: isIncome ? 'rgba(16, 185, 129, 0.15)' : 'rgba(239, 68, 68, 0.15)',
                                                color: isIncome ? 'var(--color-success)' : 'var(--color-danger)',
                                                fontSize: '1rem',
                                                fontWeight: 'bold'
                                            }}>
                                                {isIncome ? '↑' : '↓'}
                                            </span>
                                        </td>
                                        <td style={{ padding: '1rem' }}>
                                            <div style={{ fontWeight: 500, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                                {t.description}
                                                {t.installmentNumber && t.totalInstallments && (
                                                    <span style={{ fontSize: '0.75rem', background: 'rgba(255,255,255,0.1)', padding: '0.1rem 0.4rem', borderRadius: '4px', color: 'var(--color-text-muted)' }}>
                                                        {t.installmentNumber}/{t.totalInstallments}
                                                    </span>
                                                )}
                                            </div>
                                            {t.status === 'Cancelled' && <small style={{ color: 'var(--color-danger)' }}>CANCELADA</small>}
                                        </td>
                                        <td style={{ padding: '1rem' }}>
                                            <span style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                                {category?.icon && <span>{category.icon}</span>}
                                                <span style={{ color: 'var(--color-text-secondary)' }}>{category?.name || '-'}</span>
                                            </span>
                                        </td>
                                        <td style={{ padding: '1rem' }}>{new Date(t.dueDate).toLocaleDateString()}</td>
                                        <td style={{ padding: '1rem', fontWeight: 'bold' }}>
                                            R$ {(t.amount ?? 0).toFixed(2)}
                                        </td>
                                        <td style={{ padding: '1rem' }}>
                                            <span style={{
                                                padding: '0.25rem 0.75rem',
                                                borderRadius: 'var(--radius-full)',
                                                fontSize: '0.875rem',
                                                background:
                                                    t.status === 'Paid' ? 'rgba(16, 185, 129, 0.2)' :
                                                        t.status === 'Pending' ? 'rgba(245, 158, 11, 0.2)' :
                                                            t.status === 'Conciliated' ? 'rgba(59, 130, 246, 0.2)' :
                                                                t.status === 'Cancelled' ? 'rgba(239, 68, 68, 0.2)' : 'rgba(255, 255, 255, 0.1)',
                                                color:
                                                    t.status === 'Paid' ? 'var(--color-success)' :
                                                        t.status === 'Pending' ? 'var(--color-warning)' :
                                                            t.status === 'Conciliated' ? '#60a5fa' :
                                                                t.status === 'Cancelled' ? 'var(--color-danger)' : 'var(--color-text-primary)'
                                            }}>
                                                {t.status === 'Pending' ? 'Pendente' :
                                                    t.status === 'Paid' ? 'Pago' :
                                                        t.status === 'Conciliated' ? 'Conciliado' :
                                                            t.status === 'Cancelled' ? 'Cancelado' : t.status}
                                            </span>
                                        </td>
                                        <td style={{ padding: '1rem', textAlign: 'right' }}>
                                            {t.status !== 'Cancelled' && (
                                                <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
                                                    {t.status === 'Pending' && (
                                                        <button
                                                            onClick={() => onPay(t)}
                                                            className="btn-icon"
                                                            title="Pagar"
                                                            style={{ background: 'rgba(245, 158, 11, 0.1)', padding: '0.5rem', borderRadius: '4px', border: 'none', cursor: 'pointer', color: 'var(--color-warning)' }}
                                                        >
                                                            💲
                                                        </button>
                                                    )}
                                                    {t.status !== 'Conciliated' && (
                                                        <button
                                                            onClick={() => onConciliate(t)}
                                                            className="btn-icon"
                                                            title="Conciliar"
                                                            style={{ background: 'rgba(16, 185, 129, 0.1)', padding: '0.5rem', borderRadius: '4px', border: 'none', cursor: 'pointer', color: 'var(--color-success)' }}
                                                        >
                                                            ✅
                                                        </button>
                                                    )}
                                                    <button
                                                        onClick={() => onEdit(t)}
                                                        className="btn-icon"
                                                        title="Editar"
                                                        style={{ background: 'rgba(255, 255, 255, 0.05)', padding: '0.5rem', borderRadius: '4px', border: 'none', cursor: 'pointer', color: 'var(--color-text-primary)' }}
                                                    >
                                                        ✏️
                                                    </button>
                                                    <button
                                                        onClick={() => onCancel(t)}
                                                        className="btn-icon"
                                                        title="Cancelar"
                                                        style={{ background: 'rgba(239, 68, 68, 0.1)', padding: '0.5rem', borderRadius: '4px', border: 'none', cursor: 'pointer', color: 'var(--color-danger)' }}
                                                    >
                                                        🚫
                                                    </button>
                                                    <button
                                                        onClick={async () => {
                                                            if (confirm('Tem certeza que deseja EXCLUIR DEFINITIVAMENTE esta transação?')) {
                                                                try {
                                                                    await TransactionsService.delete(t.id);
                                                                    // We don't have a direct trigger here, but we can call loadTransactions if we pass it or just refresh the page
                                                                    window.location.reload(); // Simple way for now as loadTransactions is internal
                                                                } catch (err) {
                                                                    alert('Erro ao excluir transação.');
                                                                }
                                                            }
                                                        }}
                                                        className="btn-icon"
                                                        title="Excluir Definitivamente"
                                                        style={{ background: 'rgba(239, 68, 68, 0.2)', padding: '0.5rem', borderRadius: '4px', border: 'none', cursor: 'pointer', color: 'var(--color-danger)' }}
                                                    >
                                                        🗑️
                                                    </button>
                                                </div>
                                            )}
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    );
}
