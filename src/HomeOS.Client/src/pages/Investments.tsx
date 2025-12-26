import { useEffect, useState } from 'react';
import { InvestmentsService } from '../services/api';
import type { Investment, CreateInvestmentRequest, InvestmentPerformance, PortfolioSummary } from '../services/api';

type ViewMode = 'cards' | 'table';

export function Investments() {
    const [investments, setInvestments] = useState<Investment[]>([]);
    const [loading, setLoading] = useState(true);
    const [showForm, setShowForm] = useState(false);
    const [viewMode, setViewMode] = useState<ViewMode>('cards');
    const [portfolio, setPortfolio] = useState<PortfolioSummary | null>(null);
    const [selectedInvestment, setSelectedInvestment] = useState<string | null>(null);
    const [performance, setPerformance] = useState<InvestmentPerformance | null>(null);
    const [showPerformance, setShowPerformance] = useState(false);

    const [formData, setFormData] = useState<CreateInvestmentRequest>({
        userId: localStorage.getItem('userId') || '22f4bd46-313d-424a-83b9-0c367ad46c3b',
        name: '',
        type: 'Stock',
        initialAmount: 0,
        quantity: 0,
        unitPrice: 0,
        investmentDate: new Date().toISOString().split('T')[0]
    });

    const loadInvestments = async () => {
        try {
            const data = await InvestmentsService.getAll(false);
            setInvestments(data);
            const portfolioData = await InvestmentsService.getPortfolio();
            setPortfolio(portfolioData);
        } catch (error) {
            console.error('Erro ao carregar investimentos', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadInvestments();
    }, []);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        console.log('Submitting investment:', formData);

        try {
            // Calcula o initialAmount baseado em quantity e unitPrice
            const dataToSend = {
                ...formData,
                initialAmount: formData.quantity * formData.unitPrice
            };
            console.log('Data to send:', dataToSend);

            const response = await InvestmentsService.create(dataToSend);
            console.log('Investment created successfully:', response);
            alert('Investimento cadastrado com sucesso!');
            resetForm();
            loadInvestments();
        } catch (error: any) {
            console.error('Erro ao criar investimento:', error);
            console.error('Response data:', error.response?.data);
            console.error('Response status:', error.response?.status);
            alert(`Erro ao criar investimento: ${error.response?.data?.error || error.message || 'Erro desconhecido'}`);
        }
    };

    const resetForm = () => {
        setFormData({
            userId: localStorage.getItem('userId') || '22f4bd46-313d-424a-83b9-0c367ad46c3b',
            name: '',
            type: 'Stock',
            initialAmount: 0,
            quantity: 0,
            unitPrice: 0,
            investmentDate: new Date().toISOString().split('T')[0]
        });
        setShowForm(false);
    };

    const handleViewPerformance = async (investmentId: string) => {
        try {
            const perf = await InvestmentsService.getPerformance(investmentId);
            setPerformance(perf);
            setSelectedInvestment(investmentId);
            setShowPerformance(true);
        } catch (error) {
            console.error('Erro ao carregar performance', error);
        }
    };

    const handleDelete = async (id: string) => {
        if (confirm('Deseja realmente excluir este investimento?')) {
            try {
                await InvestmentsService.delete(id);
                loadInvestments();
            } catch (error) {
                console.error('Erro ao excluir investimento', error);
            }
        }
    };

    const getTypeLabel = (type: string) => {
        const labels: Record<string, string> = {
            'Stock': '📈 Ações',
            'FixedIncome': '💰 Renda Fixa',
            'RealEstate': '🏢 Imóveis',
            'Cryptocurrency': '₿ Criptomoedas',
            'Other': '📊 Outros'
        };
        return labels[type] || type;
    };

    const getTypeIcon = (type: string) => {
        const icons: Record<string, string> = {
            'Stock': '📈',
            'FixedIncome': '💰',
            'RealEstate': '🏢',
            'Cryptocurrency': '₿',
            'Other': '📊'
        };
        return icons[type] || '📊';
    };

    const formatCurrency = (value: number) => {
        return new Intl.NumberFormat('pt-BR', {
            style: 'currency',
            currency: 'BRL'
        }).format(value);
    };

    const formatPercentage = (value: number) => {
        const color = value >= 0 ? '#4CAF50' : '#f44336';
        const sign = value >= 0 ? '+' : '';
        return (
            <span style={{ color, fontWeight: 'bold' }}>
                {sign}{value.toFixed(2)}%
            </span>
        );
    };

    const calculateCurrentValue = (inv: Investment) => {
        return inv.currentPrice * inv.currentQuantity;
    };

    const calculateReturn = (inv: Investment) => {
        return calculateCurrentValue(inv) - inv.initialAmount;
    };

    const calculateReturnPercentage = (inv: Investment) => {
        if (inv.initialAmount === 0) return 0;
        return (calculateReturn(inv) / inv.initialAmount) * 100;
    };

    if (loading) return <div className="page"><div className="loading">Carregando...</div></div>;

    return (
        <div className="page">
            <header className="page-header">
                <div>
                    <h1 className="page-title">📈 Investimentos</h1>
                    <p className="page-description">Acompanhe sua carteira e rentabilidade</p>
                </div>
                <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
                    {portfolio && (
                        <div className="stats-summary">
                            <div className="stat-item">
                                <span className="stat-label">Total Investido</span>
                                <span className="stat-value">{formatCurrency(portfolio.summary.totalInvested)}</span>
                            </div>
                            <div className="stat-item">
                                <span className="stat-label">Valor Atual</span>
                                <span className="stat-value" style={{ color: '#4CAF50' }}>
                                    {formatCurrency(portfolio.summary.currentValue)}
                                </span>
                            </div>
                            <div className="stat-item">
                                <span className="stat-label">Rentabilidade</span>
                                <span className="stat-value">
                                    {formatPercentage(
                                        portfolio.summary.totalInvested > 0
                                            ? (portfolio.summary.totalReturn / portfolio.summary.totalInvested) * 100
                                            : 0
                                    )}
                                </span>
                            </div>
                        </div>
                    )}

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
                        {showForm ? '✕ Cancelar' : '+ Novo Investimento'}
                    </button>
                </div>
            </header>

            {showForm && (
                <div className="glass-panel" style={{ marginBottom: '2rem' }}>
                    <h3 style={{ marginBottom: '1.5rem' }}>Novo Investimento</h3>
                    <form onSubmit={handleSubmit} className="form">
                        <div className="form-row">
                            <div className="form-group" style={{ flex: 2 }}>
                                <label className="form-label">Nome do Investimento</label>
                                <input
                                    type="text"
                                    className="form-input"
                                    value={formData.name}
                                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                    required
                                    placeholder="Ex: PETR4, CDB Banco X..."
                                />
                            </div>

                            <div className="form-group">
                                <label className="form-label">Tipo</label>
                                <select
                                    className="form-input"
                                    value={formData.type}
                                    onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                                >
                                    <option value="Stock">Ações</option>
                                    <option value="FixedIncome">Renda Fixa</option>
                                    <option value="RealEstate">Imóveis</option>
                                    <option value="Cryptocurrency">Criptomoedas</option>
                                    <option value="Other">Outros</option>
                                </select>
                            </div>
                        </div>

                        {formData.type === 'Stock' && (
                            <div className="form-row">
                                <div className="form-group">
                                    <label className="form-label">Ticker</label>
                                    <input
                                        type="text"
                                        className="form-input"
                                        value={formData.ticker || ''}
                                        onChange={(e) => setFormData({ ...formData, ticker: e.target.value })}
                                        placeholder="Ex: PETR4, VALE3..."
                                    />
                                </div>
                            </div>
                        )}

                        {formData.type === 'FixedIncome' && (
                            <div className="form-row">
                                <div className="form-group">
                                    <label className="form-label">Subtipo</label>
                                    <select
                                        className="form-input"
                                        value={formData.fixedIncomeSubType || 'CDB'}
                                        onChange={(e) => setFormData({ ...formData, fixedIncomeSubType: e.target.value })}
                                    >
                                        <option value="CDB">CDB</option>
                                        <option value="LCI">LCI</option>
                                        <option value="LCA">LCA</option>
                                        <option value="TesouroDireto">Tesouro Direto</option>
                                    </select>
                                </div>
                                {formData.fixedIncomeSubType === 'CDB' && (
                                    <div className="form-group">
                                        <label className="form-label">Banco</label>
                                        <input
                                            type="text"
                                            className="form-input"
                                            value={formData.bank || ''}
                                            onChange={(e) => setFormData({ ...formData, bank: e.target.value })}
                                            placeholder="Nome do banco"
                                        />
                                    </div>
                                )}
                            </div>
                        )}

                        <div className="form-row">
                            <div className="form-group">
                                <label className="form-label">Quantidade</label>
                                <input
                                    type="number"
                                    step="0.000001"
                                    className="form-input"
                                    value={formData.quantity}
                                    onChange={(e) => setFormData({ ...formData, quantity: parseFloat(e.target.value) })}
                                    required
                                    placeholder="0"
                                />
                            </div>

                            <div className="form-group">
                                <label className="form-label">Preço Unitário (R$)</label>
                                <input
                                    type="number"
                                    step="0.01"
                                    className="form-input"
                                    value={formData.unitPrice}
                                    onChange={(e) => setFormData({ ...formData, unitPrice: parseFloat(e.target.value) })}
                                    required
                                    placeholder="0.00"
                                />
                            </div>

                            <div className="form-group">
                                <label className="form-label">Valor Total</label>
                                <input
                                    type="number"
                                    step="0.01"
                                    className="form-input"
                                    value={(formData.quantity * formData.unitPrice) || 0}
                                    onChange={(e) => setFormData({ ...formData, initialAmount: parseFloat(e.target.value) })}
                                    readOnly
                                    style={{ background: 'rgba(255,255,255,0.05)' }}
                                />
                            </div>

                            <div className="form-group">
                                <label className="form-label">Data do Investimento</label>
                                <input
                                    type="date"
                                    className="form-input"
                                    value={formData.investmentDate}
                                    onChange={(e) => setFormData({ ...formData, investmentDate: e.target.value })}
                                    required
                                />
                            </div>
                        </div>

                        <div style={{ display: 'flex', gap: '1rem', marginTop: '1rem' }}>
                            <button type="submit" className="btn btn-primary">
                                Cadastrar Investimento
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
                    {investments.length === 0 ? (
                        <div className="glass-panel">
                            <p className="empty-state">Nenhum investimento cadastrado. Cadastre seu primeiro investimento!</p>
                        </div>
                    ) : (
                        investments.map(inv => (
                            <div key={inv.id} className="account-card glass-panel">
                                <div className="account-header">
                                    <span className="account-icon" style={{ fontSize: '2rem' }}>
                                        {getTypeIcon(inv.type)}
                                    </span>
                                    <div className="account-info">
                                        <h3 className="account-name">{inv.name}</h3>
                                        <p className="account-type">{getTypeLabel(inv.type)}</p>
                                        <small style={{ opacity: 0.7 }}>
                                            {new Date(inv.investmentDate).toLocaleDateString('pt-BR')}
                                        </small>
                                    </div>
                                </div>

                                <div className="account-balance">
                                    <div>
                                        <span className="balance-label">Investido</span>
                                        <span className="balance-value">{formatCurrency(inv.initialAmount)}</span>
                                    </div>
                                    <div>
                                        <span className="balance-label">Valor Atual</span>
                                        <span className="balance-value" style={{ color: '#4CAF50' }}>
                                            {formatCurrency(calculateCurrentValue(inv))}
                                        </span>
                                    </div>
                                </div>

                                <div style={{ marginTop: '1rem', padding: '1rem', background: 'rgba(255,255,255,0.05)', borderRadius: '8px' }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                                        <span style={{ fontSize: '0.9rem', opacity: 0.8 }}>Rentabilidade</span>
                                        <span>{formatPercentage(calculateReturnPercentage(inv))}</span>
                                    </div>
                                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                        <span style={{ fontSize: '0.9rem', opacity: 0.8 }}>Lucro/Prejuízo</span>
                                        <span style={{
                                            color: calculateReturn(inv) >= 0 ? '#4CAF50' : '#f44336',
                                            fontWeight: 'bold'
                                        }}>
                                            {formatCurrency(calculateReturn(inv))}
                                        </span>
                                    </div>
                                </div>

                                <div className="account-actions">
                                    <button
                                        className="btn-edit"
                                        onClick={() => handleViewPerformance(inv.id)}
                                        title="Ver performance detalhada"
                                    >
                                        📊 Performance
                                    </button>
                                    <button
                                        className="btn-toggle btn-deactivate"
                                        onClick={() => handleDelete(inv.id)}
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
                    {investments.length === 0 ? (
                        <p className="empty-state">Nenhum investimento cadastrado.</p>
                    ) : (
                        <table>
                            <thead>
                                <tr>
                                    <th>Investimento</th>
                                    <th>Tipo</th>
                                    <th>Investido</th>
                                    <th>Valor Atual</th>
                                    <th>Rentabilidade</th>
                                    <th>Ações</th>
                                </tr>
                            </thead>
                            <tbody>
                                {investments.map(inv => (
                                    <tr key={inv.id}>
                                        <td>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                                                <span style={{ fontSize: '1.5rem' }}>{getTypeIcon(inv.type)}</span>
                                                <strong>{inv.name}</strong>
                                            </div>
                                        </td>
                                        <td>{getTypeLabel(inv.type)}</td>
                                        <td>
                                            <span className="amount-value">{formatCurrency(inv.initialAmount)}</span>
                                        </td>
                                        <td>
                                            <span className="amount-value" style={{ color: '#4CAF50' }}>
                                                {formatCurrency(calculateCurrentValue(inv))}
                                            </span>
                                        </td>
                                        <td>{formatPercentage(calculateReturnPercentage(inv))}</td>
                                        <td>
                                            <div style={{ display: 'flex', gap: '0.5rem' }}>
                                                <button
                                                    className="btn-toggle-small"
                                                    onClick={() => handleViewPerformance(inv.id)}
                                                    title="Ver performance"
                                                >
                                                    📊
                                                </button>
                                                <button
                                                    className="btn-toggle-small btn-deactivate"
                                                    onClick={() => handleDelete(inv.id)}
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

            {/* Modal de Performance Detalhada */}
            {showPerformance && performance && (
                <div className="modal-overlay" onClick={() => setShowPerformance(false)}>
                    <div className="modal-content glass-panel" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '600px' }}>
                        <div className="modal-header">
                            <h2>📊 Performance Detalhada</h2>
                            <button className="modal-close" onClick={() => setShowPerformance(false)}>✕</button>
                        </div>
                        <div style={{ padding: '1rem' }}>
                            <div style={{ display: 'grid', gap: '1.5rem' }}>
                                <div style={{ padding: '1rem', background: 'rgba(255,255,255,0.05)', borderRadius: '8px' }}>
                                    <span style={{ fontSize: '0.9rem', opacity: 0.8 }}>Valor Atual</span>
                                    <h2 style={{ color: '#4CAF50', margin: '0.5rem 0' }}>
                                        {formatCurrency(performance.currentValue)}
                                    </h2>
                                </div>

                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                                    <div>
                                        <span style={{ fontSize: '0.9rem', opacity: 0.8 }}>Retorno Total</span>
                                        <h3 style={{
                                            color: performance.totalReturn >= 0 ? '#4CAF50' : '#f44336',
                                            marginTop: '0.5rem'
                                        }}>
                                            {formatCurrency(performance.totalReturn)}
                                        </h3>
                                    </div>
                                    <div>
                                        <span style={{ fontSize: '0.9rem', opacity: 0.8 }}>Rentabilidade</span>
                                        <h3 style={{ marginTop: '0.5rem' }}>
                                            {formatPercentage(performance.returnPercentage)}
                                        </h3>
                                    </div>
                                </div>

                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                                    <div>
                                        <span style={{ fontSize: '0.9rem', opacity: 0.8 }}>Rent. Anualizada</span>
                                        <h3 style={{ marginTop: '0.5rem' }}>
                                            {formatPercentage(performance.annualizedReturn)}
                                        </h3>
                                    </div>
                                    <div>
                                        <span style={{ fontSize: '0.9rem', opacity: 0.8 }}>Dias Investidos</span>
                                        <h3 style={{ marginTop: '0.5rem' }}>
                                            {performance.daysInvested} dias
                                        </h3>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
