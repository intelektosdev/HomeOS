import { useState, useEffect } from 'react';
import { TransfersService, AccountsService } from '../services/api';
import type { TransferResponse, AccountResponse, CreateTransferRequest } from '../types';

export default function Transfers() {
    const [transfers, setTransfers] = useState<TransferResponse[]>([]);
    const [accounts, setAccounts] = useState<AccountResponse[]>([]);
    const [loading, setLoading] = useState(true);
    const [showForm, setShowForm] = useState(false);

    const [formData, setFormData] = useState<CreateTransferRequest>({
        fromAccountId: '',
        toAccountId: '',
        amount: 0,
        description: '',
        transferDate: new Date().toISOString().split('T')[0]
    });

    const loadData = async () => {
        try {
            const [transfersData, accountsData] = await Promise.all([
                TransfersService.getAll(),
                AccountsService.getAll()
            ]);
            setTransfers(transfersData);
            setAccounts(accountsData.filter(a => a.isActive));
            setLoading(false);
        } catch (error) {
            console.error('Erro ao carregar dados:', error);
            setLoading(false);
        }
    };

    useEffect(() => {
        loadData();
    }, []);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            await TransfersService.create(formData);
            setShowForm(false);
            setFormData({
                fromAccountId: '',
                toAccountId: '',
                amount: 0,
                description: '',
                transferDate: new Date().toISOString().split('T')[0]
            });
            loadData();
        } catch (error: any) {
            console.error('Erro ao criar transferência:', error);
            alert(error.response?.data?.error || 'Erro ao criar transferência');
        }
    };

    const getAccountName = (id: string) => {
        return accounts.find(a => a.id === id)?.name || 'Conta desconhecida';
    };

    const handleComplete = async (id: string) => {
        try {
            await TransfersService.complete(id);
            loadData();
        } catch (error: any) {
            alert(error.response?.data?.error || 'Erro ao completar transferência');
        }
    };

    const handleDelete = async (id: string) => {
        if (confirm('Deseja realmente excluir esta transferência?')) {
            try {
                await TransfersService.delete(id);
                loadData();
            } catch (error) {
                alert('Erro ao excluir transferência');
            }
        }
    };

    if (loading) return <div style={{ padding: '2rem' }}>Carregando...</div>;

    return (
        <div style={{ padding: '2rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
                <h1>Transferências Entre Contas</h1>
                <button className="btn btn-primary" onClick={() => setShowForm(!showForm)}>
                    {showForm ? 'Cancelar' : '+ Nova Transferência'}
                </button>
            </div>

            {showForm && (
                <div className="glass-panel" style={{ marginBottom: '2rem', padding: '2rem' }}>
                    <h2 style={{ marginBottom: '1.5rem' }}>Nova Transferência</h2>
                    <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                            <div>
                                <label className="form-label">Conta de Origem</label>
                                <select
                                    className="form-input"
                                    value={formData.fromAccountId}
                                    onChange={e => setFormData({ ...formData, fromAccountId: e.target.value })}
                                    required
                                >
                                    <option value="">Selecione...</option>
                                    {accounts.map(a => (
                                        <option key={a.id} value={a.id}>{a.name}</option>
                                    ))}
                                </select>
                            </div>
                            <div>
                                <label className="form-label">Conta de Destino</label>
                                <select
                                    className="form-input"
                                    value={formData.toAccountId}
                                    onChange={e => setFormData({ ...formData, toAccountId: e.target.value })}
                                    required
                                >
                                    <option value="">Selecione...</option>
                                    {accounts.filter(a => a.id !== formData.fromAccountId).map(a => (
                                        <option key={a.id} value={a.id}>{a.name}</option>
                                    ))}
                                </select>
                            </div>
                        </div>

                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                            <div>
                                <label className="form-label">Valor</label>
                                <input
                                    type="number"
                                    step="0.01"
                                    className="form-input"
                                    value={formData.amount}
                                    onChange={e => setFormData({ ...formData, amount: parseFloat(e.target.value) })}
                                    required
                                />
                            </div>
                            <div>
                                <label className="form-label">Data</label>
                                <input
                                    type="date"
                                    className="form-input"
                                    value={formData.transferDate}
                                    onChange={e => setFormData({ ...formData, transferDate: e.target.value })}
                                    required
                                />
                            </div>
                        </div>

                        <div>
                            <label className="form-label">Descrição</label>
                            <input
                                type="text"
                                className="form-input"
                                value={formData.description}
                                onChange={e => setFormData({ ...formData, description: e.target.value })}
                                placeholder="Ex: Remanejamento de fundos"
                                required
                            />
                        </div>

                        <button type="submit" className="btn btn-primary">Criar Transferência</button>
                    </form>
                </div>
            )}

            <div className="glass-panel" style={{ padding: '2rem' }}>
                <h2 style={{ marginBottom: '1.5rem' }}>Histórico de Transferências</h2>
                {transfers.length === 0 ? (
                    <p style={{ color: 'var(--color-text-tertiary)' }}>Nenhuma transferência encontrada</p>
                ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                        {transfers.map(transfer => (
                            <div key={transfer.id} className="glass-panel" style={{ padding: '1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <div style={{ flex: 1 }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '0.5rem' }}>
                                        <span style={{ fontSize: '1.1rem', fontWeight: 600 }}>
                                            {getAccountName(transfer.fromAccountId)}
                                        </span>
                                        <span style={{ fontSize: '1.2rem', color: 'var(--color-primary)' }}>→</span>
                                        <span style={{ fontSize: '1.1rem', fontWeight: 600 }}>
                                            {getAccountName(transfer.toAccountId)}
                                        </span>
                                    </div>
                                    <div style={{ color: 'var(--color-text-secondary)', fontSize: '0.9rem' }}>
                                        {transfer.description}
                                    </div>
                                    <div style={{ color: 'var(--color-text-tertiary)', fontSize: '0.85rem', marginTop: '0.25rem' }}>
                                        {new Date(transfer.transferDate).toLocaleDateString('pt-BR')}
                                    </div>
                                </div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                                    <span style={{ fontSize: '1.3rem', fontWeight: 700, color: 'var(--color-primary)' }}>
                                        {transfer.amount.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                                    </span>
                                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                                        {transfer.status === 'Pending' && (
                                            <button
                                                className="btn btn-sm btn-success"
                                                onClick={() => handleComplete(transfer.id)}
                                                title="Completar transferência"
                                            >
                                                ✓
                                            </button>
                                        )}
                                        <span style={{
                                            padding: '0.25rem 0.75rem',
                                            borderRadius: 'var(--radius-sm)',
                                            fontSize: '0.85rem',
                                            background: transfer.status === 'Completed' ? 'rgba(34, 197, 94, 0.2)' :
                                                transfer.status === 'Cancelled' ? 'rgba(239, 68, 68, 0.2)' :
                                                    'rgba(234, 179, 8, 0.2)',
                                            color: transfer.status === 'Completed' ? '#22c55e' :
                                                transfer.status === 'Cancelled' ? '#ef4444' : '#eab308'
                                        }}>
                                            {transfer.status === 'Pending' ? 'Pendente' :
                                                transfer.status === 'Completed' ? 'Concluído' : 'Cancelado'}
                                        </span>
                                        <button
                                            className="btn btn-sm btn-danger"
                                            onClick={() => handleDelete(transfer.id)}
                                            title="Excluir transferência"
                                        >
                                            🗑️
                                        </button>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}
