import { useEffect, useState } from 'react';
import { CategoriesService } from '../services/api';
import type { CategoryResponse, CreateCategoryRequest, TransactionType } from '../types';

type ViewMode = 'cards' | 'grid';

export function Categories() {
    const [categories, setCategories] = useState<CategoryResponse[]>([]);
    const [loading, setLoading] = useState(true);
    const [showForm, setShowForm] = useState(false);
    const [viewMode, setViewMode] = useState<ViewMode>('cards');
    const [editingId, setEditingId] = useState<string | null>(null);
    const [formData, setFormData] = useState<CreateCategoryRequest>({
        name: '',
        type: 'Expense',
        icon: '📌'
    });

    const loadCategories = async () => {
        try {
            const data = await CategoriesService.getAll();
            setCategories(data);
        } catch (error) {
            console.error('Erro ao carregar categorias', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadCategories();
    }, []);

    const resetForm = () => {
        setFormData({ name: '', type: 'Expense', icon: '📌' });
        setShowForm(false);
        setEditingId(null);
    };

    const handleEdit = (category: CategoryResponse) => {
        setEditingId(category.id);
        setFormData({
            name: category.name,
            type: category.type as TransactionType,
            icon: category.icon || '📌'
        });
        setShowForm(true);
    };

    const handleDelete = async (id: string) => {
        if (!window.confirm('Tem certeza que deseja excluir esta categoria?')) return;
        try {
            await CategoriesService.delete(id);
            loadCategories();
        } catch (error) {
            console.error('Erro ao excluir categoria', error);
            alert('Não foi possível excluir a categoria. Verifique se existem transações vinculadas a ela.');
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            if (editingId) {
                await CategoriesService.update(editingId, formData);
            } else {
                await CategoriesService.create(formData);
            }
            resetForm();
            loadCategories();
        } catch (error) {
            console.error('Erro ao salvar categoria', error);
        }
    };

    const iconOptions = ['📌', '🏠', '🍔', '🚗', '💡', '🎮', '👕', '🏥', '📚', '✈️', '🎬', '🛒', '💰', '🎯', '⚡', '🎨'];

    const incomeCategories = categories.filter(c => c.type === 'Income');
    const expenseCategories = categories.filter(c => c.type === 'Expense');

    if (loading) return <div className="page"><div className="loading">Carregando...</div></div>;

    return (
        <div className="page">
            <header className="page-header">
                <div>
                    <h1 className="page-title">Categorias</h1>
                    <p className="page-description">Organize suas transações por categoria</p>
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
                        onClick={() => { if (showForm && editingId) resetForm(); else setShowForm(!showForm); }}
                    >
                        {showForm ? '✕ Cancelar' : '+ Nova Categoria'}
                    </button>
                </div>
            </header>

            {showForm && (
                <div className="glass-panel" style={{ marginBottom: '2rem' }}>
                    <h3 style={{ marginBottom: '1.5rem' }}>{editingId ? 'Editar Categoria' : 'Nova Categoria'}</h3>
                    <form onSubmit={handleSubmit} className="form">
                        <div className="form-row">
                            <div className="form-group" style={{ flex: 2 }}>
                                <label className="form-label">Nome</label>
                                <input
                                    type="text"
                                    className="form-input"
                                    value={formData.name}
                                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                    required
                                    placeholder="Ex: Alimentação, Salário..."
                                />
                            </div>

                            <div className="form-group">
                                <label className="form-label">Tipo</label>
                                <select
                                    className="form-input"
                                    value={formData.type}
                                    onChange={(e) => setFormData({ ...formData, type: e.target.value as TransactionType })}
                                >
                                    <option value="Expense">Despesa</option>
                                    <option value="Income">Receita</option>
                                </select>
                            </div>

                            <div className="form-group">
                                <label className="form-label">Ícone</label>
                                <select
                                    className="form-input"
                                    value={formData.icon}
                                    onChange={(e) => setFormData({ ...formData, icon: e.target.value })}
                                    style={{ fontSize: '1.2rem' }}
                                >
                                    {iconOptions.map(icon => (
                                        <option key={icon} value={icon}>{icon}</option>
                                    ))}
                                </select>
                            </div>
                        </div>

                        <div style={{ display: 'flex', gap: '1rem', marginTop: '1rem' }}>
                            <button type="submit" className="btn btn-primary">
                                {editingId ? 'Atualizar' : 'Salvar'} Categoria
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
                <div className="categories-grid">
                    <div className="glass-panel">
                        <h3 className="section-title">
                            <span>📈 Receitas</span>
                            <span className="badge">{incomeCategories.length}</span>
                        </h3>
                        <div className="category-list">
                            {incomeCategories.length === 0 ? (
                                <p className="empty-state">Nenhuma categoria de receita cadastrada</p>
                            ) : (
                                incomeCategories.map(cat => (
                                    <div key={cat.id} className="category-card" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                                            <span className="category-icon">{cat.icon || '📌'}</span>
                                            <span className="category-name">{cat.name}</span>
                                        </div>
                                        <div className="category-actions" style={{ display: 'flex', gap: '0.5rem' }}>
                                            <button className="btn-icon" onClick={() => handleEdit(cat)} title="Editar">✏️</button>
                                            <button className="btn-icon" onClick={() => handleDelete(cat.id)} title="Excluir">🗑️</button>
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>

                    <div className="glass-panel">
                        <h3 className="section-title" style={{ color: 'var(--expense-color)' }}>
                            <span>📉 Despesas</span>
                            <span className="badge">{expenseCategories.length}</span>
                        </h3>
                        <div className="category-list">
                            {expenseCategories.length === 0 ? (
                                <p className="empty-state">Nenhuma categoria de despesa cadastrada</p>
                            ) : (
                                expenseCategories.map(cat => (
                                    <div key={cat.id} className="category-card" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                                            <span className="category-icon">{cat.icon || '📌'}</span>
                                            <span className="category-name">{cat.name}</span>
                                        </div>
                                        <div className="category-actions" style={{ display: 'flex', gap: '0.5rem' }}>
                                            <button className="btn-icon" onClick={() => handleEdit(cat)} title="Editar">✏️</button>
                                            <button className="btn-icon" onClick={() => handleDelete(cat.id)} title="Excluir">🗑️</button>
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>
                </div>
            ) : (
                <div className="categories-table glass-panel">
                    {categories.length === 0 ? (
                        <p className="empty-state">Nenhuma categoria cadastrada. Crie sua primeira categoria!</p>
                    ) : (
                        <table>
                            <thead>
                                <tr>
                                    <th>Ícone</th>
                                    <th>Nome</th>
                                    <th>Tipo</th>
                                    <th style={{ textAlign: 'center' }}>Ações</th>
                                </tr>
                            </thead>
                            <tbody>
                                {categories.map(cat => (
                                    <tr key={cat.id}>
                                        <td>
                                            <span style={{ fontSize: '1.75rem' }}>{cat.icon || '📌'}</span>
                                        </td>
                                        <td>
                                            <strong>{cat.name}</strong>
                                        </td>
                                        <td>
                                            <span className={`type-badge ${cat.type === 'Income' ? 'income' : 'expense'}`}>
                                                {cat.type === 'Income' ? '📈 Receita' : '📉 Despesa'}
                                            </span>
                                        </td>
                                        <td>
                                            <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'center' }}>
                                                <button className="btn-icon" onClick={() => handleEdit(cat)} title="Editar">✏️</button>
                                                <button className="btn-icon" onClick={() => handleDelete(cat.id)} title="Excluir">🗑️</button>
                                            </div>
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
