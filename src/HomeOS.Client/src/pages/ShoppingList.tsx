import { useEffect, useState } from 'react';
import {
    ShoppingListService,
    ProductsService,
    AccountsService,
    CategoriesService,
    SuppliersService,
    CreditCardsService,
    type ShoppingListItem,
    type Product,
    type Supplier,
    type AddShoppingListItemRequest,
    type CheckoutRequest,
    type CheckoutItemRequest
} from '../services/api';
import type { CategoryResponse, AccountResponse, CreditCardResponse } from '../types';

interface CheckoutFormItem {
    shoppingListItemId: string;
    productId?: string;
    name: string;
    quantity: number;
    unitPrice: number;
}

export function ShoppingList() {
    const [items, setItems] = useState<ShoppingListItem[]>([]);
    const [products, setProducts] = useState<Product[]>([]);
    const [accounts, setAccounts] = useState<AccountResponse[]>([]);
    const [creditCards, setCreditCards] = useState<CreditCardResponse[]>([]);
    const [categories, setCategories] = useState<CategoryResponse[]>([]);
    const [suppliers, setSuppliers] = useState<Supplier[]>([]);
    const [loading, setLoading] = useState(true);
    const [showForm, setShowForm] = useState(false);
    const [showCheckout, setShowCheckout] = useState(false);

    const [formData, setFormData] = useState<AddShoppingListItemRequest>({
        productId: undefined,
        name: '',
        quantity: 1,
        unit: 'un'
    });

    const [checkoutItems, setCheckoutItems] = useState<CheckoutFormItem[]>([]);
    const [checkoutData, setCheckoutData] = useState({
        categoryId: '',
        accountId: '',
        creditCardId: '',
        paymentMethod: 'account' as 'account' | 'creditCard',
        installments: 1,
        supplierId: '',
        description: 'Compras do mercado'
    });

    const loadData = async () => {
        try {
            const [itemsData, productsData, accountsData, creditCardsData, categoriesData, suppliersData] = await Promise.all([
                ShoppingListService.getPending(),
                ProductsService.getAll(),
                AccountsService.getAll(),
                CreditCardsService.getAll(),
                CategoriesService.getAll(),
                SuppliersService.getAll()
            ]);
            setItems(itemsData);
            setProducts(productsData);
            setAccounts(accountsData.filter(a => a.isActive));
            setCreditCards(creditCardsData);
            setCategories(categoriesData.filter(c => c.type === 'Expense'));
            setSuppliers(suppliersData);
        } catch (error) {
            console.error('Erro ao carregar dados', error);
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
            await ShoppingListService.addItem(formData);
            setFormData({ productId: undefined, name: '', quantity: 1, unit: 'un' });
            setShowForm(false);
            loadData();
        } catch (error) {
            console.error('Erro ao adicionar item', error);
        }
    };

    const handleRemove = async (id: string) => {
        try {
            await ShoppingListService.removeItem(id);
            loadData();
        } catch (error) {
            console.error('Erro ao remover item', error);
        }
    };

    const handleProductSelect = (productId: string) => {
        const product = products.find(p => p.id === productId);
        if (product) {
            setFormData({
                productId: product.id,
                name: product.name,
                quantity: 1,
                unit: product.unit
            });
        }
    };

    const startCheckout = () => {
        // Include all items, even ad-hoc ones
        const checkoutFormItems: CheckoutFormItem[] = items.map(item => ({
            shoppingListItemId: item.id,
            productId: item.productId,
            name: item.name,
            quantity: item.quantity,
            unitPrice: item.estimatedPrice || 0
        }));
        setCheckoutItems(checkoutFormItems);
        setShowCheckout(true);
    };

    const handleCheckout = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!checkoutData.categoryId) {
            alert('Selecione a categoria');
            return;
        }

        if (checkoutData.paymentMethod === 'account' && !checkoutData.accountId) {
            alert('Selecione a conta');
            return;
        }

        if (checkoutData.paymentMethod === 'creditCard' && !checkoutData.creditCardId) {
            alert('Selecione o cartão de crédito');
            return;
        }

        if (checkoutItems.some(i => i.unitPrice <= 0)) {
            alert('Informe o preço de todos os itens');
            return;
        }

        try {
            const items: CheckoutItemRequest[] = checkoutItems.map(item => ({
                productId: item.productId,
                name: item.name, // Pass name for ad-hoc creation
                shoppingListItemId: item.shoppingListItemId,
                quantity: item.quantity,
                unitPrice: item.unitPrice
            }));

            const request: CheckoutRequest = {
                items,
                categoryId: checkoutData.categoryId,
                accountId: checkoutData.paymentMethod === 'account' ? checkoutData.accountId : undefined,
                creditCardId: checkoutData.paymentMethod === 'creditCard' ? checkoutData.creditCardId : undefined,
                installmentCount: checkoutData.paymentMethod === 'creditCard' ? checkoutData.installments : 1,
                supplierId: checkoutData.supplierId || undefined,
                purchaseDate: new Date().toISOString(),
                description: checkoutData.description
            };

            const result = await ShoppingListService.checkout(request);
            alert(`Compra registrada! Total: R$ ${result.total.toFixed(2)}`);
            setShowCheckout(false);
            setCheckoutItems([]);
            loadData();
        } catch (error) {
            console.error('Erro ao finalizar compra', error);
            alert('Erro ao finalizar compra');
        }
    };

    const updateCheckoutItemPrice = (index: number, price: number) => {
        const updated = [...checkoutItems];
        updated[index].unitPrice = price;
        setCheckoutItems(updated);
    };

    const totalEstimated = items.reduce((sum, item) => sum + (item.estimatedPrice || 0) * item.quantity, 0);
    const totalCheckout = checkoutItems.reduce((sum, item) => sum + item.unitPrice * item.quantity, 0);

    if (loading) return <div className="page"><div className="loading">Carregando...</div></div>;

    return (
        <div className="page">
            <header className="page-header">
                <div>
                    <h1 className="page-title">Lista de Compras</h1>
                    <p className="page-description">Organize suas compras do mercado</p>
                </div>
                <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
                    {items.length > 0 && (
                        <button
                            className="btn btn-success"
                            onClick={startCheckout}
                            style={{ background: 'linear-gradient(135deg, #10b981, #059669)' }}
                        >
                            🛒 Finalizar Compra
                        </button>
                    )}
                    <button
                        className="btn btn-primary"
                        onClick={() => setShowForm(!showForm)}
                    >
                        {showForm ? '✕ Cancelar' : '+ Adicionar Item'}
                    </button>
                </div>
            </header>

            {/* Summary */}
            <div className="glass-panel" style={{ marginBottom: '1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                    <span style={{ fontSize: '2rem', marginRight: '0.5rem' }}>🛒</span>
                    <span style={{ fontSize: '1.25rem' }}>{items.length} itens na lista</span>
                </div>
                <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>Estimativa</div>
                    <div style={{ fontSize: '1.5rem', fontWeight: 'bold' }}>R$ {totalEstimated.toFixed(2)}</div>
                </div>
            </div>

            {/* Add Item Form */}
            {showForm && (
                <div className="glass-panel" style={{ marginBottom: '2rem' }}>
                    <h3 style={{ marginBottom: '1.5rem' }}>Adicionar à Lista</h3>
                    <form onSubmit={handleSubmit} className="form">
                        <div className="form-row">
                            <div className="form-group" style={{ flex: 2 }}>
                                <label className="form-label">Produto Cadastrado</label>
                                <select
                                    className="form-input"
                                    value={formData.productId || ''}
                                    onChange={(e) => handleProductSelect(e.target.value)}
                                >
                                    <option value="">Selecionar produto...</option>
                                    {products.filter(p => p.isActive).map(product => (
                                        <option key={product.id} value={product.id}>
                                            {product.name} ({product.unit})
                                        </option>
                                    ))}
                                </select>
                            </div>

                            <div className="form-group" style={{ flex: 2 }}>
                                <label className="form-label">Ou digite um nome</label>
                                <input
                                    type="text"
                                    className="form-input"
                                    value={formData.name}
                                    onChange={(e) => setFormData({ ...formData, name: e.target.value, productId: undefined })}
                                    placeholder="Item avulso..."
                                />
                            </div>

                            <div className="form-group">
                                <label className="form-label">Quantidade</label>
                                <input
                                    type="number"
                                    className="form-input"
                                    value={formData.quantity}
                                    onChange={(e) => setFormData({ ...formData, quantity: Number(e.target.value) })}
                                    min="0.1"
                                    step="0.1"
                                    required
                                />
                            </div>
                        </div>

                        <button type="submit" className="btn btn-primary" style={{ marginTop: '1rem' }}>
                            Adicionar à Lista
                        </button>
                    </form>
                </div>
            )}

            {/* Checkout Modal */}
            {showCheckout && (
                <div className="glass-panel" style={{ marginBottom: '2rem', borderLeft: '4px solid #10b981' }}>
                    <h3 style={{ marginBottom: '1.5rem', color: '#10b981' }}>🛒 Finalizar Compra</h3>
                    <form onSubmit={handleCheckout} className="form">
                        <div className="form-row">
                            <div className="form-group">
                                <label className="form-label">Categoria</label>
                                <select
                                    className="form-input"
                                    value={checkoutData.categoryId}
                                    onChange={(e) => setCheckoutData({ ...checkoutData, categoryId: e.target.value })}
                                    required
                                >
                                    <option value="">Selecionar...</option>
                                    {categories.map(cat => (
                                        <option key={cat.id} value={cat.id}>{cat.icon} {cat.name}</option>
                                    ))}
                                </select>
                            </div>
                            <div className="form-group">
                                <label className="form-label">Forma de Pagamento</label>
                                <select
                                    className="form-input"
                                    value={checkoutData.paymentMethod}
                                    onChange={(e) => setCheckoutData({ ...checkoutData, paymentMethod: e.target.value as any })}
                                >
                                    <option value="account">Conta</option>
                                    <option value="creditCard">Cartão de Crédito</option>
                                </select>
                            </div>

                            {checkoutData.paymentMethod === 'account' ? (
                                <div className="form-group">
                                    <label className="form-label">Conta</label>
                                    <select
                                        className="form-input"
                                        value={checkoutData.accountId}
                                        onChange={(e) => setCheckoutData({ ...checkoutData, accountId: e.target.value })}
                                        required
                                    >
                                        <option value="">Selecionar...</option>
                                        {accounts.map(acc => (
                                            <option key={acc.id} value={acc.id}>{acc.name}</option>
                                        ))}
                                    </select>
                                </div>
                            ) : (
                                <>
                                    <div className="form-group">
                                        <label className="form-label">Cartão</label>
                                        <select
                                            className="form-input"
                                            value={checkoutData.creditCardId}
                                            onChange={(e) => setCheckoutData({ ...checkoutData, creditCardId: e.target.value })}
                                            required
                                        >
                                            <option value="">Selecionar...</option>
                                            {creditCards.map(card => (
                                                <option key={card.id} value={card.id}>{card.name}</option>
                                            ))}
                                        </select>
                                    </div>
                                    <div className="form-group">
                                        <label className="form-label">Parcelas</label>
                                        <select
                                            className="form-input"
                                            value={checkoutData.installments}
                                            onChange={(e) => setCheckoutData({ ...checkoutData, installments: Number(e.target.value) })}
                                        >
                                            {[...Array(12)].map((_, i) => (
                                                <option key={i + 1} value={i + 1}>{i + 1}x</option>
                                            ))}
                                        </select>
                                    </div>
                                </>
                            )}
                            <div className="form-group">
                                <label className="form-label">Fornecedor</label>
                                <select
                                    className="form-input"
                                    value={checkoutData.supplierId}
                                    onChange={(e) => setCheckoutData({ ...checkoutData, supplierId: e.target.value })}
                                >
                                    <option value="">Nenhum/Outro</option>
                                    {suppliers.map(s => (
                                        <option key={s.id} value={s.id}>{s.name}</option>
                                    ))}
                                </select>
                            </div>
                            <div className="form-group" style={{ flex: 2 }}>
                                <label className="form-label">Descrição</label>
                                <input
                                    type="text"
                                    className="form-input"
                                    value={checkoutData.description}
                                    onChange={(e) => setCheckoutData({ ...checkoutData, description: e.target.value })}
                                />
                            </div>
                        </div>

                        <h4 style={{ marginTop: '1.5rem', marginBottom: '1rem' }}>Itens da Compra</h4>
                        <table>
                            <thead>
                                <tr>
                                    <th>Produto</th>
                                    <th>Qtd</th>
                                    <th>Preço Unit.</th>
                                    <th>Total</th>
                                </tr>
                            </thead>
                            <tbody>
                                {checkoutItems.map((item, index) => (
                                    <tr key={item.shoppingListItemId}>
                                        <td>{item.name}</td>
                                        <td>{item.quantity}</td>
                                        <td>
                                            <input
                                                type="number"
                                                className="form-input"
                                                value={item.unitPrice}
                                                onChange={(e) => updateCheckoutItemPrice(index, Number(e.target.value))}
                                                min="0.01"
                                                step="0.01"
                                                style={{ width: '100px' }}
                                                required
                                            />
                                        </td>
                                        <td>R$ {(item.quantity * item.unitPrice).toFixed(2)}</td>
                                    </tr>
                                ))}
                            </tbody>
                            <tfoot>
                                <tr>
                                    <td colSpan={3} style={{ textAlign: 'right', fontWeight: 'bold' }}>Total:</td>
                                    <td style={{ fontWeight: 'bold', fontSize: '1.25rem' }}>R$ {totalCheckout.toFixed(2)}</td>
                                </tr>
                            </tfoot>
                        </table>

                        <div style={{ display: 'flex', gap: '1rem', marginTop: '1.5rem' }}>
                            <button type="submit" className="btn btn-primary" style={{ background: 'linear-gradient(135deg, #10b981, #059669)' }}>
                                ✓ Confirmar Compra
                            </button>
                            <button type="button" className="btn btn-secondary" onClick={() => setShowCheckout(false)}>
                                Cancelar
                            </button>
                        </div>
                    </form>
                </div>
            )}

            {/* Shopping List Items */}
            <div className="glass-panel">
                {items.length === 0 ? (
                    <p className="empty-state">Sua lista de compras está vazia. Adicione itens!</p>
                ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                        {items.map(item => (
                            <div
                                key={item.id}
                                style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'space-between',
                                    padding: '0.75rem 1rem',
                                    background: 'rgba(255,255,255,0.05)',
                                    borderRadius: '0.5rem'
                                }}
                            >
                                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                                    <span style={{ fontSize: '1.25rem' }}>🛒</span>
                                    <div>
                                        <div style={{ fontWeight: 'bold' }}>{item.name}</div>
                                        <div style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
                                            {item.quantity} {item.unit || 'un'}
                                            {item.estimatedPrice && ` • Est. R$ ${(item.estimatedPrice * item.quantity).toFixed(2)}`}
                                        </div>
                                    </div>
                                </div>
                                <button
                                    className="btn btn-secondary"
                                    style={{ padding: '0.25rem 0.5rem' }}
                                    onClick={() => handleRemove(item.id)}
                                >
                                    ✕
                                </button>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}
