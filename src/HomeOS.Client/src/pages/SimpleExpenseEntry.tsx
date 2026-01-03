import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    AccountsService,
    CategoriesService,
    CreditCardsService,
    TransactionsService,
    CreditCardTransactionsService,
    ProductsService,
    type Product
} from '../services/api';
import type {
    AccountResponse,
    CategoryResponse,
    CreditCardResponse,
    CreateTransactionRequest,
    CreateCreditCardTransactionRequest
} from '../types';

export function SimpleExpenseEntry() {
    // Data from API
    const [categories, setCategories] = useState<CategoryResponse[]>([]);
    const [accounts, setAccounts] = useState<AccountResponse[]>([]);
    const [creditCards, setCreditCards] = useState<CreditCardResponse[]>([]);
    const [products, setProducts] = useState<Product[]>([]);

    // Form state
    const [description, setDescription] = useState('');
    const [amount, setAmount] = useState<number>(0);
    const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
    const [categoryId, setCategoryId] = useState('');
    const [paymentSource, setPaymentSource] = useState<'account' | 'creditCard'>('account');
    const [accountId, setAccountId] = useState('');
    const [creditCardId, setCreditCardId] = useState('');
    const [productId, setProductId] = useState('');

    // Installment fields (credit card only)
    const [enableInstallments, setEnableInstallments] = useState(false);
    const [installmentCount, setInstallmentCount] = useState(2);
    const [interestRate, setInterestRate] = useState(0);

    // UI state
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');
    const [showPostSaveModal, setShowPostSaveModal] = useState(false);
    const navigate = useNavigate();

    // Load initial data
    useEffect(() => {
        Promise.all([
            CategoriesService.getAll(),
            AccountsService.getAll(),
            CreditCardsService.getAll(),
            ProductsService.getAll(false) // only active products
        ]).then(([cats, accs, cards, prods]) => {
            // Filter to show only EXPENSE categories
            const expenseCategories = cats.filter(c => c.type === 'Expense');
            setCategories(expenseCategories);
            setAccounts(accs);
            setCreditCards(cards);
            setProducts(prods);
            setLoading(false);
        }).catch(err => {
            console.error(err);
            setError('Erro ao carregar dados. Tente novamente.');
            setLoading(false);
        });
    }, []);

    // Calculate final amount with interest
    const getFinalAmount = () => {
        if (!enableInstallments || !interestRate || interestRate <= 0) return amount;
        const rateDecimal = interestRate / 100;
        return amount * Math.pow(1 + rateDecimal, installmentCount);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setSuccess('');
        setSubmitting(true);

        // Validation
        if (!description.trim()) {
            setError('Preencha a descrição do gasto');
            setSubmitting(false);
            return;
        }
        if (amount <= 0) {
            setError('O valor deve ser maior que zero');
            setSubmitting(false);
            return;
        }
        if (!categoryId) {
            setError('Selecione uma categoria');
            setSubmitting(false);
            return;
        }
        if (paymentSource === 'account' && !accountId) {
            setError('Selecione uma conta');
            setSubmitting(false);
            return;
        }
        if (paymentSource === 'creditCard' && !creditCardId) {
            setError('Selecione um cartão de crédito');
            setSubmitting(false);
            return;
        }

        try {
            const finalAmount = getFinalAmount();

            if (paymentSource === 'creditCard') {
                // Credit Card Transaction (goes to CreditCardTransactions table)
                const request: CreateCreditCardTransactionRequest = {
                    creditCardId,
                    categoryId,
                    description,
                    amount: finalAmount,
                    transactionDate: date,
                    installments: enableInstallments ? installmentCount : 1,
                    productId: productId || undefined
                };
                await CreditCardTransactionsService.create(request);
            } else {
                // Bank Account Transaction
                const request: CreateTransactionRequest = {
                    description,
                    amount: finalAmount,
                    dueDate: date,
                    categoryId,
                    accountId,
                    productId: productId || undefined
                };
                await TransactionsService.create(request);
            }

            setSuccess('Despesa lançada com sucesso!');
            setShowPostSaveModal(true);
            // Reset form
            setDescription('');
            setAmount(0);
            setDate(new Date().toISOString().split('T')[0]);
            setCategoryId('');
            setAccountId('');
            setCreditCardId('');
            setProductId('');
            setEnableInstallments(false);
            setInstallmentCount(2);
            setInterestRate(0);

        } catch (err: any) {
            console.error(err);
            setError(err.response?.data?.error || 'Erro ao salvar despesa. Tente novamente.');
        } finally {
            setSubmitting(false);
        }
    };

    const handleAddAnother = () => {
        setSuccess('');
        setShowPostSaveModal(false);
    };

    const handleGoToDashboard = () => {
        navigate('/');
    };

    if (loading) {
        return (
            <div className="glass-panel" style={{ padding: '2rem', textAlign: 'center' }}>
                <p>Carregando...</p>
            </div>
        );
    }

    const finalDisplayAmount = getFinalAmount();
    const installmentValue = finalDisplayAmount / (enableInstallments ? installmentCount : 1);

    return (
        <div style={{ maxWidth: '800px', margin: '0 auto', padding: '2rem' }}>
            <h1 style={{ marginBottom: '1.5rem' }}>💸 Lançamento Rápido de Despesa</h1>

            <div className="glass-panel" style={{ padding: '2rem' }}>
                {error && (
                    <div style={{
                        padding: '1rem',
                        marginBottom: '1rem',
                        borderRadius: 'var(--radius-md)',
                        background: 'rgba(239, 68, 68, 0.2)',
                        color: 'var(--color-danger)',
                        fontWeight: 500
                    }}>
                        {error}
                    </div>
                )}

                {success && (
                    <div style={{
                        padding: '1rem',
                        marginBottom: '1rem',
                        borderRadius: 'var(--radius-md)',
                        background: 'rgba(34, 197, 94, 0.2)',
                        color: 'rgb(34, 197, 94)',
                        fontWeight: 500
                    }}>
                        {success}
                    </div>
                )}

                <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                    {/* Description */}
                    <div>
                        <label className="form-label">Descrição</label>
                        <input
                            type="text"
                            className="form-input"
                            placeholder="Ex: Supermercado, Conta de luz..."
                            value={description}
                            onChange={e => setDescription(e.target.value)}
                        />
                    </div>

                    {/* Amount and Date */}
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                        <div>
                            <label className="form-label">Valor (R$)</label>
                            <input
                                type="number"
                                step="0.01"
                                className="form-input"
                                value={amount === 0 ? '' : amount}
                                onChange={e => setAmount(parseFloat(e.target.value) || 0)}
                            />
                        </div>
                        <div>
                            <label className="form-label">Data</label>
                            <input
                                type="date"
                                className="form-input"
                                value={date}
                                onChange={e => setDate(e.target.value)}
                            />
                        </div>
                    </div>

                    {/* Category */}
                    <div>
                        <label className="form-label">Categoria</label>
                        <select
                            className="form-input"
                            value={categoryId}
                            onChange={e => setCategoryId(e.target.value)}
                        >
                            <option value="">Selecione uma categoria...</option>
                            {categories.map(c => (
                                <option key={c.id} value={c.id}>
                                    {c.icon} {c.name}
                                </option>
                            ))}
                        </select>
                    </div>

                    {/* Payment Source */}
                    <div>
                        <label className="form-label">Forma de Pagamento</label>
                        <div style={{ display: 'flex', gap: '1rem', marginBottom: '1rem' }}>
                            <button
                                type="button"
                                className={`btn ${paymentSource === 'account' ? 'btn-primary' : 'btn-secondary'}`}
                                style={{ flex: 1 }}
                                onClick={() => {
                                    setPaymentSource('account');
                                    setCreditCardId('');
                                    setEnableInstallments(false);
                                }}
                            >
                                🏦 Conta
                            </button>
                            <button
                                type="button"
                                className={`btn ${paymentSource === 'creditCard' ? 'btn-primary' : 'btn-secondary'}`}
                                style={{ flex: 1 }}
                                onClick={() => {
                                    setPaymentSource('creditCard');
                                    setAccountId('');
                                }}
                            >
                                💳 Cartão de Crédito
                            </button>
                        </div>

                        {/* Account or Credit Card Selector */}
                        {paymentSource === 'account' ? (
                            <select
                                className="form-input"
                                value={accountId}
                                onChange={e => setAccountId(e.target.value)}
                            >
                                <option value="">Selecione uma conta...</option>
                                {accounts.map(a => (
                                    <option key={a.id} value={a.id}>{a.name}</option>
                                ))}
                            </select>
                        ) : (
                            <>
                                <select
                                    className="form-input"
                                    value={creditCardId}
                                    onChange={e => setCreditCardId(e.target.value)}
                                >
                                    <option value="">Selecione um cartão...</option>
                                    {creditCards.map(cc => (
                                        <option key={cc.id} value={cc.id}>{cc.name}</option>
                                    ))}
                                </select>

                                {/* Installments Section (Credit Card Only) */}
                                <div style={{
                                    marginTop: '1rem',
                                    padding: '1rem',
                                    border: '1px dashed var(--color-border)',
                                    borderRadius: 'var(--radius-md)',
                                    background: 'var(--color-bg-secondary)'
                                }}>
                                    <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', fontWeight: 500 }}>
                                        <input
                                            type="checkbox"
                                            checked={enableInstallments}
                                            onChange={e => setEnableInstallments(e.target.checked)}
                                        />
                                        Parcelar compra
                                    </label>

                                    {enableInstallments && (
                                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginTop: '1rem' }}>
                                            <div>
                                                <label className="form-label">Nº de Parcelas</label>
                                                <input
                                                    type="number"
                                                    min="2"
                                                    max="36"
                                                    className="form-input"
                                                    value={installmentCount}
                                                    onChange={e => setInstallmentCount(parseInt(e.target.value) || 2)}
                                                />
                                            </div>
                                            <div>
                                                <label className="form-label">Juros (% a.m.)</label>
                                                <input
                                                    type="number"
                                                    step="0.01"
                                                    min="0"
                                                    className="form-input"
                                                    value={interestRate}
                                                    onChange={e => setInterestRate(parseFloat(e.target.value) || 0)}
                                                />
                                            </div>
                                            <div style={{ gridColumn: 'span 2' }}>
                                                <small style={{ color: 'var(--color-text-tertiary)', display: 'block' }}>
                                                    Total com Juros: <strong>{finalDisplayAmount.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</strong>
                                                </small>
                                                <small style={{ color: 'var(--color-text-tertiary)', display: 'block', marginTop: '0.25rem' }}>
                                                    {installmentCount}x de <strong>{installmentValue.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</strong>
                                                </small>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </>
                        )}
                    </div>

                    {/* Product (Optional) */}
                    <div>
                        <label className="form-label">Produto (Opcional)</label>
                        <select
                            className="form-input"
                            value={productId}
                            onChange={e => setProductId(e.target.value)}
                        >
                            <option value="">Nenhum produto vinculado</option>
                            {products.map(p => (
                                <option key={p.id} value={p.id}>{p.name}</option>
                            ))}
                        </select>
                    </div>

                    {/* Submit Button */}
                    <button
                        type="submit"
                        className="btn btn-primary"
                        disabled={submitting}
                        style={{ fontSize: '1.1rem', padding: '1rem' }}
                    >
                        {submitting ? 'Salvando...' : '✅ Salvar Despesa'}
                    </button>
                </form>
            </div>

            {showPostSaveModal && (
                <div className="modal-overlay">
                    <div className="modal" style={{ textAlign: 'center' }}>
                        <h2 style={{ marginBottom: '1rem' }}>🎉 Lançamento Realizado!</h2>
                        <p style={{ color: 'var(--color-text-secondary)', marginBottom: '2rem' }}>
                            Sua despesa foi salva com sucesso. O que deseja fazer agora?
                        </p>
                        <div className="modal-actions" style={{ justifyContent: 'center' }}>
                            <button className="btn btn-secondary" onClick={handleGoToDashboard}>
                                🏠 Ir para Dashboard
                            </button>
                            <button className="btn btn-primary" onClick={handleAddAnother}>
                                ➕ Outro Lançamento
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
