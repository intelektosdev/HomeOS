import { useEffect, useState } from 'react';
import { AccountsService, TransactionsService } from '../services/api';
import type { AccountResponse, CreateAccountRequest, AccountType, TransactionResponse } from '../types';

type ViewMode = 'cards' | 'grid';

export function Accounts() {
    const [accounts, setAccounts] = useState<AccountResponse[]>([]);
    const [accountBalances, setAccountBalances] = useState<Record<string, number>>({});
    const [showForm, setShowForm] = useState(false);
    const [viewMode, setViewMode] = useState<ViewMode>('cards');
    const [editingId, setEditingId] = useState<string | null>(null);
    const [formData, setFormData] = useState<CreateAccountRequest>({
        name: '',
        type: 'Checking',
        initialBalance: 0
    });

    const loadAccounts = async () => {
        try {
            const [accountsData, transactionsData] = await Promise.all([
                AccountsService.getAll(),
                TransactionsService.getAll()
            ]);

            setAccounts(accountsData);

            // Calculate balances
            const balances: Record<string, number> = {};
            accountsData.forEach((acc: AccountResponse) => {
                const accTransactions = transactionsData.filter((t: TransactionResponse) => t.accountId === acc.id);
                const transactionsTotal = accTransactions.reduce((sum: number, t: TransactionResponse) => sum + t.amount, 0);
                balances[acc.id] = acc.initialBalance + transactionsTotal;
            });
            setAccountBalances(balances);
        } catch (error) {
            console.error('Erro ao carregar contas', error);
        }
    };

    useEffect(() => {
        loadAccounts();
    }, []);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            if (editingId) {
                await AccountsService.update(editingId, formData);
            } else {
                await AccountsService.create(formData);
            }
            resetForm();
            loadAccounts();
        } catch (error) {
            console.error('Erro ao salvar conta', error);
        }
    };

    const resetForm = () => {
        setFormData({ name: '', type: 'Checking', initialBalance: 0 });
        setShowForm(false);
        setEditingId(null);
    };

    const handleEdit = (account: AccountResponse) => {
        setEditingId(account.id);
        setFormData({
            name: account.name,
            type: account.type as AccountType,
            initialBalance: account.initialBalance
        });
        setShowForm(true);
    };

    const handleToggleStatus = async (id: string) => {
        try {
            await AccountsService.toggleStatus(id);
            loadAccounts();
        } catch (error) {
            console.error('Erro ao alterar status da conta', error);
        }
    };

    const getAccountIcon = (type: AccountType) => {
        switch (type) {
            case 'Checking': return '🏦';
            case 'Wallet': return '💰';
            case 'Investment': return '📈';
            default: return '💳';
        }
    };

    const getAccountTypeLabel = (type: AccountType) => {
        switch (type) {
            case 'Checking': return 'Conta Corrente';
            case 'Wallet': return 'Carteira';
            case 'Investment': return 'Investimento';
            default: return type;
        }
    };

    const totalNetWorth = accounts
        .filter((acc: AccountResponse) => acc.isActive)
        .reduce((sum: number, acc: AccountResponse) => sum + (accountBalances[acc.id] || 0), 0);

    return (
        <div className="page">
            <header className="page-header">
                <div>
                    <h1 className="page-title">Contas</h1>
                    <p className="page-description">Gerencie suas contas bancárias e carteiras</p>
                </div>
                <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
                    {/* View Mode Toggle */}
                    <div className="view-toggle">
                        <button
                            className={`view-toggle-btn ${viewMode === 'cards' ? 'active' : ''}`}
                            onClick={() => setViewMode('cards')}
                            title="Visualização em cartões"
                        >
                            📇
                        </button>
                        <button
                            className={`view-toggle-btn ${viewMode === 'grid' ? 'active' : ''}`}
                            onClick={() => setViewMode('grid')}
                            title="Visualização em grade"
                        >
                            ▦
                        </button>
                    </div>

                    <button
                        className="btn btn-primary"
                        onClick={() => { resetForm(); setShowForm(!showForm); }}
                    >
                        {showForm ? '✕ Cancelar' : '+ Nova Conta'}
                    </button>
                </div>
            </header>

            {/* Total Net Worth Card */}
            <div className="glass-panel" style={{
                marginBottom: '2rem',
                padding: '2rem',
                background: 'var(--gradient-primary)',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                color: 'white'
            }}>
                <div>
                    <p style={{ opacity: 0.9, fontSize: '0.9rem', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.5rem' }}>Patrimônio Total Especial</p>
                    <h2 style={{ fontSize: '2.5rem', fontWeight: 800, margin: 0, color: 'white' }}>
                        {totalNetWorth.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                    </h2>
                </div>
                <div style={{ fontSize: '3rem', opacity: 0.3 }}>🏦</div>
            </div>

            {showForm && (
                <div className="glass-panel" style={{ marginBottom: '2rem' }}>
                    <h3 style={{ marginBottom: '1.5rem' }}>{editingId ? 'Editar Conta' : 'Nova Conta'}</h3>
                    <form onSubmit={handleSubmit} className="form">
                        <div className="form-row">
                            <div className="form-group" style={{ flex: 2 }}>
                                <label className="form-label">Nome da Conta</label>
                                <input
                                    type="text"
                                    className="form-input"
                                    value={formData.name}
                                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                    required
                                    placeholder="Ex: Banco Inter, Nubank..."
                                />
                            </div>

                            <div className="form-group">
                                <label className="form-label">Tipo</label>
                                <select
                                    className="form-input"
                                    value={formData.type}
                                    onChange={(e) => setFormData({ ...formData, type: e.target.value as AccountType })}
                                >
                                    <option value="Checking">Conta Corrente</option>
                                    <option value="Wallet">Carteira</option>
                                    <option value="Investment">Investimento</option>
                                </select>
                            </div>

                            <div className="form-group">
                                <label className="form-label">Saldo Inicial</label>
                                <input
                                    type="number"
                                    step="0.01"
                                    className="form-input"
                                    value={formData.initialBalance}
                                    onChange={(e) => setFormData({ ...formData, initialBalance: parseFloat(e.target.value) })}
                                    placeholder="0.00"
                                />
                            </div>
                        </div>

                        <div style={{ display: 'flex', gap: '1rem', marginTop: '1rem' }}>
                            <button type="submit" className="btn btn-primary">
                                {editingId ? 'Atualizar' : 'Salvar'} Conta
                            </button>
                            {editingId && (
                                <button type="button" className="btn btn-secondary" onClick={resetForm}>
                                    Cancelar Edição
                                </button>
                            )}
                        </div>
                    </form>
                </div>
            )}

            {viewMode === 'cards' ? (
                <div className="accounts-grid">
                    {accounts.length === 0 ? (
                        <div className="glass-panel">
                            <p className="empty-state">Nenhuma conta cadastrada. Crie sua primeira conta!</p>
                        </div>
                    ) : (
                        accounts.map(account => {
                            const currentBalance = accountBalances[account.id] || 0;
                            return (
                                <div key={account.id} className={`account-card glass-panel ${!account.isActive ? 'inactive' : ''}`}>
                                    <div className="account-header">
                                        <span className="account-icon">{getAccountIcon(account.type)}</span>
                                        <div className="account-info">
                                            <h3 className="account-name">{account.name}</h3>
                                            <p className="account-type">{getAccountTypeLabel(account.type)}</p>
                                        </div>
                                        <div className="account-status">
                                            <span className={`status-badge ${account.isActive ? 'active' : 'inactive'}`}>
                                                {account.isActive ? 'Ativa' : 'Inativa'}
                                            </span>
                                        </div>
                                    </div>
                                    <div className="account-balance" style={{
                                        backgroundColor: 'rgba(255,255,255,0.03)',
                                        border: '1px solid rgba(255,255,255,0.05)'
                                    }}>
                                        <div>
                                            <span className="balance-label">Saldo Atual</span>
                                            <div style={{
                                                fontSize: '1.75rem',
                                                fontWeight: 700,
                                                color: currentBalance >= 0 ? 'var(--color-success)' : 'var(--color-danger)'
                                            }}>
                                                {currentBalance.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                                            </div>
                                        </div>
                                    </div>
                                    <div style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)', marginBottom: '1rem', display: 'flex', justifyContent: 'space-between' }}>
                                        <span>Saldo inicial:</span>
                                        <span>{account.initialBalance.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</span>
                                    </div>
                                    <div className="account-actions">
                                        <button
                                            className="btn btn-text"
                                            onClick={() => handleEdit(account)}
                                            style={{ color: 'var(--color-text-secondary)', fontSize: '0.8rem' }}
                                        >
                                            ✏️ Editar
                                        </button>
                                        <button
                                            className={`btn btn-text ${account.isActive ? 'btn-deactivate' : 'btn-activate'}`}
                                            onClick={() => handleToggleStatus(account.id)}
                                            style={{ fontSize: '0.8rem' }}
                                        >
                                            {account.isActive ? '🔴 Desabilitar' : '🟢 Reativar'}
                                        </button>
                                    </div>
                                </div>
                            );
                        })
                    )}
                </div>
            ) : (
                <div className="accounts-table glass-panel">
                    {accounts.length === 0 ? (
                        <p className="empty-state">Nenhuma conta cadastrada. Crie sua primeira conta!</p>
                    ) : (
                        <table>
                            <thead>
                                <tr>
                                    <th>Conta</th>
                                    <th>Tipo</th>
                                    <th style={{ textAlign: 'right' }}>Saldo Atual</th>
                                    <th style={{ textAlign: 'right' }}>Saldo Inicial</th>
                                    <th style={{ textAlign: 'center' }}>Status</th>
                                    <th style={{ textAlign: 'right' }}>Ações</th>
                                </tr>
                            </thead>
                            <tbody>
                                {accounts.map(account => {
                                    const currentBalance = accountBalances[account.id] || 0;
                                    return (
                                        <tr key={account.id} className={!account.isActive ? 'inactive-row' : ''}>
                                            <td>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                                                    <span style={{ fontSize: '1.5rem' }}>{getAccountIcon(account.type)}</span>
                                                    <strong>{account.name}</strong>
                                                </div>
                                            </td>
                                            <td>{getAccountTypeLabel(account.type)}</td>
                                            <td style={{ textAlign: 'right' }}>
                                                <strong style={{ color: currentBalance >= 0 ? 'var(--color-success)' : 'var(--color-danger)' }}>
                                                    {currentBalance.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                                                </strong>
                                            </td>
                                            <td style={{ textAlign: 'right', opacity: 0.6 }}>
                                                {account.initialBalance.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                                            </td>
                                            <td style={{ textAlign: 'center' }}>
                                                <span className={`status-badge ${account.isActive ? 'active' : 'inactive'}`}>
                                                    {account.isActive ? 'Ativa' : 'Inativa'}
                                                </span>
                                            </td>
                                            <td>
                                                <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
                                                    <button className="btn-icon" onClick={() => handleEdit(account)}>✏️</button>
                                                    <button className="btn-icon" onClick={() => handleToggleStatus(account.id)}>
                                                        {account.isActive ? '🚫' : '✅'}
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    )}
                </div>
            )}
        </div>
    );
}
