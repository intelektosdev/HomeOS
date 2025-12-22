import { useEffect, useState } from 'react';
import {
    AccountsService,
    CategoriesService,
    CreditCardsService,
    TransactionsService
} from '../services/api';
import type {
    AccountResponse,
    CategoryResponse,
    CreditCardResponse,
    CreateTransactionRequest,
    TransactionResponse
} from '../types';

interface TransactionFormProps {
    transaction?: TransactionResponse;
    onSuccess: () => void;
    onCancel: () => void;
}

export function TransactionForm({ transaction, onSuccess, onCancel }: TransactionFormProps) {
    const [categories, setCategories] = useState<CategoryResponse[]>([]);
    const [accounts, setAccounts] = useState<AccountResponse[]>([]);
    const [creditCards, setCreditCards] = useState<CreditCardResponse[]>([]);

    const [formData, setFormData] = useState<Partial<CreateTransactionRequest>>({
        description: '',
        amount: 0,
        dueDate: new Date().toISOString().split('T')[0],
        categoryId: '',
        accountId: '',
        creditCardId: ''
    });

    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    useEffect(() => {
        // Load dependencies
        Promise.all([
            CategoriesService.getAll(),
            AccountsService.getAll(),
            CreditCardsService.getAll()
        ]).then(([cats, accs, cards]) => {
            setCategories(cats);
            setAccounts(accs);
            setCreditCards(cards);
            setLoading(false);
        }).catch(err => {
            console.error(err);
            setError('Erro ao carregar dados auxiliares.');
            setLoading(false);
        });
    }, []);

    useEffect(() => {
        if (transaction) {
            setFormData({
                description: transaction.description,
                amount: transaction.amount ?? 0,
                dueDate: transaction.dueDate.split('T')[0],
                categoryId: transaction.categoryId,
                accountId: transaction.accountId || '',
                creditCardId: transaction.creditCardId || ''
            });
        }
    }, [transaction]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');

        if (!formData.description || formData.amount === undefined || formData.amount === null || isNaN(formData.amount) || !formData.categoryId || !formData.dueDate) {
            setError('Preencha os campos obrigatórios e verifique o valor.');
            return;
        }

        if (!formData.accountId && !formData.creditCardId) {
            setError('Selecione uma conta ou cartão de origem.');
            return;
        }

        const requestData: CreateTransactionRequest = {
            ...formData as CreateTransactionRequest,
            accountId: formData.accountId || undefined,
            creditCardId: formData.creditCardId || undefined
        };

        try {
            if (transaction) {
                await TransactionsService.update(transaction.id, requestData);
            } else {
                await TransactionsService.create(requestData);
            }
            onSuccess();
        } catch (err: any) {
            console.error(err);
            setError(err.response?.data?.error || 'Erro ao salvar transação.');
        }
    };

    if (loading) return <div>Carregando formulário...</div>;

    const isCreditCard = !!formData.creditCardId || (!formData.accountId && !formData.creditCardId && transaction?.creditCardId);

    return (
        <div className="glass-panel" style={{ padding: '2rem', maxWidth: '600px', margin: '0 auto' }}>
            <h2 style={{ marginBottom: '1.5rem' }}>
                {transaction ? 'Editar Transação' : 'Nova Transação'}
            </h2>

            {error && (
                <div style={{
                    padding: '1rem',
                    marginBottom: '1rem',
                    borderRadius: 'var(--radius-md)',
                    background: 'rgba(239, 68, 68, 0.2)',
                    color: 'var(--color-danger)'
                }}>
                    {error}
                </div>
            )}

            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                {/* Descrição */}
                <div>
                    <label className="form-label">Descrição</label>
                    <input
                        type="text"
                        className="form-input"
                        placeholder="Ex: Supermercado"
                        value={formData.description || ''}
                        onChange={e => setFormData({ ...formData, description: e.target.value })}
                    />
                </div>

                {/* Valor e Data */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                    <div>
                        <label className="form-label">Valor (R$)</label>
                        <input
                            type="number"
                            step="0.01"
                            className="form-input"
                            value={isNaN(formData.amount ?? 0) ? '' : formData.amount}
                            onChange={e => {
                                const val = parseFloat(e.target.value);
                                setFormData({ ...formData, amount: isNaN(val) ? 0 : val });
                            }}
                        />
                    </div>
                    <div>
                        <label className="form-label">Data Vencimento</label>
                        <input
                            type="date"
                            className="form-input"
                            value={formData.dueDate}
                            onChange={e => setFormData({ ...formData, dueDate: e.target.value })}
                        />
                    </div>
                </div>

                {/* Categoria */}
                <div>
                    <label className="form-label">Categoria</label>
                    <select
                        className="form-input"
                        value={formData.categoryId || ''}
                        onChange={e => setFormData({ ...formData, categoryId: e.target.value })}
                    >
                        <option value="">Selecione...</option>
                        {categories.map(c => (
                            <option key={c.id} value={c.id}>
                                {c.icon} {c.name} ({c.type === 'Income' ? 'Receita' : 'Despesa'})
                            </option>
                        ))}
                    </select>
                </div>

                {/* Origem */}
                <div>
                    <label className="form-label">Origem do Pagamento</label>
                    <div style={{ display: 'flex', gap: '1rem', marginBottom: '0.5rem' }}>
                        <button type="button"
                            className={`btn ${!isCreditCard ? 'btn-primary' : 'btn-secondary'}`}
                            style={{ flex: 1 }}
                            onClick={() => setFormData({ ...formData, accountId: '', creditCardId: undefined })}
                        >
                            Conta
                        </button>
                        <button type="button"
                            className={`btn ${isCreditCard ? 'btn-primary' : 'btn-secondary'}`}
                            style={{ flex: 1 }}
                            onClick={() => setFormData({ ...formData, accountId: undefined, creditCardId: '' })}
                        >
                            Cartão de Crédito
                        </button>
                    </div>

                    {!isCreditCard ? (
                        <select
                            className="form-input"
                            value={formData.accountId || ''}
                            onChange={e => setFormData({ ...formData, accountId: e.target.value, creditCardId: undefined })}
                        >
                            <option value="">Selecione a Conta...</option>
                            {accounts.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
                        </select>
                    ) : (
                        <select
                            className="form-input"
                            value={formData.creditCardId || ''}
                            onChange={e => setFormData({ ...formData, creditCardId: e.target.value, accountId: undefined })}
                        >
                            <option value="">Selecione o Cartão...</option>
                            {creditCards.map(cc => <option key={cc.id} value={cc.id}>{cc.name}</option>)}
                        </select>
                    )}
                </div>

                <div style={{ display: 'flex', gap: '1rem', marginTop: '1rem' }}>
                    <button type="button" className="btn btn-secondary" onClick={onCancel} style={{ flex: 1 }}>
                        Cancelar
                    </button>
                    <button type="submit" className="btn btn-primary" style={{ flex: 1 }}>
                        {transaction ? 'Atualizar' : 'Salvar'}
                    </button>
                </div>

            </form>
        </div>
    );
}
