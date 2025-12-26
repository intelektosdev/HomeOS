import { useEffect, useState } from 'react';
import { DebtsService } from '../services/api';
import type { Debt, DebtInstallment, CreateDebtRequest } from '../services/api';

type ViewMode = 'cards' | 'table';

export function Debts() {
    const [debts, setDebts] = useState<Debt[]>([]);
    const [loading, setLoading] = useState(true);
    const [showForm, setShowForm] = useState(false);
    const [viewMode, setViewMode] = useState<ViewMode>('cards');

    const [amortizationSchedule, setAmortizationSchedule] = useState<DebtInstallment[]>([]);
    const [showSchedule, setShowSchedule] = useState(false);
    const [statistics, setStatistics] = useState({ totalDebt: 0, activeDebtCount: 0 });

    const [formData, setFormData] = useState<CreateDebtRequest>({
        userId: localStorage.getItem('userId') || '22f4bd46-313d-424a-83b9-0c367ad46c3b',
        name: '',
        category: 'PersonalLoan',
        creditor: '',
        amount: 0,
        interestIsFixed: true,
        monthlyRate: 0,
        amortizationType: 'Price',
        totalInstallments: 12,
        startDate: new Date().toISOString().split('T')[0],
        generateSchedule: true
    });

    const loadDebts = async () => {
        try {
            const data = await DebtsService.getAll(false);
            setDebts(data);
            const stats = await DebtsService.getStatistics();
            setStatistics(stats);
        } catch (error) {
            console.error('Erro ao carregar dívidas', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadDebts();
    }, []);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        console.log('Submitting debt:', formData);

        try {
            const response = await DebtsService.create(formData);
            console.log('Debt created successfully:', response);
            alert('Dívida cadastrada com sucesso!');
            resetForm();
            loadDebts();
        } catch (error: any) {
            console.error('Erro ao criar dívida:', error);
            console.error('Response data:', error.response?.data);
            console.error('Response status:', error.response?.status);
            alert(`Erro ao criar dívida: ${error.response?.data?.error || error.message || 'Erro desconhecido'}`);
        }
    };

    const resetForm = () => {
        setFormData({
            userId: localStorage.getItem('userId') || '22f4bd46-313d-424a-83b9-0c367ad46c3b',
            name: '',
            category: 'PersonalLoan',
            creditor: '',
            amount: 0,
            interestIsFixed: true,
            monthlyRate: 0,
            amortizationType: 'Price',
            totalInstallments: 12,
            startDate: new Date().toISOString().split('T')[0],
            generateSchedule: true
        });
        setShowForm(false);
    };

    const handleViewSchedule = async (debtId: string) => {
        try {
            const schedule = await DebtsService.getAmortizationSchedule(debtId);
            setAmortizationSchedule(schedule);

            setShowSchedule(true);
        } catch (error) {
            console.error('Erro ao carregar tabela de amortização', error);
        }
    };

    const handleDelete = async (id: string) => {
        if (confirm('Deseja realmente excluir esta dívida?')) {
            try {
                await DebtsService.delete(id);
                loadDebts();
            } catch (error) {
                console.error('Erro ao excluir dívida', error);
            }
        }
    };

    const getCategoryLabel = (category: string) => {
        const labels: Record<string, string> = {
            'Mortgage': '🏠 Financiamento Imobiliário',
            'PersonalLoan': '💰 Empréstimo Pessoal',
            'CarLoan': '🚗 Financiamento de Veículo',
            'StudentLoan': '🎓 Financiamento Estudantil',
            'Other': '📋 Outros'
        };
        return labels[category] || category;
    };

    const getAmortizationLabel = (type: string) => {
        const labels: Record<string, string> = {
            'Price': 'Tabela Price',
            'SAC': 'SAC',
            'Bullet': 'Bullet',
            'Custom': 'Personalizado'
        };
        return labels[type] || type;
    };

    const formatCurrency = (value: number) => {
        return new Intl.NumberFormat('pt-BR', {
            style: 'currency',
            currency: 'BRL'
        }).format(value);
    };

    const calculateProgress = (debt: Debt) => {
        return (debt.installmentsPaid / debt.totalInstallments) * 100;
    };

    if (loading) return <div className="page"><div className="loading">Carregando...</div></div>;

    return (
        <div className="page">
            <header className="page-header">
                <div>
                    <h1 className="page-title">💳 Dívidas</h1>
                    <p className="page-description">Gerencie e acompanhe seus financiamentos e empréstimos</p>
                </div>
                <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
                    <div className="stats-summary">
                        <div className="stat-item">
                            <span className="stat-label">Dívidas Ativas</span>
                            <span className="stat-value">{statistics.activeDebtCount}</span>
                        </div>
                        <div className="stat-item">
                            <span className="stat-label">Saldo Devedor Total</span>
                            <span className="stat-value" style={{ color: '#f44336' }}>
                                {formatCurrency(statistics.totalDebt)}
                            </span>
                        </div>
                    </div>

                    <div className="view-toggle">
                        <button
                            className={`view-toggle-btn ${viewMode === 'cards' ? 'active' : ''}`}
                            onClick={() => setViewMode('cards')}
                            title="Visualização em cartões"
                        >
                            📇
                        </button>
                        <button
                            className={`view-toggle-btn ${viewMode === 'table' ? 'active' : ''}`}
                            onClick={() => setViewMode('table')}
                            title="Visualização em tabela"
                        >
                            ▦
                        </button>
                    </div>

                    <button
                        className="btn btn-primary"
                        onClick={() => { resetForm(); setShowForm(!showForm); }}
                    >
                        {showForm ? '✕ Cancelar' : '+ Nova Dívida'}
                    </button>
                </div>
            </header>

            {showForm && (
                <div className="glass-panel" style={{ marginBottom: '2rem' }}>
                    <h3 style={{ marginBottom: '1.5rem' }}>Nova Dívida</h3>
                    <form onSubmit={handleSubmit} className="form">
                        <div className="form-row">
                            <div className="form-group" style={{ flex: 2 }}>
                                <label className="form-label">Nome da Dívida</label>
                                <input
                                    type="text"
                                    className="form-input"
                                    value={formData.name}
                                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                    required
                                    placeholder="Ex: Financiamento Apartamento..."
                                />
                            </div>

                            <div className="form-group">
                                <label className="form-label">Categoria</label>
                                <select
                                    className="form-input"
                                    value={formData.category}
                                    onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                                >
                                    <option value="Mortgage">Financiamento Imobiliário</option>
                                    <option value="PersonalLoan">Empréstimo Pessoal</option>
                                    <option value="CarLoan">Financiamento de Veículo</option>
                                    <option value="StudentLoan">Financiamento Estudantil</option>
                                    <option value="Other">Outros</option>
                                </select>
                            </div>

                            <div className="form-group">
                                <label className="form-label">Credor</label>
                                <input
                                    type="text"
                                    className="form-input"
                                    value={formData.creditor}
                                    onChange={(e) => setFormData({ ...formData, creditor: e.target.value })}
                                    required
                                    placeholder="Banco/Financeira"
                                />
                            </div>
                        </div>

                        <div className="form-row">
                            <div className="form-group">
                                <label className="form-label">Valor Total</label>
                                <input
                                    type="number"
                                    step="0.01"
                                    className="form-input"
                                    value={formData.amount}
                                    onChange={(e) => setFormData({ ...formData, amount: parseFloat(e.target.value) })}
                                    required
                                    placeholder="0.00"
                                />
                            </div>

                            <div className="form-group">
                                <label className="form-label">Taxa Mensal (%)</label>
                                <input
                                    type="number"
                                    step="0.01"
                                    className="form-input"
                                    value={formData.monthlyRate * 100}
                                    onChange={(e) => setFormData({ ...formData, monthlyRate: parseFloat(e.target.value) / 100 })}
                                    required
                                    placeholder="0.75"
                                />
                            </div>

                            <div className="form-group">
                                <label className="form-label">Sistema de Amortização</label>
                                <select
                                    className="form-input"
                                    value={formData.amortizationType}
                                    onChange={(e) => setFormData({ ...formData, amortizationType: e.target.value })}
                                >
                                    <option value="Price">Tabela Price (Parcelas Fixas)</option>
                                    <option value="SAC">SAC (Amortização Constante)</option>
                                    <option value="Bullet">Bullet (Pagamento único)</option>
                                </select>
                            </div>

                            <div className="form-group">
                                <label className="form-label">Parcelas</label>
                                <input
                                    type="number"
                                    className="form-input"
                                    value={formData.totalInstallments}
                                    onChange={(e) => setFormData({ ...formData, totalInstallments: parseInt(e.target.value) })}
                                    required
                                    min="1"
                                />
                            </div>

                            <div className="form-group">
                                <label className="form-label">Data de Início</label>
                                <input
                                    type="date"
                                    className="form-input"
                                    value={formData.startDate}
                                    onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                                    required
                                />
                            </div>
                        </div>

                        <div style={{ display: 'flex', gap: '1rem', marginTop: '1rem' }}>
                            <button type="submit" className="btn btn-primary">
                                Cadastrar Dívida
                            </button>
                            <button type="button" className="btn btn-secondary" onClick={resetForm}>
                                Cancelar
                            </button>
                        </div>
                    </form>
                </div>
            )}

            {viewMode === 'cards' ? (
                <div className="accounts-grid">
                    {debts.length === 0 ? (
                        <div className="glass-panel">
                            <p className="empty-state">Nenhuma dívida cadastrada. Cadastre seu primeiro financiamento!</p>
                        </div>
                    ) : (
                        debts.map(debt => (
                            <div key={debt.id} className="account-card glass-panel">
                                <div className="account-header">
                                    <span className="account-icon" style={{ fontSize: '2rem' }}>
                                        {getCategoryLabel(debt.category).split(' ')[0]}
                                    </span>
                                    <div className="account-info">
                                        <h3 className="account-name">{debt.name}</h3>
                                        <p className="account-type">{debt.creditor}</p>
                                        <small style={{ opacity: 0.7 }}>
                                            {getAmortizationLabel(debt.amortizationType)}
                                        </small>
                                    </div>
                                </div>

                                <div style={{ margin: '1rem 0' }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                                        <span style={{ fontSize: '0.9rem', opacity: 0.8 }}>Progresso</span>
                                        <span style={{ fontSize: '0.9rem', fontWeight: 'bold' }}>
                                            {debt.installmentsPaid}/{debt.totalInstallments}
                                        </span>
                                    </div>
                                    <div style={{
                                        width: '100%',
                                        height: '8px',
                                        background: 'rgba(255,255,255,0.1)',
                                        borderRadius: '4px',
                                        overflow: 'hidden'
                                    }}>
                                        <div style={{
                                            width: `${calculateProgress(debt)}%`,
                                            height: '100%',
                                            background: 'linear-gradient(90deg, #4CAF50, #8BC34A)',
                                            transition: 'width 0.3s'
                                        }} />
                                    </div>
                                </div>

                                <div className="account-balance">
                                    <div>
                                        <span className="balance-label">Valor Original</span>
                                        <span className="balance-value">{formatCurrency(debt.originalAmount)}</span>
                                    </div>
                                    <div>
                                        <span className="balance-label">Saldo Devedor</span>
                                        <span className="balance-value" style={{ color: '#f44336' }}>
                                            {formatCurrency(debt.currentBalance)}
                                        </span>
                                    </div>
                                </div>

                                <div className="account-actions">
                                    <button
                                        className="btn-edit"
                                        onClick={() => handleViewSchedule(debt.id)}
                                        title="Ver tabela de amortização"
                                    >
                                        📊 Tabela
                                    </button>
                                    <button
                                        className="btn-toggle btn-deactivate"
                                        onClick={() => handleDelete(debt.id)}
                                    >
                                        🗑️ Excluir
                                    </button>
                                </div>
                            </div>
                        ))
                    )}
                </div>
            ) : (
                <div className="accounts-table glass-panel">
                    {debts.length === 0 ? (
                        <p className="empty-state">Nenhuma dívida cadastrada.</p>
                    ) : (
                        <table>
                            <thead>
                                <tr>
                                    <th>Dívida</th>
                                    <th>Credor</th>
                                    <th>Valor Original</th>
                                    <th>Saldo Devedor</th>
                                    <th>Progresso</th>
                                    <th>Ações</th>
                                </tr>
                            </thead>
                            <tbody>
                                {debts.map(debt => (
                                    <tr key={debt.id}>
                                        <td>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                                                <strong>{debt.name}</strong>
                                            </div>
                                        </td>
                                        <td>{debt.creditor}</td>
                                        <td>
                                            <span className="amount-value">{formatCurrency(debt.originalAmount)}</span>
                                        </td>
                                        <td>
                                            <span className="amount-value" style={{ color: '#f44336' }}>
                                                {formatCurrency(debt.currentBalance)}
                                            </span>
                                        </td>
                                        <td>
                                            <span style={{ fontSize: '0.9rem' }}>
                                                {debt.installmentsPaid}/{debt.totalInstallments} ({Math.round(calculateProgress(debt))}%)
                                            </span>
                                        </td>
                                        <td>
                                            <div style={{ display: 'flex', gap: '0.5rem' }}>
                                                <button
                                                    className="btn-toggle-small"
                                                    onClick={() => handleViewSchedule(debt.id)}
                                                    title="Ver tabela"
                                                >
                                                    📊
                                                </button>
                                                <button
                                                    className="btn-toggle-small btn-deactivate"
                                                    onClick={() => handleDelete(debt.id)}
                                                    title="Excluir"
                                                >
                                                    🗑️
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    )}
                </div>
            )}

            {/* Modal de Tabela de Amortização */}
            {showSchedule && (
                <div className="modal-overlay" onClick={() => setShowSchedule(false)}>
                    <div className="modal-content glass-panel" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '1000px' }}>
                        <div className="modal-header">
                            <h2>📊 Tabela de Amortização</h2>
                            <button className="modal-close" onClick={() => setShowSchedule(false)}>✕</button>
                        </div>
                        <div style={{ overflowX: 'auto', maxHeight: '500px' }}>
                            <table>
                                <thead>
                                    <tr>
                                        <th>#</th>
                                        <th>Vencimento</th>
                                        <th>Parcela Total</th>
                                        <th>Amortização</th>
                                        <th>Juros</th>
                                        <th>Saldo Restante</th>
                                        <th>Status</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {amortizationSchedule.map((installment) => (
                                        <tr key={installment.id} style={{ opacity: installment.paidDate ? 0.6 : 1 }}>
                                            <td>{installment.installmentNumber}</td>
                                            <td>{new Date(installment.dueDate).toLocaleDateString('pt-BR')}</td>
                                            <td>{formatCurrency(installment.totalAmount)}</td>
                                            <td>{formatCurrency(installment.principalAmount)}</td>
                                            <td style={{ color: '#ff9800' }}>{formatCurrency(installment.interestAmount)}</td>
                                            <td>{formatCurrency(installment.remainingBalance)}</td>
                                            <td>
                                                {installment.paidDate ? (
                                                    <span className="status-badge active">✓ Paga</span>
                                                ) : (
                                                    <span className="status-badge inactive">Pendente</span>
                                                )}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
