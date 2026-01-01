import { useEffect, useState } from 'react';
import { ProductsService, CategoriesService, ProductGroupsService, ShoppingListService, type Product, type CreateProductRequest, type UpdateProductRequest, type ProductGroup } from '../services/api';
import type { CategoryResponse } from '../types';

type ViewMode = 'cards' | 'grid' | 'inventory';

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
    const [isInventoryMode, setIsInventoryMode] = useState(false);

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

    const handleAddLowStockToShoppingList = async () => {
        const lowStock = products.filter(p => p.isActive && p.minStockAlert && p.stockQuantity <= p.minStockAlert);
        if (lowStock.length === 0) {
            alert('Não há itens com estoque baixo para adicionar.');
            return;
        }

        if (!window.confirm(`Deseja adicionar ${lowStock.length} itens à lista de compras?`)) return;

        try {
            await Promise.all(lowStock.map(p =>
                ShoppingListService.addItem({
                    productId: p.id,
                    name: p.name,
                    quantity: (p.minStockAlert || 1) * 2 - p.stockQuantity,
                    unit: p.unit
                })
            ));
            alert('Itens adicionados com sucesso!');
        } catch (error) {
            console.error('Erro ao adicionar à lista', error);
        }
    };

    const getStockHealth = (p: Product) => {
        if (!p.minStockAlert) return { percentage: 100, color: 'var(--text-secondary)' };
        const percentage = Math.min(100, (p.stockQuantity / (p.minStockAlert * 2)) * 100);
        let color = 'var(--color-success)';
        if (p.stockQuantity <= p.minStockAlert) color = 'var(--color-danger)';
        else if (p.stockQuantity <= p.minStockAlert * 1.5) color = 'var(--warning-color)';
        return { percentage, color };
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

            {/* Inventory Dashboard KPIs */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1.5rem', marginBottom: '2rem' }}>
                <div className="glass-panel" style={{ padding: '1.25rem', textAlign: 'center', borderBottom: '3px solid var(--color-danger)' }}>
                    <div style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', marginBottom: '0.25rem' }}>Itens Críticos</div>
                    <div style={{ fontSize: '2rem', fontWeight: 800, color: 'var(--color-danger)' }}>{lowStockProducts.length}</div>
                </div>
                <div className="glass-panel" style={{ padding: '1.25rem', textAlign: 'center', borderBottom: '3px solid var(--color-primary)' }}>
                    <div style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', marginBottom: '0.25rem' }}>Total de Itens</div>
                    <div style={{ fontSize: '2rem', fontWeight: 800, color: 'var(--color-primary)' }}>{products.filter(p => p.isActive).length}</div>
                </div>
                <div className="glass-panel" style={{ padding: '1.25rem', textAlign: 'center', borderBottom: '3px solid var(--color-success)' }}>
                    <div style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', marginBottom: '0.25rem' }}>Em Dia</div>
                    <div style={{ fontSize: '2rem', fontWeight: 800, color: 'var(--color-success)' }}>
                        {products.filter(p => p.isActive && (!p.minStockAlert || p.stockQuantity > p.minStockAlert)).length}
                    </div>
                </div>
                <div className="glass-panel" style={{ padding: '1.25rem', display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: '0.5rem' }}>
                    <button className="btn btn-secondary btn-lg" style={{ width: '100%' }} onClick={handleAddLowStockToShoppingList}>
                        🛒 Repor Itens Baixos
                    </button>
                    <button
                        className={`btn btn-lg ${isInventoryMode ? 'btn-primary' : 'btn-secondary'}`}
                        style={{ width: '100%' }}
                        onClick={() => {
                            setIsInventoryMode(!isInventoryMode);
                            if (!isInventoryMode) setViewMode('inventory');
                            else setViewMode('grid');
                        }}
                    >
                        📋 {isInventoryMode ? 'Sair do Modo Contagem' : 'Iniciar Contagem'}
                    </button>
                </div>
            </div>

            {/* Low Stock Alert - Refined */}
            {lowStockProducts.length > 0 && !isInventoryMode && (
                <div className="glass-panel glass-panel-danger" style={{ marginBottom: '1.5rem', padding: '1rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <span style={{ fontSize: '1.25rem' }}>⚠️</span>
                        <div>
                            <strong>Estoque Crítico:</strong> {lowStockProducts.map(p => p.name).join(', ')}
                        </div>
                    </div>
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
            {viewMode === 'inventory' ? (
                <div className="glass-panel" style={{ padding: 0, overflow: 'hidden' }}>
                    <div style={{ padding: '1.5rem', borderBottom: '1px solid rgba(255,255,255,0.05)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <h3>📋 Checklist de Inventário</h3>
                        <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>Clique nos botões para ajustar as quantidades rapidamente</p>
                    </div>
                    {products.filter(p => p.isActive).map(product => {
                        const health = getStockHealth(product);
                        return (
                            <div key={product.id} style={{
                                padding: '1rem 1.5rem',
                                borderBottom: '1px solid rgba(255,255,255,0.05)',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '1.5rem',
                                transition: 'background 0.2s',
                                background: product.stockQuantity <= (product.minStockAlert || 0) ? 'rgba(239, 68, 68, 0.03)' : 'transparent'
                            }}>
                                <div style={{ flex: 1 }}>
                                    <div style={{ fontWeight: 600, fontSize: '1.1rem' }}>{product.name}</div>
                                    <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>{getCategoryName(product.categoryId)}</div>
                                </div>

                                <div style={{ width: '150px' }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', marginBottom: '0.25rem' }}>
                                        <span style={{ color: health.color }}>{product.stockQuantity.toFixed(1)} {product.unit}</span>
                                        <span style={{ color: 'var(--text-muted)' }}>mín: {product.minStockAlert || 0}</span>
                                    </div>
                                    <div className="progress-bar-container" style={{ height: '6px', background: 'rgba(255,255,255,0.05)' }}>
                                        <div className="progress-bar" style={{
                                            width: `${health.percentage}%`,
                                            background: health.color,
                                            boxShadow: `0 0 10px ${health.color}44`
                                        }}></div>
                                    </div>
                                </div>

                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                    <button className="btn-icon" style={{ width: '40px', height: '40px', fontSize: '1.25rem' }} onClick={() => handleAdjustStock(product.id, -1)}>-</button>
                                    <div style={{ width: '60px', textAlign: 'center', fontWeight: 800, fontSize: '1.2rem' }}>
                                        {product.stockQuantity.toFixed(0)}
                                    </div>
                                    <button className="btn-icon" style={{ width: '40px', height: '40px', fontSize: '1.25rem' }} onClick={() => handleAdjustStock(product.id, 1)}>+</button>
                                </div>

                                <button className="btn btn-text" style={{ padding: '0.5rem' }} onClick={() => {
                                    const val = window.prompt(`Novo estoque para ${product.name}:`, product.stockQuantity.toString());
                                    if (val !== null) handleAdjustStock(product.id, Number(val) - product.stockQuantity);
                                }}>
                                    🖍️ Set
                                </button>
                            </div>
                        );
                    })}
                </div>
            ) : viewMode === 'cards' ? (
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
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.5rem' }}>
                                    <div>
                                        <h4 className="product-card-title">{product.name}</h4>
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

                                <div style={{ marginTop: '1rem', display: 'flex', gap: '0.75rem', justifyContent: 'center' }}>
                                    <button
                                        className="btn-icon"
                                        onClick={() => handleAdjustStock(product.id, -1)}
                                        title="Remover 1"
                                    >
                                        -
                                    </button>
                                    <button
                                        className="btn-icon"
                                        onClick={() => handleAdjustStock(product.id, 1)}
                                        title="Adicionar 1"
                                    >
                                        +
                                    </button>
                                    <button
                                        className="btn-icon"
                                        onClick={() => handleEdit(product)}
                                        title="Editar"
                                    >
                                        ✏️
                                    </button>
                                    <button
                                        className={`btn-icon ${product.isActive ? 'btn-icon-danger' : ''}`}
                                        onClick={() => handleToggle(product.id)}
                                        title={product.isActive ? 'Desativar' : 'Ativar'}
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
                        <table className="table">
                            <thead>
                                <tr>
                                    <th>Nome</th>
                                    <th>Categoria</th>
                                    <th>Unidade</th>
                                    <th>Estoque</th>
                                    <th>Último Preço</th>
                                    <th>Status</th>
                                    <th style={{ textAlign: 'center' }}>Ações</th>
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
                                                fontWeight: 'bold',
                                                color: product.minStockAlert && product.stockQuantity <= product.minStockAlert
                                                    ? 'var(--color-danger)'
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
                                            <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'center' }}>
                                                <button className="btn-icon" onClick={() => handleAdjustStock(product.id, -1)}>-</button>
                                                <button className="btn-icon" onClick={() => handleAdjustStock(product.id, 1)}>+</button>
                                                <button className="btn-icon" onClick={() => handleEdit(product)}>✏️</button>
                                                <button className={`btn-icon ${product.isActive ? 'btn-icon-danger' : ''}`} onClick={() => handleToggle(product.id)}>{product.isActive ? '❌' : '✅'}</button>
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
