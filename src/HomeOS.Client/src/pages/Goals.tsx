import { useState, useEffect } from 'react';
import { GoalsService } from '../services/api';
import type { Goal, CreateGoalRequest } from '../services/api';

export function Goals() {
    const [goals, setGoals] = useState<Goal[]>([]);
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
    const [isDepositModalOpen, setIsDepositModalOpen] = useState(false);
    const [selectedGoal, setSelectedGoal] = useState<Goal | null>(null);
    const [depositAmount, setDepositAmount] = useState(0);

    const [newItem, setNewItem] = useState<CreateGoalRequest>({
        userId: localStorage.getItem('userId') || '',
        name: '',
        targetAmount: 0,
    });

    useEffect(() => {
        loadData();
    }, []);

    async function loadData() {
        try {
            const data = await GoalsService.getAll();
            setGoals(data);
        } catch (error) {
            console.error('Erro ao carregar metas:', error);
        }
    }

    async function handleCreate(e: React.FormEvent) {
        e.preventDefault();
        try {
            await GoalsService.create(newItem);
            setIsCreateModalOpen(false);
            setNewItem({
                userId: localStorage.getItem('userId') || '',
                name: '',
                targetAmount: 0,
            });
            loadData();
        } catch (error) {
            alert('Erro ao criar meta');
        }
    }

    async function handleDeposit(e: React.FormEvent) {
        e.preventDefault();
        if (!selectedGoal) return;
        try {
            await GoalsService.deposit(selectedGoal.id, {
                userId: selectedGoal.userId,
                amount: depositAmount,
                isIncremental: true
            });
            setIsDepositModalOpen(false);
            setDepositAmount(0);
            setSelectedGoal(null);
            loadData();
        } catch (error) {
            alert('Erro ao realizar depósito');
        }
    }

    async function handleDelete(id: string) {
        if (confirm('Deseja excluir esta meta?')) {
            await GoalsService.delete(id);
            loadData();
        }
    }

    function openDepositModal(goal: Goal) {
        setSelectedGoal(goal);
        setDepositAmount(0);
        setIsDepositModalOpen(true);
    }

    return (
        <div className="container">
            <header className="page-header">
                <div>
                    <h1>Metas Financeiras</h1>
                    <p className="subtitle">Planeje seus sonhos</p>
                </div>
                <button
                    className="btn btn-primary"
                    onClick={() => setIsCreateModalOpen(true)}
                >
                    + Nova Meta
                </button>
            </header>

            <div className="grid-cards">
                {goals.map(goal => {
                    const percentage = Math.min((goal.currentAmount / goal.targetAmount) * 100, 100);
                    const isAchieved = goal.status === 'Achieved' || percentage >= 100;

                    return (
                        <div key={goal.id} className="card">
                            <div className="card-header">
                                <h3>{goal.name} {isAchieved && '🏆'}</h3>
                                <button onClick={() => handleDelete(goal.id)} className="btn-icon">🗑️</button>
                            </div>
                            <div className="card-body">
                                <div className="goal-visual">
                                    <div className="goal-amount-big">
                                        {formatCurrency(goal.currentAmount)}
                                    </div>
                                    <div className="goal-target">
                                        de {formatCurrency(goal.targetAmount)}
                                    </div>
                                </div>

                                <div className="progress-bar-container" style={{ marginTop: '1rem' }}>
                                    <div
                                        className="progress-bar"
                                        style={{
                                            width: `${percentage}%`,
                                            backgroundColor: isAchieved ? '#10B981' : '#3B82F6'
                                        }}
                                    />
                                </div>

                                <button
                                    className="btn btn-secondary"
                                    style={{ marginTop: '1rem', width: '100%' }}
                                    onClick={() => openDepositModal(goal)}
                                    disabled={isAchieved}
                                >
                                    + Adicionar Valor
                                </button>
                            </div>
                        </div>
                    );
                })}
            </div>

            {isCreateModalOpen && (
                <div className="modal-overlay">
                    <div className="modal">
                        <h2>Nova Meta</h2>
                        <form onSubmit={handleCreate}>
                            <div className="form-group">
                                <label className="form-label">Nome do Objetivo</label>
                                <input
                                    className="form-input"
                                    required
                                    value={newItem.name}
                                    onChange={e => setNewItem({ ...newItem, name: e.target.value })}
                                    placeholder="Ex: Viagem Disney"
                                />
                            </div>
                            <div className="form-group">
                                <label className="form-label">Valor Alvo (R$)</label>
                                <input
                                    className="form-input"
                                    type="number"
                                    step="0.01"
                                    required
                                    value={newItem.targetAmount}
                                    onChange={e => setNewItem({ ...newItem, targetAmount: parseFloat(e.target.value) })}
                                />
                            </div>
                            <div className="form-group">
                                <label className="form-label">Prazo (Opcional)</label>
                                <input
                                    className="form-input"
                                    type="date"
                                    value={newItem.deadline || ''}
                                    onChange={e => setNewItem({ ...newItem, deadline: e.target.value || undefined })}
                                />
                            </div>
                            <div className="modal-actions">
                                <button type="button" className="btn btn-secondary" onClick={() => setIsCreateModalOpen(false)}>Cancelar</button>
                                <button type="submit" className="btn btn-primary">Criar Meta</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {isDepositModalOpen && selectedGoal && (
                <div className="modal-overlay">
                    <div className="modal">
                        <h2>Adicionar à Meta: {selectedGoal.name}</h2>
                        <form onSubmit={handleDeposit}>
                            <div className="form-group">
                                <label className="form-label">Valor a depositar (R$)</label>
                                <input
                                    className="form-input"
                                    type="number"
                                    step="0.01"
                                    required
                                    autoFocus
                                    value={depositAmount}
                                    onChange={e => setDepositAmount(parseFloat(e.target.value))}
                                />
                            </div>
                            <div className="modal-actions">
                                <button type="button" className="btn btn-secondary" onClick={() => setIsDepositModalOpen(false)}>Cancelar</button>
                                <button type="submit" className="btn btn-primary">Confirmar</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}

function formatCurrency(val: number) {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);
}
