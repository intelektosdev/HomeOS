import { useState } from 'react';
import { TransactionList } from '../components/TransactionList';
import { TransactionForm } from '../components/TransactionForm';
import type { TransactionResponse } from '../types';
import { TransactionsService } from '../services/api';

export function Dashboard() {
    // Adding state just to support the list props, though full management is on Transactions page
    const [refreshTrigger, setRefreshTrigger] = useState(0);
    const [showForm, setShowForm] = useState(false);
    const [editingTransaction, setEditingTransaction] = useState<TransactionResponse | undefined>(undefined);

    const handleSuccess = () => {
        setShowForm(false);
        setEditingTransaction(undefined);
        setRefreshTrigger(prev => prev + 1);
    };

    const handleEdit = (t: TransactionResponse) => {
        setEditingTransaction(t);
        setShowForm(true);
    };

    const handleCancel = async (t: TransactionResponse) => {
        if (!confirm(`Cancelar "${t.description}"?`)) return;
        try {
            await TransactionsService.cancel(t.id, 'Dashboard cancel');
            setRefreshTrigger(prev => prev + 1);
        } catch (e) { console.error(e); }
    };

    const handleConciliate = async (t: TransactionResponse) => {
        if (!confirm(`Conciliar "${t.description}"?`)) return;
        try {
            await TransactionsService.conciliate(t.id);
            setRefreshTrigger(prev => prev + 1);
        } catch (e) { console.error(e); }
    };

    const handlePay = async (t: TransactionResponse) => {
        if (!confirm(`Pagar "${t.description}"?`)) return;
        try {
            await TransactionsService.pay(t.id);
            setRefreshTrigger(prev => prev + 1);
        } catch (e) { console.error(e); }
    };

    return (
        <div className="page">
            <header className="page-header">
                <div>
                    <h1 className="page-title">Dashboard</h1>
                    <p className="page-description">Visão geral das suas finanças</p>
                </div>
                <button className="btn btn-primary" onClick={() => setShowForm(!showForm)}>
                    {showForm ? 'Fechar' : '+ Nova Transação'}
                </button>
            </header>

            {showForm && (
                <div style={{ marginBottom: '2rem' }}>
                    <TransactionForm
                        transaction={editingTransaction}
                        onSuccess={handleSuccess}
                        onCancel={() => setShowForm(false)}
                    />
                </div>
            )}

            <TransactionList
                onEdit={handleEdit}
                onCancel={handleCancel}
                onConciliate={handleConciliate}
                onPay={handlePay}
                refreshTrigger={refreshTrigger}
            />
        </div>
    );
}
