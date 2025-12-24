import { useState, useEffect } from 'react';
import { CreditCardsService, AccountsService } from '../services/api';
import type { CreditCardBalanceResponse, PendingTransaction, AccountResponse } from '../types';

interface CreditCardDetailsProps {
    cardId: string;
    onClose: () => void;
    onPaymentSuccess: () => void;
}

export function CreditCardDetails({ cardId, onClose, onPaymentSuccess }: CreditCardDetailsProps) {
    const [balance, setBalance] = useState<CreditCardBalanceResponse | null>(null);
    const [loading, setLoading] = useState(true);
    const [view, setView] = useState<'details' | 'statement' | 'payment'>('details');

    // Payment & Statement State
    const [pendingTransactions, setPendingTransactions] = useState<PendingTransaction[]>([]);
    const [selectedTransactions, setSelectedTransactions] = useState<Set<string>>(new Set());
    const [accounts, setAccounts] = useState<AccountResponse[]>([]);
    const [selectedAccountId, setSelectedAccountId] = useState<string>('');
    const [referenceMonth, setReferenceMonth] = useState<string>(
        new Date().toISOString().slice(0, 7).replace('-', '') // YYYYMM
    );
    const [processingPayment, setProcessingPayment] = useState(false);

    useEffect(() => {
        loadBalance();
        // Pre-load pending transactions for statement view availability
        loadPendingTransactions();
    }, [cardId]);

    const loadBalance = async () => {
        setLoading(true);
        try {
            const data = await CreditCardsService.getBalance(cardId);
            setBalance(data);
        } catch (error) {
            console.error('Error loading balance', error);
        } finally {
            setLoading(false);
        }
    };

    const loadPendingTransactions = async () => {
        try {
            const data = await CreditCardsService.getPendingTransactions(cardId);
            setPendingTransactions(data);
        } catch (error) {
            console.error('Error loading pending transactions', error);
        }
    };

    const handleStartPayment = async () => {
        setLoading(true);
        try {
            // Ensure transactions are up to date
            const [transactionsData, accountsData] = await Promise.all([
                CreditCardsService.getPendingTransactions(cardId),
                AccountsService.getAll()
            ]);
            setPendingTransactions(transactionsData);
            setAccounts(accountsData);

            const allIds = new Set(transactionsData.map(t => t.id));
            setSelectedTransactions(allIds);

            if (accountsData.length > 0) {
                const defaultAccount = accountsData.find(a => a.type === 'Checking') || accountsData[0];
                setSelectedAccountId(defaultAccount.id);
            }

            setView('payment');
        } catch (error) {
            console.error('Error starting payment flow', error);
        } finally {
            setLoading(false);
        }
    };

    const toggleTransaction = (id: string) => {
        const newSelected = new Set(selectedTransactions);
        if (newSelected.has(id)) {
            newSelected.delete(id);
        } else {
            newSelected.add(id);
        }
        setSelectedTransactions(newSelected);
    };

    const getTotalSelected = () => {
        return pendingTransactions
            .filter(t => selectedTransactions.has(t.id))
            .reduce((sum, t) => sum + t.amount, 0);
    };

    const handleConfirmPayment = async () => {
        if (!selectedAccountId || selectedTransactions.size === 0) return;

        setProcessingPayment(true);
        try {
            await CreditCardsService.payBill(cardId, {
                accountId: selectedAccountId,
                referenceMonth: parseInt(referenceMonth),
                transactionIds: Array.from(selectedTransactions)
            });
            onPaymentSuccess();
            onClose();
        } catch (error) {
            console.error('Payment failed', error);
        } finally {
            setProcessingPayment(false);
        }
    };

    const groupTransactionsByMonth = () => {
        const groups: Record<string, PendingTransaction[]> = {};
        pendingTransactions.forEach(t => {
            const month = t.dueDate.substring(0, 7); // YYYY-MM
            if (!groups[month]) groups[month] = [];
            groups[month].push(t);
        });

        // Sort months
        return Object.entries(groups).sort((a, b) => a[0].localeCompare(b[0]));
    };

    if (loading && !balance && view === 'details') return <div className="modal-overlay"><div className="modal-content glass-panel">Carregando...</div></div>;

    const usedPercentage = balance ? Math.min((balance.usedLimit / balance.limit) * 100, 100) : 0;

    return (
        <div className="modal-overlay">
            <div className="modal-content glass-panel" style={{ maxWidth: '800px', width: '100%', maxHeight: '90vh', overflowY: 'auto' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                    <h2 style={{ margin: 0 }}>
                        {view === 'payment' ? 'Pagar Fatura' : balance?.name || 'Detalhes do Cartão'}
                    </h2>
                    <button onClick={onClose} style={{ background: 'none', border: 'none', fontSize: '1.5rem', cursor: 'pointer', color: 'var(--text-primary)' }}>✕</button>
                </div>

                {/* Navigation Tabs */}
                {view !== 'payment' && (
                    <div style={{ display: 'flex', gap: '1rem', marginBottom: '1.5rem', borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
                        <button
                            className={`btn ${view === 'details' ? 'btn-primary' : 'btn-text'}`}
                            onClick={() => setView('details')}
                            style={{ borderRadius: '0', borderBottom: view === 'details' ? '2px solid var(--primary-color)' : 'none' }}
                        >
                            Resumo
                        </button>
                        <button
                            className={`btn ${view === 'statement' ? 'btn-primary' : 'btn-text'}`}
                            onClick={() => setView('statement')}
                            style={{ borderRadius: '0', borderBottom: view === 'statement' ? '2px solid var(--primary-color)' : 'none' }}
                        >
                            Extrato (Futuro)
                        </button>
                    </div>
                )}

                {view === 'details' && balance && (
                    <div className="details-view">
                        <div className="limit-card" style={{ padding: '1.5rem', background: 'rgba(255,255,255,0.05)', borderRadius: '12px', marginBottom: '2rem' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                                <span>Limite Utilizado</span>
                                <strong>R$ {balance.usedLimit.toFixed(2)}</strong>
                            </div>
                            <div className="progress-bar-container" style={{ height: '12px', background: 'rgba(255,255,255,0.1)', borderRadius: '6px', overflow: 'hidden', marginBottom: '0.5rem' }}>
                                <div
                                    className="progress-bar"
                                    style={{
                                        width: `${usedPercentage}%`,
                                        height: '100%',
                                        background: usedPercentage > 80 ? 'var(--expense-color)' : 'var(--primary-color)',
                                        transition: 'width 0.5s ease'
                                    }}
                                />
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
                                <span>Disponível: R$ {balance.availableLimit.toFixed(2)}</span>
                                <span>Total: R$ {balance.limit.toFixed(2)}</span>
                            </div>
                        </div>

                        <div className="actions" style={{ display: 'flex', gap: '1rem', justifyContent: 'center' }}>
                            <button className="btn btn-primary" onClick={handleStartPayment} style={{ width: '100%' }}>
                                Pagar Fatura
                            </button>
                        </div>
                    </div>
                )}

                {view === 'statement' && (
                    <div className="statement-view">
                        {groupTransactionsByMonth().length === 0 ? (
                            <p style={{ textAlign: 'center', color: 'var(--text-secondary)' }}>Nenhuma compra futura encontrada.</p>
                        ) : (
                            groupTransactionsByMonth().map(([month, transactions]) => (
                                <div key={month} style={{ marginBottom: '2rem' }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', paddingBottom: '0.5rem', borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
                                        <h3 style={{ margin: 0 }}>{new Date(month + '-02').toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })}</h3>
                                        <span style={{ fontWeight: 500, color: 'var(--text-primary)' }}>
                                            R$ {transactions.reduce((acc, t) => acc + t.amount, 0).toFixed(2)}
                                        </span>
                                    </div>
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                                        {transactions.map(t => (
                                            <div key={t.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.5rem', background: 'rgba(255,255,255,0.02)', borderRadius: '8px' }}>
                                                <div>
                                                    <div style={{ fontWeight: 500 }}>
                                                        {t.description}
                                                        {t.installmentNumber && (
                                                            <span style={{ marginLeft: '0.5rem', fontSize: '0.8rem', color: 'var(--primary-color)', background: 'rgba(56, 189, 248, 0.1)', padding: '2px 6px', borderRadius: '4px' }}>
                                                                {t.installmentNumber}/{t.totalInstallments}
                                                            </span>
                                                        )}
                                                    </div>
                                                    <small style={{ color: 'var(--text-secondary)' }}>{new Date(t.dueDate).toLocaleDateString()}</small>
                                                </div>
                                                <div style={{ fontWeight: 'bold' }}>R$ {t.amount.toFixed(2)}</div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                )}

                {view === 'payment' && (
                    <div className="payment-view">
                        <div className="form-group" style={{ marginBottom: '1.5rem' }}>
                            <label className="form-label">Mês de Referência</label>
                            <div style={{ display: 'flex', gap: '1rem' }}>
                                <select
                                    className="form-select"
                                    value={referenceMonth.substring(4, 6)}
                                    onChange={(e) => setReferenceMonth(referenceMonth.substring(0, 4) + e.target.value)}
                                    style={{ flex: 1 }}
                                >
                                    {Array.from({ length: 12 }, (_, i) => {
                                        const month = (i + 1).toString().padStart(2, '0');
                                        return (
                                            <option key={month} value={month}>
                                                {new Date(`2000-${month}-01`).toLocaleDateString('pt-BR', { month: 'long' })}
                                            </option>
                                        );
                                    })}
                                </select>
                                <input
                                    type="number"
                                    className="form-input"
                                    value={referenceMonth.substring(0, 4)}
                                    onChange={(e) => {
                                        const year = e.target.value;
                                        if (year.length <= 4) {
                                            setReferenceMonth(year + referenceMonth.substring(4, 6));
                                        }
                                    }}
                                    placeholder="Ano"
                                    style={{ flex: 1 }}
                                />
                            </div>
                        </div>

                        <div className="form-group" style={{ marginBottom: '1.5rem' }}>
                            <label className="form-label">Conta para Pagamento</label>
                            <select
                                className="form-select"
                                value={selectedAccountId}
                                onChange={(e) => setSelectedAccountId(e.target.value)}
                            >
                                <option value="" disabled>Selecione uma conta</option>
                                {accounts.map(acc => (
                                    <option key={acc.id} value={acc.id}>{acc.name} ({acc.type})</option>
                                ))}
                            </select>
                        </div>

                        <div className="transactions-list" style={{ maxHeight: '300px', overflowY: 'auto', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', padding: '1rem', marginBottom: '1.5rem' }}>
                            {/* ... Existing Payment List ... */}
                            <h4 style={{ marginBottom: '1rem' }}>Transações para Pagar</h4>
                            {pendingTransactions.length === 0 ? (
                                <p style={{ textAlign: 'center', color: 'var(--text-secondary)' }}>Nenhuma transação pendente.</p>
                            ) : (
                                pendingTransactions.map(t => (
                                    <div key={t.id} style={{ display: 'flex', alignItems: 'center', padding: '0.5rem 0', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                                        <input
                                            type="checkbox"
                                            checked={selectedTransactions.has(t.id)}
                                            onChange={() => toggleTransaction(t.id)}
                                            style={{ marginRight: '1rem', width: '18px', height: '18px', cursor: 'pointer' }}
                                        />
                                        <div style={{ flex: 1 }}>
                                            <div style={{ fontWeight: 500 }}>
                                                {t.description}
                                                {t.installmentNumber && (
                                                    <span style={{ marginLeft: '0.5rem', fontSize: '0.75rem', color: 'var(--primary-color)' }}>
                                                        ({t.installmentNumber}/{t.totalInstallments})
                                                    </span>
                                                )}
                                            </div>
                                            <small style={{ color: 'var(--text-secondary)' }}>{new Date(t.dueDate).toLocaleDateString()}</small>
                                        </div>
                                        <div style={{ fontWeight: 'bold' }}>R$ {t.amount.toFixed(2)}</div>
                                    </div>
                                ))
                            )}
                        </div>

                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem', padding: '1rem', background: 'rgba(255,255,255,0.05)', borderRadius: '8px' }}>
                            <span>Total Selecionado:</span>
                            <span style={{ fontSize: '1.2rem', fontWeight: 'bold', color: 'var(--expense-color)' }}>
                                R$ {getTotalSelected().toFixed(2)}
                            </span>
                        </div>

                        <div style={{ display: 'flex', gap: '1rem' }}>
                            <button
                                className="btn btn-secondary"
                                onClick={() => setView('details')}
                                disabled={processingPayment}
                                style={{ flex: 1 }}
                            >
                                Voltar
                            </button>
                            <button
                                className="btn btn-primary"
                                onClick={handleConfirmPayment}
                                disabled={processingPayment || selectedTransactions.size === 0 || !selectedAccountId}
                                style={{ flex: 2 }}
                            >
                                {processingPayment ? 'Processando...' : 'Confirmar Pagamento'}
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
