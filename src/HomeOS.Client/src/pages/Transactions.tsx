import { useState } from 'react';
import { TransactionList } from '../components/TransactionList';
import { TransactionForm } from '../components/TransactionForm';
import type { TransactionResponse } from '../types';
import { TransactionsService } from '../services/api';

export function Transactions() {
    const [showForm, setShowForm] = useState(false);
    const [editingTransaction, setEditingTransaction] = useState<TransactionResponse | undefined>(undefined);
    const [refreshTrigger, setRefreshTrigger] = useState(0);

    const handleSuccess = () => {
        setShowForm(false);
        setEditingTransaction(undefined);
        setRefreshTrigger(prev => prev + 1);
    };

    const handleEdit = (transaction: TransactionResponse) => {
        setEditingTransaction(transaction);
        setShowForm(true);
    };

    const handleCancel = async (transaction: TransactionResponse) => {
        const reason = prompt(`Digite o motivo do cancelamento para "${transaction.description}":`);
        if (reason === null) return; // User pressed Cancel
        if (!reason.trim()) {
            alert('O motivo é obrigatório para cancelar.');
            return;
        }

        try {
            await TransactionsService.cancel(transaction.id, reason);
            setRefreshTrigger(prev => prev + 1);
        } catch (error) {
            console.error('Erro ao cancelar transação', error);
            alert('Erro ao cancelar transação');
        }
    };

    const handleConciliate = async (transaction: TransactionResponse) => {
        if (!confirm('Confirmar conciliação bancária desta transação?')) return;

        try {
            await TransactionsService.conciliate(transaction.id);
            setRefreshTrigger(prev => prev + 1);
        } catch (error) {
            console.error('Erro ao conciliar', error);
            alert('Erro ao conciliar transação.');
        }
    };

    const handlePay = async (transaction: TransactionResponse) => {
        if (!confirm(`Confirmar pagamento de "${transaction.description}"?`)) return;

        try {
            await TransactionsService.pay(transaction.id);
            setRefreshTrigger(prev => prev + 1);
        } catch (error) {
            console.error('Erro ao pagar', error);
            alert('Erro ao pagar transação.');
        }
    };

    return (
        <div className="page">
            <header className="page-header">
                <div>
                    <h1 className="page-title">Transações</h1>
                    <p className="page-description">Gerencie suas receitas e despesas</p>
                </div>
                <button
                    className="btn btn-primary"
                    onClick={() => {
                        setEditingTransaction(undefined);
                        setShowForm(true);
                    }}
                >
                    + Nova Transação
                </button>
            </header>

            {showForm && (
                <div style={{ marginBottom: '2rem' }}>
                    <TransactionForm
                        transaction={editingTransaction}
                        onSuccess={handleSuccess}
                        onCancel={() => {
                            setShowForm(false);
                            setEditingTransaction(undefined);
                        }}
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
