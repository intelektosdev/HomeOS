import { useEffect, useState } from 'react';
import { CreditCardsService } from '../services/api';
import type { CreditCardResponse, CreateCreditCardRequest } from '../types';

type ViewMode = 'cards' | 'grid';

export function CreditCards() {
    const [creditCards, setCreditCards] = useState<CreditCardResponse[]>([]);
    const [loading, setLoading] = useState(true);
    const [showForm, setShowForm] = useState(false);
    const [viewMode, setViewMode] = useState<ViewMode>('cards');
    const [formData, setFormData] = useState<CreateCreditCardRequest>({
        name: '',
        closingDay: 1,
        dueDay: 10,
        limit: 0
    });
    const [editingId, setEditingId] = useState<string | null>(null);

    const loadCreditCards = async () => {
        try {
            const data = await CreditCardsService.getAll();
            setCreditCards(data);
        } catch (error) {
            console.error('Erro ao carregar cartões', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadCreditCards();
    }, []);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            if (editingId) {
                await CreditCardsService.update(editingId, formData);
            } else {
                await CreditCardsService.create(formData);
            }
            resetForm();
            loadCreditCards();
        } catch (error) {
            console.error('Erro ao salvar cartão', error);
        }
    };

    const resetForm = () => {
        setFormData({ name: '', closingDay: 1, dueDay: 10, limit: 0 });
        setEditingId(null);
        setShowForm(false);
    };

    const handleEdit = (card: CreditCardResponse) => {
        setFormData({
            name: card.name,
            closingDay: card.closingDay,
            dueDay: card.dueDay,
            limit: card.limit
        });
        setEditingId(card.id);
        setShowForm(true);
    };

    if (loading) return <div className="page"><div className="loading">Carregando...</div></div>;

    return (
        <div className="page">
            <header className="page-header">
                <div>
                    <h1 className="page-title">Cartões de Crédito</h1>
                    <p className="page-description">Gerencie seus cartões de crédito</p>
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
                        {showForm ? '✕ Cancelar' : '+ Novo Cartão'}
                    </button>
                </div>
            </header>

            {showForm && (
                <div className="glass-panel" style={{ marginBottom: '2rem' }}>
                    <h3 style={{ marginBottom: '1.5rem' }}>{editingId ? 'Editar Cartão' : 'Novo Cartão'}</h3>
                    <form onSubmit={handleSubmit} className="form">
                        <div className="form-row">
                            <div className="form-group" style={{ flex: 2 }}>
                                <label className="form-label">Nome do Cartão</label>
                                <input
                                    type="text"
                                    className="form-input"
                                    value={formData.name}
                                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                    required
                                    placeholder="Ex: Nubank Roxo, Itaú Gold..."
                                />
                            </div>

                            <div className="form-group">
                                <label className="form-label">Dia do Fechamento</label>
                                <input
                                    type="number"
                                    min="1"
                                    max="31"
                                    className="form-input"
                                    value={formData.closingDay}
                                    onChange={(e) => setFormData({ ...formData, closingDay: parseInt(e.target.value) })}
                                    required
                                />
                            </div>

                            <div className="form-group">
                                <label className="form-label">Dia do Vencimento</label>
                                <input
                                    type="number"
                                    min="1"
                                    max="31"
                                    className="form-input"
                                    value={formData.dueDay}
                                    onChange={(e) => setFormData({ ...formData, dueDay: parseInt(e.target.value) })}
                                    required
                                />
                            </div>

                            <div className="form-group">
                                <label className="form-label">Limite</label>
                                <input
                                    type="number"
                                    step="0.01"
                                    className="form-input"
                                    value={formData.limit}
                                    onChange={(e) => setFormData({ ...formData, limit: parseFloat(e.target.value) })}
                                    placeholder="0.00"
                                    required
                                />
                            </div>
                        </div>

                        <button type="submit" className="btn btn-primary" style={{ marginTop: '1rem' }}>
                            {editingId ? 'Salvar Alterações' : 'Salvar Cartão'}
                        </button>
                    </form>
                </div>
            )}

            {viewMode === 'cards' ? (
                <div className="credit-cards-grid">
                    {creditCards.length === 0 ? (
                        <div className="glass-panel">
                            <p className="empty-state">Nenhum cartão cadastrado. Adicione seu primeiro cartão!</p>
                        </div>
                    ) : (
                        creditCards.map(card => (
                            <div key={card.id} className="credit-card glass-panel">
                                <div className="card-chip">💳</div>
                                <h3 className="card-name">{card.name}</h3>

                                <div className="card-details">
                                    <div className="card-detail-item">
                                        <span className="detail-label">Fechamento</span>
                                        <span className="detail-value">Dia {card.closingDay}</span>
                                    </div>
                                    <div className="card-detail-item">
                                        <span className="detail-label">Vencimento</span>
                                        <span className="detail-value">Dia {card.dueDay}</span>
                                    </div>
                                </div>

                                <div className="card-limit">
                                    <span className="limit-label">Limite disponível</span>
                                    <span className="limit-value">R$ {card.limit.toFixed(2)}</span>
                                </div>

                                <div className="card-actions" style={{ marginTop: '1rem', display: 'flex', justifyContent: 'flex-end' }}>
                                    <button
                                        className="btn-icon"
                                        title="Editar"
                                        onClick={() => handleEdit(card)}
                                        style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '1.2rem' }}
                                    >
                                        ✏️
                                    </button>
                                </div>
                            </div>
                        ))
                    )}
                </div>
            ) : (
                <div className="credit-cards-table glass-panel">
                    {creditCards.length === 0 ? (
                        <p className="empty-state">Nenhum cartão cadastrado. Adicione seu primeiro cartão!</p>
                    ) : (
                        <table>
                            <thead>
                                <tr>
                                    <th>Cartão</th>
                                    <th>Fechamento</th>
                                    <th>Vencimento</th>
                                    <th>Limite</th>
                                    <th>Ações</th>
                                </tr>
                            </thead>
                            <tbody>
                                {creditCards.map(card => (
                                    <tr key={card.id}>
                                        <td>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                                                <span style={{ fontSize: '1.75rem' }}>💳</span>
                                                <strong>{card.name}</strong>
                                            </div>
                                        </td>
                                        <td>
                                            <span className="day-badge">Dia {card.closingDay}</span>
                                        </td>
                                        <td>
                                            <span className="day-badge">Dia {card.dueDay}</span>
                                        </td>
                                        <td>
                                            <span className="amount-value">R$ {card.limit.toFixed(2)}</span>
                                        </td>
                                        <td>
                                            <button
                                                className="btn-icon"
                                                title="Editar"
                                                onClick={() => handleEdit(card)}
                                                style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '1.2rem' }}
                                            >
                                                ✏️
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
