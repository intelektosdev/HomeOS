import { useState, useEffect } from 'react';
import { TransactionList } from '../components/TransactionList';
import { TransactionForm } from '../components/TransactionForm';
import type { TransactionResponse, CategoryResponse, AccountResponse } from '../types';
import { TransactionsService, CategoriesService, AccountsService } from '../services/api';

export function Transactions() {
    const [showForm, setShowForm] = useState(false);
    const [editingTransaction, setEditingTransaction] = useState<TransactionResponse | undefined>(undefined);
    const [refreshTrigger, setRefreshTrigger] = useState(0);

    // Filter State
    const [month, setMonth] = useState(new Date().getMonth() + 1);
    const [year, setYear] = useState(new Date().getFullYear());
    const [selectedCategoryId, setSelectedCategoryId] = useState('');
    const [selectedAccountId, setSelectedAccountId] = useState('');

    const [categories, setCategories] = useState<CategoryResponse[]>([]);
    const [accounts, setAccounts] = useState<AccountResponse[]>([]);

    useEffect(() => {
        const loadFilters = async () => {
            const [cats, accs] = await Promise.all([
                CategoriesService.getAll(),
                AccountsService.getAll()
            ]);
            setCategories(cats);
            setAccounts(accs);
        };
        loadFilters();
    }, []);

    const handleSuccess = () => {
        setShowForm(false);
        setEditingTransaction(undefined);
        setRefreshTrigger(prev => prev + 1);
    };

    const handleEdit = (transaction: TransactionResponse) => {
        setEditingTransaction(transaction);
        setShowForm(true);
    };

    const handleCancel = async (transaction: TransactionResponse) => {
        const reason = prompt(`Digite o motivo do cancelamento para "${transaction.description}":`);
        if (reason === null) return; // User pressed Cancel
        if (!reason.trim()) {
            alert('O motivo é obrigatório para cancelar.');
            return;
        }

        try {
            await TransactionsService.cancel(transaction.id, reason);
            setRefreshTrigger(prev => prev + 1);
        } catch (error) {
            console.error('Erro ao cancelar transação', error);
            alert('Erro ao cancelar transação');
        }
    };

    const handleConciliate = async (transaction: TransactionResponse) => {
        if (!confirm('Confirmar conciliação bancária desta transação?')) return;

        try {
            await TransactionsService.conciliate(transaction.id);
            setRefreshTrigger(prev => prev + 1);
        } catch (error) {
            console.error('Erro ao conciliar', error);
            alert('Erro ao conciliar transação.');
        }
    };

    const handlePay = async (transaction: TransactionResponse) => {
        if (!confirm(`Confirmar pagamento de "${transaction.description}"?`)) return;

        try {
            await TransactionsService.pay(transaction.id);
            setRefreshTrigger(prev => prev + 1);
        } catch (error) {
            console.error('Erro ao pagar', error);
            alert('Erro ao pagar transação.');
        }
    };

    return (
        <div className="page">
            <header className="page-header">
                <div>
                    <h1 className="page-title">Transações</h1>
                    <p className="page-description">Gerencie suas receitas e despesas</p>
                </div>
                <button
                    className="btn btn-primary"
                    onClick={() => {
                        setEditingTransaction(undefined);
                        setShowForm(true);
                    }}
                >
                    + Nova Transação
                </button>
            </header>

            {/* Filters */}
            <div className="glass-panel" style={{ padding: '1rem', marginBottom: '2rem', display: 'flex', gap: '1rem', flexWrap: 'wrap', alignItems: 'center' }}>
                <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                    <label style={{ color: 'var(--color-text-secondary)', fontSize: '0.875rem' }}>Período:</label>
                    <select
                        value={month}
                        onChange={e => setMonth(Number(e.target.value))}
                        className="form-input"
                        style={{ width: 'auto', padding: '0.5rem' }}
                    >
                        {Array.from({ length: 12 }, (_, i) => i + 1).map(m => (
                            <option key={m} value={m}>{new Date(0, m - 1).toLocaleString('default', { month: 'long' })}</option>
                        ))}
                    </select>
                    <input
                        type="number"
                        value={year}
                        onChange={e => setYear(Number(e.target.value))}
                        className="form-input"
                        style={{ width: '80px', padding: '0.5rem' }}
                    />
                </div>

                <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                    <label style={{ color: 'var(--color-text-secondary)', fontSize: '0.875rem' }}>Categoria:</label>
                    <select
                        value={selectedCategoryId}
                        onChange={e => setSelectedCategoryId(e.target.value)}
                        className="form-input"
                        style={{ width: 'auto', minWidth: '150px', padding: '0.5rem' }}
                    >
                        <option value="">Todas</option>
                        {categories.map(c => (
                            <option key={c.id} value={c.id}>{c.icon} {c.name}</option>
                        ))}
                    </select>
                </div>

                <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                    <label style={{ color: 'var(--color-text-secondary)', fontSize: '0.875rem' }}>Conta:</label>
                    <select
                        value={selectedAccountId}
                        onChange={e => setSelectedAccountId(e.target.value)}
                        className="form-input"
                        style={{ width: 'auto', minWidth: '150px', padding: '0.5rem' }}
                    >
                        <option value="">Todas</option>
                        {accounts.map(a => (
                            <option key={a.id} value={a.id}>{a.name}</option>
                        ))}
                    </select>
                </div>

                <button
                    onClick={() => {
                        setMonth(new Date().getMonth() + 1);
                        setYear(new Date().getFullYear());
                        setSelectedCategoryId('');
                        setSelectedAccountId('');
                    }}
                    className="btn btn-secondary"
                    style={{ marginLeft: 'auto', padding: '0.5rem 1rem', fontSize: '0.875rem' }}
                >
                    Limpar Filtros
                </button>
            </div>

            {showForm && (
                <div style={{ marginBottom: '2rem' }}>
                    <TransactionForm
                        transaction={editingTransaction}
                        onSuccess={handleSuccess}
                        onCancel={() => {
                            setShowForm(false);
                            setEditingTransaction(undefined);
                        }}
                    />
                </div>
            )}

            <TransactionList
                onEdit={handleEdit}
                onCancel={handleCancel}
                onConciliate={handleConciliate}
                onPay={handlePay}
                refreshTrigger={refreshTrigger}
                filters={{
                    month,
                    year,
                    categoryId: selectedCategoryId || undefined,
                    accountId: selectedAccountId || undefined
                }}
            />
        </div>
    );
}
