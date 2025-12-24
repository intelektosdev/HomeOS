import { useState, useEffect } from 'react';
import { RecurringTransactionsService } from '../services/api';
import { CategoriesService, AccountsService, CreditCardsService } from '../services/api';
import type {
    RecurringTransactionResponse,
    CategoryResponse,
    AccountResponse,
    CreditCardResponse,
    RecurrenceFrequency,
    AmountType
} from '../types';

export function RecurringTransactions() {
    const [recurrings, setRecurrings] = useState<RecurringTransactionResponse[]>([]);
    const [categories, setCategories] = useState<CategoryResponse[]>([]);
    const [accounts, setAccounts] = useState<AccountResponse[]>([]);
    const [creditCards, setCreditCards] = useState<CreditCardResponse[]>([]);
    const [loading, setLoading] = useState(true);
    const [showForm, setShowForm] = useState(false);
    const [editingId, setEditingId] = useState<string | null>(null);
    const [includeInactive, setIncludeInactive] = useState(false);

    useEffect(() => {
        loadData();
    }, [includeInactive]);

    const loadData = async () => {
        setLoading(true);
        try {
            const [recurringData, categoriesData, accountsData, cardsData] = await Promise.all([
                RecurringTransactionsService.getAll(includeInactive),
                CategoriesService.getAll(),
                AccountsService.getAll(),
                CreditCardsService.getAll()
            ]);
            setRecurrings(recurringData);
            setCategories(categoriesData);
            setAccounts(accountsData);
            setCreditCards(cardsData);
            console.log('Loaded data:', {
                categories: categoriesData.length,
                accounts: accountsData.length,
                creditCards: cardsData.length
            });
        } catch (error) {
            console.error('Failed to load data', error);
        } finally {
            setLoading(false);
        }
    };

    const handleEdit = (id: string) => {
        setEditingId(id);
        setShowForm(true);
    };

    const handleDelete = async (id: string) => {
        if (!confirm('Deseja realmente excluir esta recorrência?')) return;

        try {
            await RecurringTransactionsService.delete(id);
            await loadData();
        } catch (error) {
            console.error('Failed to delete', error);
            alert('Erro ao excluir recorrência');
        }
    };

    const handleToggle = async (id: string) => {
        try {
            await RecurringTransactionsService.toggle(id);
            await loadData();
        } catch (error) {
            console.error('Failed to toggle', error);
            alert('Erro ao alternar status');
        }
    };

    const handleFormClose = () => {
        setShowForm(false);
        setEditingId(null);
        loadData();
    };

    const getFrequencyLabel = (freq: RecurrenceFrequency): string => {
        const labels: Record<RecurrenceFrequency, string> = {
            'Daily': 'Diária',
            'Weekly': 'Semanal',
            'Biweekly': 'Quinzenal',
            'Monthly': 'Mensal',
            'Bimonthly': 'Bimestral',
            'Quarterly': 'Trimestral',
            'Semiannual': 'Semestral',
            'Annual': 'Anual'
        };
        return labels[freq];
    };

    const getCategoryName = (id: string) => {
        return categories.find(c => c.id === id)?.name || 'Sem Categoria';
    };

    const getSourceName = (recurring: RecurringTransactionResponse) => {
        if (recurring.accountId) {
            return accounts.find(a => a.id === recurring.accountId)?.name || 'Conta';
        }
        if (recurring.creditCardId) {
            return creditCards.find(c => c.id === recurring.creditCardId)?.name || 'Cartão';
        }
        return 'N/A';
    };

    const formatAmount = (amount: number) => {
        return amount.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
    };

    const formatDate = (dateStr: string) => {
        return new Date(dateStr).toLocaleDateString('pt-BR');
    };

    if (loading && recurrings.length === 0) {
        return (
            <div className="page">
                <div className="glass-panel" style={{ padding: '2rem', textAlign: 'center' }}>
                    Carregando...
                </div>
            </div>
        );
    }

    if (showForm) {
        // Show loading only if data is still being fetched
        if (loading) {
            return (
                <div className="page">
                    <div className="glass-panel" style={{ padding: '2rem', textAlign: 'center' }}>
                        Carregando dados...
                    </div>
                </div>
            );
        }


        return (
            <RecurringTransactionForm
                editingId={editingId}
                categories={categories}
                accounts={accounts}
                creditCards={creditCards}
                onClose={handleFormClose}
            />
        );
    }

    return (
        <div className="page">
            <header className="page-header">
                <div>
                    <h1 className="page-title">Transações Recorrentes</h1>
                    <p className="page-description">Automação de receitas e despesas periódicas</p>
                </div>
                <button className="btn btn-primary" onClick={() => setShowForm(true)}>
                    + Nova Recorrência
                </button>
            </header>

            <div className="glass-panel" style={{ padding: '1.5rem', marginBottom: '2rem' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}>
                    <input
                        type="checkbox"
                        checked={includeInactive}
                        onChange={(e) => setIncludeInactive(e.target.checked)}
                    />
                    Mostrar inativas
                </label>
            </div>

            {recurrings.length === 0 ? (
                <div className="glass-panel" style={{ padding: '3rem', textAlign: 'center' }}>
                    <p style={{ color: 'var(--text-secondary)', marginBottom: '1rem' }}>
                        Nenhuma transação recorrente cadastrada
                    </p>
                    <button className="btn btn-primary" onClick={() => setShowForm(true)}>
                        Criar Primeira Recorrência
                    </button>
                </div>
            ) : (
                <div style={{ display: 'grid', gap: '1.5rem' }}>
                    {recurrings.map((recurring) => (
                        <div key={recurring.id} className="glass-panel" style={{ padding: '1.5rem' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: '1rem' }}>
                                <div style={{ flex: 1 }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.5rem' }}>
                                        <h3 style={{ margin: 0, fontSize: '1.25rem' }}>{recurring.description}</h3>
                                        <span
                                            className="badge"
                                            style={{
                                                background: recurring.type === 'Income' ? 'var(--income-color)' : 'var(--expense-color)',
                                                color: 'white'
                                            }}
                                        >
                                            {recurring.type === 'Income' ? 'Receita' : 'Despesa'}
                                        </span>
                                        {!recurring.isActive && (
                                            <span className="badge" style={{ background: '#666' }}>Inativa</span>
                                        )}
                                    </div>
                                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem', marginTop: '1rem' }}>
                                        <div>
                                            <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginBottom: '0.25rem' }}>
                                                Valor
                                            </div>
                                            <div style={{ fontSize: '1.125rem', fontWeight: 'bold' }}>
                                                {recurring.amountType === 'Variable' && '~'}
                                                {formatAmount(recurring.amount)}
                                                {recurring.amountType === 'Variable' && (
                                                    <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginLeft: '0.5rem' }}>
                                                        (variável)
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                        <div>
                                            <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginBottom: '0.25rem' }}>
                                                Frequência
                                            </div>
                                            <div style={{ fontSize: '1.125rem' }}>
                                                {getFrequencyLabel(recurring.frequency)}
                                                {recurring.dayOfMonth && ` - dia ${recurring.dayOfMonth}`}
                                            </div>
                                        </div>
                                        <div>
                                            <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginBottom: '0.25rem' }}>
                                                Próxima Ocorrência
                                            </div>
                                            <div style={{ fontSize: '1.125rem' }}>
                                                {formatDate(recurring.nextOccurrence)}
                                            </div>
                                        </div>
                                        <div>
                                            <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginBottom: '0.25rem' }}>
                                                Categoria / Origem
                                            </div>
                                            <div style={{ fontSize: '1.125rem' }}>
                                                {getCategoryName(recurring.categoryId)} • {getSourceName(recurring)}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                                <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', justifyContent: 'flex-end' }}>
                                    <button
                                        className="btn btn-secondary"
                                        onClick={() => handleToggle(recurring.id)}
                                        style={{ fontSize: '0.875rem' }}
                                    >
                                        {recurring.isActive ? 'Desativar' : 'Ativar'}
                                    </button>
                                    <button
                                        className="btn btn-secondary"
                                        onClick={() => handleEdit(recurring.id)}
                                        style={{ fontSize: '0.875rem' }}
                                    >
                                        Editar
                                    </button>
                                    <button
                                        className="btn btn-danger"
                                        onClick={() => handleDelete(recurring.id)}
                                        style={{ fontSize: '0.875rem' }}
                                    >
                                        Excluir
                                    </button>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}

// Form Component (in the same file for simplicity)
interface RecurringTransactionFormProps {
    editingId: string | null;
    categories: CategoryResponse[];
    accounts: AccountResponse[];
    creditCards: CreditCardResponse[];
    onClose: () => void;
}

function RecurringTransactionForm({ editingId, categories, accounts, creditCards, onClose }: RecurringTransactionFormProps) {
    const [loading, setLoading] = useState(false);
    const [formData, setFormData] = useState({
        description: '',
        type: 'Expense' as 'Income' | 'Expense',
        categoryId: '',
        sourceType: 'account' as 'account' | 'creditCard',
        accountId: '',
        creditCardId: '',
        amountType: 'Fixed' as AmountType,
        amount: '',
        frequency: 'Monthly' as RecurrenceFrequency,
        dayOfMonth: '',
        useLastDay: false,
        startDate: new Date().toISOString().split('T')[0],
        endDate: '',
        hasEndDate: false,
        isActive: true
    });

    useEffect(() => {
        if (editingId) {
            loadRecurring();
        }
    }, [editingId]);

    const loadRecurring = async () => {
        if (!editingId) return;

        setLoading(true);
        try {
            const data = await RecurringTransactionsService.getById(editingId);
            setFormData({
                description: data.description,
                type: data.type,
                categoryId: data.categoryId,
                sourceType: data.accountId ? 'account' : 'creditCard',
                accountId: data.accountId || '',
                creditCardId: data.creditCardId || '',
                amountType: data.amountType,
                amount: data.amount.toString(),
                frequency: data.frequency,
                dayOfMonth: data.dayOfMonth?.toString() || '',
                useLastDay: data.dayOfMonth === null || data.dayOfMonth === undefined,
                startDate: data.startDate.split('T')[0],
                endDate: data.endDate ? data.endDate.split('T')[0] : '',
                hasEndDate: !!data.endDate,
                isActive: data.isActive
            });
        } catch (error) {
            console.error('Failed to load recurring', error);
            alert('Erro ao carregar recorrência');
            onClose();
        } finally {
            setLoading(false);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!formData.description || !formData.categoryId || !formData.amount) {
            alert('Preencha todos os campos obrigatórios');
            return;
        }

        if (formData.sourceType === 'account' && !formData.accountId) {
            alert('Selecione uma conta');
            return;
        }

        if (formData.sourceType === 'creditCard' && !formData.creditCardId) {
            alert('Selecione um cartão');
            return;
        }

        setLoading(true);
        try {
            const payload: any = {
                description: formData.description,
                type: formData.type,
                categoryId: formData.categoryId,
                accountId: formData.sourceType === 'account' ? formData.accountId : undefined,
                creditCardId: formData.sourceType === 'creditCard' ? formData.creditCardId : undefined,
                amountType: formData.amountType,
                amount: parseFloat(formData.amount),
                frequency: formData.frequency,
                dayOfMonth: formData.useLastDay ? undefined : (formData.dayOfMonth ? parseInt(formData.dayOfMonth) : undefined),
                startDate: formData.startDate,
                endDate: formData.hasEndDate && formData.endDate ? formData.endDate : undefined,
                isActive: formData.isActive
            };

            if (editingId) {
                await RecurringTransactionsService.update(editingId, payload);
            } else {
                await RecurringTransactionsService.create(payload);
            }

            onClose();
        } catch (error) {
            console.error('Failed to save', error);
            alert('Erro ao salvar recorrência');
        } finally {
            setLoading(false);
        }
    };

    const filteredCategories = categories.filter(c => c.type === formData.type);

    return (
        <div className="page">
            <header className="page-header">
                <h1 className="page-title">{editingId ? 'Editar' : 'Nova'} Recorrência</h1>
                <button className="btn btn-secondary" onClick={onClose}>
                    Voltar
                </button>
            </header>

            <form onSubmit={handleSubmit} className="glass-panel" style={{ padding: '2rem', maxWidth: '800px' }}>
                <div style={{ display: 'grid', gap: '1.5rem' }}>
                    {/* Description */}
                    <div>
                        <label className="form-label">Descrição *</label>
                        <input
                            type="text"
                            className="form-input"
                            value={formData.description}
                            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                            placeholder="Ex: Salário, Conta de Luz, Netflix..."
                            required
                        />
                    </div>

                    {/* Type */}
                    <div>
                        <label className="form-label">Tipo *</label>
                        <div style={{ display: 'flex', gap: '1rem' }}>
                            <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                <input
                                    type="radio"
                                    checked={formData.type === 'Income'}
                                    onChange={() => setFormData({ ...formData, type: 'Income', categoryId: '' })}
                                />
                                Receita
                            </label>
                            <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                <input
                                    type="radio"
                                    checked={formData.type === 'Expense'}
                                    onChange={() => setFormData({ ...formData, type: 'Expense', categoryId: '' })}
                                />
                                Despesa
                            </label>
                        </div>
                    </div>

                    {/* Category */}
                    <div>
                        <label className="form-label">Categoria *</label>
                        <select
                            className="form-input"
                            value={formData.categoryId}
                            onChange={(e) => setFormData({ ...formData, categoryId: e.target.value })}
                            required
                        >
                            <option value="">Selecione...</option>
                            {filteredCategories.map(cat => (
                                <option key={cat.id} value={cat.id}>{cat.name}</option>
                            ))}
                        </select>
                    </div>

                    {/* Source */}
                    <div>
                        <label className="form-label">Origem *</label>
                        <div style={{ display: 'flex', gap: '1rem', marginBottom: '0.5rem' }}>
                            <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                <input
                                    type="radio"
                                    checked={formData.sourceType === 'account'}
                                    onChange={() => setFormData({ ...formData, sourceType: 'account', creditCardId: '' })}
                                />
                                Conta
                            </label>
                            <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                <input
                                    type="radio"
                                    checked={formData.sourceType === 'creditCard'}
                                    onChange={() => setFormData({ ...formData, sourceType: 'creditCard', accountId: '' })}
                                />
                                Cartão de Crédito
                            </label>
                        </div>
                        {formData.sourceType === 'account' ? (
                            <select
                                className="form-input"
                                value={formData.accountId}
                                onChange={(e) => setFormData({ ...formData, accountId: e.target.value })}
                                required
                            >
                                <option value="">Selecione uma conta...</option>
                                {accounts.filter(a => a.isActive).map(acc => (
                                    <option key={acc.id} value={acc.id}>{acc.name}</option>
                                ))}
                            </select>
                        ) : (
                            <select
                                className="form-input"
                                value={formData.creditCardId}
                                onChange={(e) => setFormData({ ...formData, creditCardId: e.target.value })}
                                required
                            >
                                <option value="">Selecione um cartão...</option>
                                {creditCards.map(card => (
                                    <option key={card.id} value={card.id}>{card.name}</option>
                                ))}
                            </select>
                        )}
                    </div>

                    {/* Amount Type & Amount */}
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '1rem' }}>
                        <div>
                            <label className="form-label">Tipo de Valor *</label>
                            <select
                                className="form-input"
                                value={formData.amountType}
                                onChange={(e) => setFormData({ ...formData, amountType: e.target.value as AmountType })}
                            >
                                <option value="Fixed">Fixo</option>
                                <option value="Variable">Variável</option>
                            </select>
                        </div>
                        <div>
                            <label className="form-label">
                                Valor * {formData.amountType === 'Variable' && '(média estimada)'}
                            </label>
                            <input
                                type="number"
                                step="0.01"
                                className="form-input"
                                value={formData.amount}
                                onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                                placeholder="0.00"
                                required
                            />
                        </div>
                    </div>

                    {/* Frequency */}
                    <div>
                        <label className="form-label">Frequência *</label>
                        <select
                            className="form-input"
                            value={formData.frequency}
                            onChange={(e) => setFormData({ ...formData, frequency: e.target.value as RecurrenceFrequency })}
                        >
                            <option value="Daily">Diária</option>
                            <option value="Weekly">Semanal</option>
                            <option value="Biweekly">Quinzenal</option>
                            <option value="Monthly">Mensal</option>
                            <option value="Bimonthly">Bimestral</option>
                            <option value="Quarterly">Trimestral</option>
                            <option value="Semiannual">Semestral</option>
                            <option value="Annual">Anual</option>
                        </select>
                    </div>

                    {/* Day of Month (conditional) */}
                    {['Monthly', 'Bimonthly', 'Quarterly'].includes(formData.frequency) && (
                        <div>
                            <label className="form-label">Dia do Mês</label>
                            <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
                                <input
                                    type="number"
                                    min="1"
                                    max="31"
                                    className="form-input"
                                    value={formData.dayOfMonth}
                                    onChange={(e) => setFormData({ ...formData, dayOfMonth: e.target.value, useLastDay: false })}
                                    placeholder="1-31"
                                    disabled={formData.useLastDay}
                                    style={{ flex: 1 }}
                                />
                                <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', whiteSpace: 'nowrap' }}>
                                    <input
                                        type="checkbox"
                                        checked={formData.useLastDay}
                                        onChange={(e) => setFormData({ ...formData, useLastDay: e.target.checked, dayOfMonth: '' })}
                                    />
                                    Último dia do mês
                                </label>
                            </div>
                        </div>
                    )}

                    {/* Dates */}
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                        <div>
                            <label className="form-label">Data Início *</label>
                            <input
                                type="date"
                                className="form-input"
                                value={formData.startDate}
                                onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                                required
                            />
                        </div>
                        <div>
                            <label className="form-label">
                                <input
                                    type="checkbox"
                                    checked={formData.hasEndDate}
                                    onChange={(e) => setFormData({ ...formData, hasEndDate: e.target.checked, endDate: '' })}
                                    style={{ marginRight: '0.5rem' }}
                                />
                                Data Fim (opcional)
                            </label>
                            <input
                                type="date"
                                className="form-input"
                                value={formData.endDate}
                                onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
                                disabled={!formData.hasEndDate}
                            />
                        </div>
                    </div>

                    {/* Active */}
                    <div>
                        <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            <input
                                type="checkbox"
                                checked={formData.isActive}
                                onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                            />
                            Ativa (gerar automaticamente)
                        </label>
                    </div>

                    {/* Actions */}
                    <div style={{ display: 'flex', gap: '1rem', justifyContent: 'flex-end', marginTop: '1rem' }}>
                        <button type="button" className="btn btn-secondary" onClick={onClose}>
                            Cancelar
                        </button>
                        <button type="submit" className="btn btn-primary" disabled={loading}>
                            {loading ? 'Salvando...' : editingId ? 'Salvar Alterações' : 'Criar Recorrência'}
                        </button>
                    </div>
                </div>
            </form>
        </div>
    );
}
