import { useState, useEffect } from 'react';
import { BudgetsService } from '../services/api';
import type { BudgetStatus, CreateBudgetRequest } from '../services/api';
import { CategoriesService } from '../services/api';

export function Budgets() {
    const [budgets, setBudgets] = useState<BudgetStatus[]>([]);
    const [categories, setCategories] = useState<{ id: string, name: string }[]>([]);
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
    const [isLoading, setIsLoading] = useState(true);

    const [newItem, setNewItem] = useState<CreateBudgetRequest>({
        userId: localStorage.getItem('userId') || '',
        name: '',
        amountLimit: 0,
        periodType: 'Monthly',
        alertThreshold: 0.8
    });

    useEffect(() => {
        loadData();
    }, []);

    async function loadData() {
        try {
            const [budgetsData, categoriesData] = await Promise.all([
                BudgetsService.getStatus(),
                CategoriesService.getAll()
            ]);
            setBudgets(budgetsData);
            setCategories(categoriesData);
        } catch (error) {
            console.error('Erro ao carregar orçamentos:', error);
        } finally {
            setIsLoading(false);
        }
    }

    async function handleCreate(e: React.FormEvent) {
        e.preventDefault();
        try {
            await BudgetsService.create(newItem);
            setIsCreateModalOpen(false);
            setNewItem({
                userId: localStorage.getItem('userId') || '',
                name: '',
                amountLimit: 0,
                periodType: 'Monthly',
                alertThreshold: 0.8
            });
            loadData();
        } catch (error) {
            alert('Erro ao criar orçamento');
        }
    }

    async function handleDelete(id: string) {
        if (confirm('Tem certeza que deseja excluir este orçamento?')) {
            await BudgetsService.delete(id);
            loadData();
        }
    }

    if (isLoading) return <div>Carregando...</div>;

    return (
        <div className="container">
            <header className="page-header">
                <div>
                    <h1>Orçamentos</h1>
                    <p className="subtitle">Gerencie seus limites de gastos</p>
                </div>
                <button
                    className="btn btn-primary"
                    onClick={() => setIsCreateModalOpen(true)}
                >
                    + Novo Orçamento
                </button>
            </header>

            <div className="grid-cards">
                {budgets.map(({ budget, spentAmount, percentageUsed, statusLevel }) => (
                    <div key={budget.id} className="card" style={{ borderLeft: `4px solid ${getStatusColor(statusLevel)}` }}>
                        <div className="card-header">
                            <h3>{budget.name}</h3>
                            <button onClick={() => handleDelete(budget.id)} className="btn-icon">🗑️</button>
                        </div>
                        <div className="card-body">
                            <div className="budget-progress">
                                <div className="progress-info">
                                    <span>Gasto: {formatCurrency(spentAmount)}</span>
                                    <span>Limite: {formatCurrency(budget.amountLimit)}</span>
                                </div>
                                <div className="progress-bar-container">
                                    <div
                                        className="progress-bar"
                                        style={{
                                            width: `${Math.min(percentageUsed, 100)}%`,
                                            backgroundColor: getStatusColor(statusLevel)
                                        }}
                                    />
                                </div>
                                <div className="progress-text">
                                    {percentageUsed.toFixed(1)}% utilizado
                                </div>
                            </div>
                            <div className="budget-details">
                                <small>Período: {translatePeriod(budget.periodType)}</small>
                                {budget.categoryId && (
                                    <small>Categoria: {categories.find(c => c.id === budget.categoryId)?.name || '...'}</small>
                                )}
                            </div>
                        </div>
                    </div>
                ))}
            </div>

            {isCreateModalOpen && (
                <div className="modal-overlay">
                    <div className="modal">
                        <h2>Novo Orçamento</h2>
                        <form onSubmit={handleCreate}>
                            <div className="form-group">
                                <label className="form-label">Nome</label>
                                <input
                                    className="form-input"
                                    required
                                    value={newItem.name}
                                    onChange={e => setNewItem({ ...newItem, name: e.target.value })}
                                />
                            </div>
                            <div className="form-group">
                                <label className="form-label">Limite (R$)</label>
                                <input
                                    className="form-input"
                                    type="number"
                                    step="0.01"
                                    required
                                    value={newItem.amountLimit}
                                    onChange={e => setNewItem({ ...newItem, amountLimit: parseFloat(e.target.value) })}
                                />
                            </div>
                            <div className="form-group">
                                <label className="form-label">Período</label>
                                <select
                                    className="form-input"
                                    value={newItem.periodType}
                                    onChange={e => setNewItem({ ...newItem, periodType: e.target.value })}
                                >
                                    <option value="Monthly">Mensal</option>
                                    <option value="Yearly">Anual</option>
                                </select>
                            </div>
                            <div className="form-group">
                                <label className="form-label">Categoria (Opcional)</label>
                                <select
                                    className="form-input"
                                    value={newItem.categoryId || ''}
                                    onChange={e => setNewItem({ ...newItem, categoryId: e.target.value || undefined })}
                                >
                                    <option value="">Todas (Global)</option>
                                    {categories.map(c => (
                                        <option key={c.id} value={c.id}>{c.name}</option>
                                    ))}
                                </select>
                            </div>
                            <div className="modal-actions">
                                <button type="button" className="btn btn-secondary" onClick={() => setIsCreateModalOpen(false)}>Cancelar</button>
                                <button type="submit" className="btn btn-primary">Salvar</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}

function getStatusColor(level: string) {
    switch (level) {
        case 'Normal': return '#10B981'; // Green
        case 'Warning': return '#F59E0B'; // Yellow
        case 'Critical': return '#EF4444'; // Red
        default: return '#6B7280';
    }
}

function formatCurrency(val: number) {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);
}

function translatePeriod(type: string) {
    return type === 'Monthly' ? 'Mensal' : type === 'Yearly' ? 'Anual' : type;
}
