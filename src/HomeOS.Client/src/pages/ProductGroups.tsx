import { useEffect, useState } from 'react';
import { ProductGroupsService, type ProductGroup } from '../services/api';

export function ProductGroups() {
    const [groups, setGroups] = useState<ProductGroup[]>([]);
    const [loading, setLoading] = useState(true);
    const [showForm, setShowForm] = useState(false);
    const [formData, setFormData] = useState({ name: '', description: '' });

    const [viewMode, setViewMode] = useState<'cards' | 'grid'>('grid');

    const loadData = async () => {
        try {
            const data = await ProductGroupsService.getAll();
            setGroups(data);
        } catch (error) {
            console.error('Erro ao carregar grupos', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadData();
    }, []);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            await ProductGroupsService.create(formData);
            setFormData({ name: '', description: '' });
            setShowForm(false);
            loadData();
        } catch (error) {
            console.error('Erro ao salvar grupo', error);
        }
    };

    if (loading) return <div className="page"><div className="loading">Carregando...</div></div>;

    return (
        <div className="page">
            <header className="page-header">
                <div>
                    <h1 className="page-title">Grupos de Produtos</h1>
                    <p className="page-description">Categorize seus produtos em grupos</p>
                </div>
                <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
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
                        {showForm ? '✕ Cancelar' : '+ Novo Grupo'}
                    </button>
                </div>
            </header>

            {showForm && (
                <div className="glass-panel" style={{ marginBottom: '2rem' }}>
                    <h3 style={{ marginBottom: '1.5rem' }}>Novo Grupo</h3>
                    <form onSubmit={handleSubmit} className="form">
                        <div className="form-group">
                            <label className="form-label">Nome</label>
                            <input
                                type="text"
                                className="form-input"
                                value={formData.name}
                                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                required
                            />
                        </div>
                        <div className="form-group">
                            <label className="form-label">Descrição</label>
                            <input
                                type="text"
                                className="form-input"
                                value={formData.description}
                                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                            />
                        </div>
                        <button type="submit" className="btn btn-primary" style={{ marginTop: '1rem' }}>
                            Salvar Grupo
                        </button>
                    </form>
                </div>
            )}

            {viewMode === 'cards' ? (
                <div className="accounts-grid">
                    {groups.length === 0 ? (
                        <div className="glass-panel">
                            <p className="empty-state">Nenhum grupo cadastrado.</p>
                        </div>
                    ) : (
                        groups.map(group => (
                            <div key={group.id} className="account-card glass-panel">
                                <div className="account-header">
                                    <span className="account-icon">📦</span>
                                    <div className="account-info">
                                        <h3 className="account-name">{group.name}</h3>
                                        <p className="account-type">{group.description || 'Sem descrição'}</p>
                                    </div>
                                </div>
                                <div className="account-actions">
                                    <button
                                        className="btn-edit"
                                        style={{
                                            background: 'transparent',
                                            border: 'none',
                                            color: 'var(--color-text-secondary)',
                                            cursor: 'pointer',
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: '0.5rem',
                                            fontSize: '0.875rem',
                                            fontWeight: 600
                                        }}
                                        title="Editar"
                                    >
                                        ✏️ Editar
                                    </button>
                                </div>
                            </div>
                        ))
                    )}
                </div>
            ) : (
                <div className="accounts-table glass-panel">
                    {groups.length === 0 ? (
                        <p className="empty-state">Nenhum grupo cadastrado.</p>
                    ) : (
                        <table>
                            <thead>
                                <tr>
                                    <th>Nome</th>
                                    <th>Descrição</th>
                                </tr>
                            </thead>
                            <tbody>
                                {groups.map(group => (
                                    <tr key={group.id}>
                                        <td>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                                                <span style={{ fontSize: '1.5rem' }}>📦</span>
                                                <strong>{group.name}</strong>
                                            </div>
                                        </td>
                                        <td>{group.description || '-'}</td>
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
