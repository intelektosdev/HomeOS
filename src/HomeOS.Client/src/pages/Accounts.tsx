import { useEffect, useState } from 'react';
import { AccountsService } from '../services/api';
import type { AccountResponse, CreateAccountRequest, AccountType } from '../types';

type ViewMode = 'cards' | 'grid';

export function Accounts() {
    const [accounts, setAccounts] = useState<AccountResponse[]>([]);
    const [loading, setLoading] = useState(true);
    const [showForm, setShowForm] = useState(false);
    const [viewMode, setViewMode] = useState<ViewMode>('cards');
    const [formData, setFormData] = useState<CreateAccountRequest>({
        name: '',
        type: 'Checking',
        initialBalance: 0
    });

    const loadAccounts = async () => {
        try {
            const data = await AccountsService.getAll();
            setAccounts(data);
        } catch (error) {
            console.error('Erro ao carregar contas', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadAccounts();
    }, []);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            await AccountsService.create(formData);
            setFormData({ name: '', type: 'Checking', initialBalance: 0 });
            setShowForm(false);
            loadAccounts();
        } catch (error) {
            console.error('Erro ao criar conta', error);
        }
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

    if (loading) return <div className="page"><div className="loading">Carregando...</div></div>;

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
                        onClick={() => setShowForm(!showForm)}
                    >
                        {showForm ? '✕ Cancelar' : '+ Nova Conta'}
                    </button>
                </div>
            </header>

            {showForm && (
                <div className="glass-panel" style={{ marginBottom: '2rem' }}>
                    <h3 style={{ marginBottom: '1.5rem' }}>Nova Conta</h3>
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

                        <button type="submit" className="btn btn-primary" style={{ marginTop: '1rem' }}>
                            Salvar Conta
                        </button>
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
                        accounts.map(account => (
                            <div key={account.id} className={`account-card glass-panel ${!account.isActive ? 'inactive' : ''}`}>
                                <div className="account-header">
                                    <span className="account-icon">{getAccountIcon(account.type)}</span>
                                    <div className="account-info">
                                        <h3 className="account-name">{account.name}</h3>
                                        <p className="account-type">{getAccountTypeLabel(account.type)}</p>
                                    </div>
                                </div>
                                <div className="account-balance">
                                    <span className="balance-label">Saldo inicial</span>
                                    <span className="balance-value">
                                        R$ {account.initialBalance.toFixed(2)}
                                    </span>
                                </div>
                                <div className="account-actions">
                                    <button
                                        className={`btn-toggle ${account.isActive ? 'btn-deactivate' : 'btn-activate'}`}
                                        onClick={() => handleToggleStatus(account.id)}
                                    >
                                        {account.isActive ? '🔴 Desabilitar' : '🟢 Habilitar'}
                                    </button>
                                </div>
                            </div>
                        ))
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
                                    <th>Saldo Inicial</th>
                                    <th>Status</th>
                                    <th>Ações</th>
                                </tr>
                            </thead>
                            <tbody>
                                {accounts.map(account => (
                                    <tr key={account.id} className={!account.isActive ? 'inactive-row' : ''}>
                                        <td>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                                                <span style={{ fontSize: '1.5rem' }}>{getAccountIcon(account.type)}</span>
                                                <strong>{account.name}</strong>
                                            </div>
                                        </td>
                                        <td>{getAccountTypeLabel(account.type)}</td>
                                        <td>
                                            <span className="amount-value">R$ {account.initialBalance.toFixed(2)}</span>
                                        </td>
                                        <td>
                                            {account.isActive ? (
                                                <span className="status-badge active">✓ Ativa</span>
                                            ) : (
                                                <span className="status-badge inactive">✕ Inativa</span>
                                            )}
                                        </td>
                                        <td>
                                            <button
                                                className={`btn-toggle-small ${account.isActive ? 'btn-deactivate' : 'btn-activate'}`}
                                                onClick={() => handleToggleStatus(account.id)}
                                            >
                                                {account.isActive ? 'Desabilitar' : 'Habilitar'}
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    )}
                </div>
            )}
        </div>
    );
}
