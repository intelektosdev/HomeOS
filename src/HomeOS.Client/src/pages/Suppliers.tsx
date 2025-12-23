import { useEffect, useState } from 'react';
import { SuppliersService, type Supplier } from '../services/api';

export function Suppliers() {
    const [suppliers, setSuppliers] = useState<Supplier[]>([]);
    const [loading, setLoading] = useState(true);
    const [showForm, setShowForm] = useState(false);
    const [formData, setFormData] = useState({ name: '', email: '', phone: '' });
    const [editingId, setEditingId] = useState<string | null>(null);

    const [viewMode, setViewMode] = useState<'cards' | 'grid'>('grid');

    const loadData = async () => {
        try {
            const data = await SuppliersService.getAll();
            setSuppliers(data);
        } catch (error) {
            console.error('Erro ao carregar fornecedores', error);
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
            if (editingId) {
                await SuppliersService.update(editingId, formData);
            } else {
                await SuppliersService.create(formData);
            }
            resetForm();
            loadData();
        } catch (error) {
            console.error('Erro ao salvar fornecedor', error);
        }
    };

    const resetForm = () => {
        setFormData({ name: '', email: '', phone: '' });
        setEditingId(null);
        setShowForm(false);
    };

    const handleEdit = (supplier: Supplier) => {
        setFormData({ name: supplier.name, email: supplier.email || '', phone: supplier.phone || '' });
        setEditingId(supplier.id);
        setShowForm(true);
    };

    if (loading) return <div className="page"><div className="loading">Carregando...</div></div>;

    return (
        <div className="page">
            <header className="page-header">
                <div>
                    <h1 className="page-title">Fornecedores</h1>
                    <p className="page-description">Gerencie onde você faz suas compras</p>
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
                        onClick={() => {
                            if (showForm) resetForm();
                            else setShowForm(true);
                        }}
                    >
                        {showForm ? '✕ Cancelar' : '+ Novo Fornecedor'}
                    </button>
                </div>
            </header>

            {showForm && (
                <div className="glass-panel" style={{ marginBottom: '2rem' }}>

                    <h3 style={{ marginBottom: '1.5rem' }}>{editingId ? 'Editar Fornecedor' : 'Novo Fornecedor'}</h3>
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
                            <label className="form-label">Email</label>
                            <input
                                type="email"
                                className="form-input"
                                value={formData.email}
                                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                                placeholder="contato@fornecedor.com"
                            />
                        </div>
                        <div className="form-group">
                            <label className="form-label">Telefone</label>
                            <input
                                type="text"
                                className="form-input"
                                value={formData.phone}
                                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                                placeholder="(00) 00000-0000"
                            />
                        </div>

                        <button type="submit" className="btn btn-primary" style={{ marginTop: '1rem' }}>
                            {editingId ? 'Salvar Alterações' : 'Salvar Fornecedor'}
                        </button>
                    </form>
                </div>
            )}

            {viewMode === 'cards' ? (
                <div className="accounts-grid">
                    {suppliers.length === 0 ? (
                        <div className="glass-panel">
                            <p className="empty-state">Nenhum fornecedor cadastrado.</p>
                        </div>
                    ) : (
                        suppliers.map(supplier => (
                            <div key={supplier.id} className="account-card glass-panel">
                                <div className="account-header">
                                    <span className="account-icon">🏪</span>
                                    <div className="account-info">
                                        <h3 className="account-name">{supplier.name}</h3>
                                        <p className="account-type">Fornecedor</p>
                                    </div>
                                </div>
                                <div className="account-balance" style={{ flexDirection: 'column', alignItems: 'flex-start', gap: '0.5rem' }}>
                                    {supplier.email && (
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                            <span style={{ fontSize: '1rem' }}>✉️</span>
                                            <span style={{ color: 'var(--color-text-primary)' }}>{supplier.email}</span>
                                        </div>
                                    )}
                                    {supplier.phone && (
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                            <span style={{ fontSize: '1rem' }}>📞</span>
                                            <span style={{ color: 'var(--color-text-primary)' }}>{supplier.phone}</span>
                                        </div>
                                    )}
                                    {!supplier.email && !supplier.phone && (
                                        <span style={{ color: 'var(--color-text-secondary)', fontStyle: 'italic' }}>Sem contato cadastrado</span>
                                    )}
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
                                        onClick={() => handleEdit(supplier)}
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
                    {suppliers.length === 0 ? (
                        <p className="empty-state">Nenhum fornecedor cadastrado.</p>
                    ) : (
                        <table>
                            <thead>
                                <tr>
                                    <th>Nome</th>
                                    <th>Email</th>
                                    <th>Telefone</th>
                                    <th>Ações</th>
                                </tr>
                            </thead>
                            <tbody>
                                {suppliers.map(supplier => (
                                    <tr key={supplier.id}>
                                        <td>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                                                <span style={{ fontSize: '1.5rem' }}>🏪</span>
                                                <strong>{supplier.name}</strong>
                                            </div>
                                        </td>
                                        <td>{supplier.email || '-'}</td>
                                        <td>{supplier.phone || '-'}</td>
                                        <td>
                                            <button
                                                className="btn-icon"
                                                title="Editar"
                                                onClick={() => handleEdit(supplier)}
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
