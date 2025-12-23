import { useEffect, useState } from 'react';
import { ProductsService, CategoriesService, ProductGroupsService, type Product, type CreateProductRequest, type UpdateProductRequest, type ProductGroup } from '../services/api';
import type { CategoryResponse } from '../types';

type ViewMode = 'cards' | 'grid';

const unitOptions = [
    { value: 'un', label: 'Unidade (un)' },
    { value: 'kg', label: 'Quilograma (kg)' },
    { value: 'g', label: 'Grama (g)' },
    { value: 'L', label: 'Litro (L)' },
    { value: 'ml', label: 'Mililitro (ml)' }
];

export function Products() {
    const [products, setProducts] = useState<Product[]>([]);
    const [categories, setCategories] = useState<CategoryResponse[]>([]);
    const [groups, setGroups] = useState<ProductGroup[]>([]);
    const [loading, setLoading] = useState(true);
    const [showForm, setShowForm] = useState(false);
    const [viewMode, setViewMode] = useState<ViewMode>('grid');
    const [editingId, setEditingId] = useState<string | null>(null);
    const [showInactive, setShowInactive] = useState(false);

    const [formData, setFormData] = useState<CreateProductRequest>({
        name: '',
        unit: 'un',
        categoryId: undefined,
        productGroupId: undefined,
        barcode: '',
        minStockAlert: undefined
    });

    const loadData = async () => {
        try {
            const [productsData, categoriesData, groupsData] = await Promise.all([
                ProductsService.getAll(showInactive),
                CategoriesService.getAll(),
                ProductGroupsService.getAll()
            ]);
            setProducts(productsData);
            setCategories(categoriesData.filter(c => c.type === 'Expense'));
            setGroups(groupsData);
        } catch (error) {
            console.error('Erro ao carregar dados', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadData();
    }, [showInactive]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            if (editingId) {
                const updateData: UpdateProductRequest = {
                    ...formData,
                    isActive: true
                };
                await ProductsService.update(editingId, updateData);
            } else {
                await ProductsService.create(formData);
            }
            resetForm();
            loadData();
        } catch (error) {
            console.error('Erro ao salvar produto', error);
        }
    };

    const resetForm = () => {
        setFormData({ name: '', unit: 'un', categoryId: undefined, productGroupId: undefined, barcode: '', minStockAlert: undefined });
        setShowForm(false);
        setEditingId(null);
    };

    const handleEdit = (product: Product) => {
        setEditingId(product.id);
        setFormData({
            name: product.name,
            unit: product.unit,
            categoryId: product.categoryId,
            productGroupId: product.productGroupId,
            barcode: product.barcode,
            minStockAlert: product.minStockAlert
        });
        setShowForm(true);
    };

    const handleToggle = async (id: string) => {
        try {
            await ProductsService.toggle(id);
            loadData();
        } catch (error) {
            console.error('Erro ao alternar status', error);
        }
    };

    const handleAdjustStock = async (id: string, change: number) => {
        try {
            await ProductsService.adjustStock(id, change);
            loadData();
        } catch (error) {
            console.error('Erro ao ajustar estoque', error);
        }
    };

    const getCategoryName = (categoryId?: string) => {
        if (!categoryId) return '-';
        const category = categories.find(c => c.id === categoryId);
        return category ? category.name : '-';
    };

    const formatPrice = (price?: number) => {
        if (price == null) return '-';
        return `R$ ${price.toFixed(2)}`;
    };

    const lowStockProducts = products.filter(p =>
        p.minStockAlert && p.stockQuantity <= p.minStockAlert && p.isActive
    );

    if (loading) return <div className="page"><div className="loading">Carregando...</div></div>;

    return (
        <div className="page">
            <header className="page-header">
                <div>
                    <h1 className="page-title">Produtos</h1>
                    <p className="page-description">Gerencie seu catálogo de produtos domésticos</p>
                </div>
                <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--text-secondary)' }}>
                        <input
                            type="checkbox"
                            checked={showInactive}
                            onChange={(e) => setShowInactive(e.target.checked)}
                        />
                        Mostrar inativos
                    </label>
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
                        {showForm ? '✕ Cancelar' : '+ Novo Produto'}
                    </button>
                </div>
            </header>

            {/* Low Stock Alert */}
            {lowStockProducts.length > 0 && (
                <div className="glass-panel" style={{ marginBottom: '1.5rem', borderLeft: '4px solid #f59e0b' }}>
                    <h3 style={{ color: '#f59e0b', marginBottom: '0.5rem' }}>⚠️ Estoque Baixo</h3>
                    <p style={{ color: 'var(--text-secondary)' }}>
                        {lowStockProducts.map(p => p.name).join(', ')}
                    </p>
                </div>
            )}

            {/* Form */}
            {showForm && (
                <div className="glass-panel" style={{ marginBottom: '2rem' }}>
                    <h3 style={{ marginBottom: '1.5rem' }}>{editingId ? 'Editar Produto' : 'Novo Produto'}</h3>
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
                                    placeholder="Ex: Arroz, Feijão, Leite..."
                                />
                            </div>

                            <div className="form-group">
                                <label className="form-label">Unidade</label>
                                <select
                                    className="form-input"
                                    value={formData.unit}
                                    onChange={(e) => setFormData({ ...formData, unit: e.target.value })}
                                >
                                    {unitOptions.map(opt => (
                                        <option key={opt.value} value={opt.value}>{opt.label}</option>
                                    ))}
                                </select>
                            </div>

                            <div className="form-group">
                                <label className="form-label">Categoria</label>
                                <select
                                    className="form-input"
                                    value={formData.categoryId || ''}
                                    onChange={(e) => setFormData({ ...formData, categoryId: e.target.value || undefined })}
                                >
                                    <option value="">Nenhuma</option>
                                    {categories.map(cat => (
                                        <option key={cat.id} value={cat.id}>{cat.icon} {cat.name}</option>
                                    ))}
                                </select>
                            </div>

                            <div className="form-group">
                                <label className="form-label">Alerta de Estoque Mínimo</label>
                                <input
                                    type="number"
                                    className="form-input"
                                    value={formData.minStockAlert || ''}
                                    onChange={(e) => setFormData({ ...formData, minStockAlert: e.target.value ? Number(e.target.value) : undefined })}
                                    placeholder="Opcional"
                                    min="0"
                                    step="0.1"
                                />
                            </div>
                        </div>

                        <div className="form-row">
                            <div className="form-group">
                                <label className="form-label">Código de Barras</label>
                                <input
                                    type="text"
                                    className="form-input"
                                    value={formData.barcode || ''}
                                    onChange={(e) => setFormData({ ...formData, barcode: e.target.value })}
                                    placeholder="EAN / Código"
                                />
                            </div>
                            <div className="form-group">
                                <label className="form-label">Grupo</label>
                                <select
                                    className="form-input"
                                    value={formData.productGroupId || ''}
                                    onChange={(e) => setFormData({ ...formData, productGroupId: e.target.value || undefined })}
                                >
                                    <option value="">Nenhum</option>
                                    {groups.map(g => (
                                        <option key={g.id} value={g.id}>{g.name}</option>
                                    ))}
                                </select>
                            </div>
                        </div>

                        <div style={{ display: 'flex', gap: '1rem', marginTop: '1rem' }}>
                            <button type="submit" className="btn btn-primary">
                                {editingId ? 'Atualizar' : 'Salvar'} Produto
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

            {/* Products View */}
            {viewMode === 'cards' ? (
                <div className="products-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '1rem' }}>
                    {products.length === 0 ? (
                        <div className="glass-panel">
                            <p className="empty-state">Nenhum produto cadastrado. Crie seu primeiro produto!</p>
                        </div>
                    ) : (
                        products.map(product => (
                            <div
                                key={product.id}
                                className="glass-panel"
                                style={{
                                    opacity: product.isActive ? 1 : 0.5,
                                    position: 'relative'
                                }}
                            >
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                                    <div>
                                        <h4 style={{ marginBottom: '0.25rem' }}>{product.name}</h4>
                                        <span style={{ color: 'var(--text-secondary)', fontSize: '0.875rem' }}>
                                            {getCategoryName(product.categoryId)}
                                        </span>
                                    </div>
                                    <span style={{
                                        background: 'var(--primary-gradient)',
                                        padding: '0.25rem 0.75rem',
                                        borderRadius: '1rem',
                                        fontSize: '0.75rem'
                                    }}>
                                        {product.unit}
                                    </span>
                                </div>

                                <div style={{ marginTop: '1rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                    <div>
                                        <div style={{ fontSize: '1.5rem', fontWeight: 'bold' }}>
                                            {product.stockQuantity.toFixed(1)}
                                        </div>
                                        <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                                            Em estoque
                                        </div>
                                    </div>
                                    <div style={{ textAlign: 'right' }}>
                                        <div style={{ fontSize: '1rem' }}>{formatPrice(product.lastPrice)}</div>
                                        <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Último preço</div>
                                    </div>
                                </div>

                                <div style={{ marginTop: '1rem', display: 'flex', gap: '0.5rem', justifyContent: 'center' }}>
                                    <button
                                        className="btn btn-secondary"
                                        style={{ padding: '0.25rem 0.5rem', fontSize: '0.875rem' }}
                                        onClick={() => handleAdjustStock(product.id, -1)}
                                    >
                                        -1
                                    </button>
                                    <button
                                        className="btn btn-secondary"
                                        style={{ padding: '0.25rem 0.5rem', fontSize: '0.875rem' }}
                                        onClick={() => handleAdjustStock(product.id, 1)}
                                    >
                                        +1
                                    </button>
                                    <button
                                        className="btn btn-secondary"
                                        style={{ padding: '0.25rem 0.5rem', fontSize: '0.875rem' }}
                                        onClick={() => handleEdit(product)}
                                    >
                                        ✏️
                                    </button>
                                    <button
                                        className="btn btn-secondary"
                                        style={{ padding: '0.25rem 0.5rem', fontSize: '0.875rem' }}
                                        onClick={() => handleToggle(product.id)}
                                    >
                                        {product.isActive ? '❌' : '✅'}
                                    </button>
                                </div>
                            </div>
                        ))
                    )}
                </div>
            ) : (
                <div className="glass-panel">
                    {products.length === 0 ? (
                        <p className="empty-state">Nenhum produto cadastrado. Crie seu primeiro produto!</p>
                    ) : (
                        <table>
                            <thead>
                                <tr>
                                    <th>Nome</th>
                                    <th>Categoria</th>
                                    <th>Unidade</th>
                                    <th>Estoque</th>
                                    <th>Último Preço</th>
                                    <th>Status</th>
                                    <th>Ações</th>
                                </tr>
                            </thead>
                            <tbody>
                                {products.map(product => (
                                    <tr key={product.id} style={{ opacity: product.isActive ? 1 : 0.5 }}>
                                        <td><strong>{product.name}</strong></td>
                                        <td>{getCategoryName(product.categoryId)}</td>
                                        <td>{product.unit}</td>
                                        <td>
                                            <span style={{
                                                color: product.minStockAlert && product.stockQuantity <= product.minStockAlert
                                                    ? '#f59e0b'
                                                    : 'inherit'
                                            }}>
                                                {product.stockQuantity.toFixed(1)}
                                            </span>
                                        </td>
                                        <td>{formatPrice(product.lastPrice)}</td>
                                        <td>
                                            <span className={`type-badge ${product.isActive ? 'income' : 'expense'}`}>
                                                {product.isActive ? '✅ Ativo' : '❌ Inativo'}
                                            </span>
                                        </td>
                                        <td>
                                            <div style={{ display: 'flex', gap: '0.25rem' }}>
                                                <button className="btn btn-secondary" style={{ padding: '0.25rem 0.5rem' }} onClick={() => handleAdjustStock(product.id, -1)}>-1</button>
                                                <button className="btn btn-secondary" style={{ padding: '0.25rem 0.5rem' }} onClick={() => handleAdjustStock(product.id, 1)}>+1</button>
                                                <button className="btn btn-secondary" style={{ padding: '0.25rem 0.5rem' }} onClick={() => handleEdit(product)}>✏️</button>
                                                <button className="btn btn-secondary" style={{ padding: '0.25rem 0.5rem' }} onClick={() => handleToggle(product.id)}>{product.isActive ? '❌' : '✅'}</button>
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
