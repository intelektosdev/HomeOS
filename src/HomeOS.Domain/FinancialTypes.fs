namespace HomeOS.Domain.FinancialTypes

open System

type Money = decimal

type TransactionType =
    | Income
    | Expense   

// Dicriminated Union: O status carrega dadso consigo
// Só existe data de pagamento se estiver 'Paid'
type TransactionStatus =
    | Pending
    | Paid of paidAt: DateTime
    | Conciliated of conciliatedAt: DateTime
    | Cancelled of reason: string

// --- ENTIDADE ---
type Transaction =
    {
        Id: Guid
        Description: string
        Type: TransactionType
        Status: TransactionStatus
        Amount: Money
        DueDate: DateTime
        CreatedAt: DateTime
    }

// --- COMPORTAMENTO (MODULE) ---
// EM f#, SEPARAMOS OS DADOS (tYPE) DO COMPORTAMENTO (MODULE)
module TransactionModule =

// Tipo de erro para retorno (Result Pattern)
    type DomainError =
        | AmountMustBePositive
        | PaymentDateCannotBeInFuture
        | TransactionAlreadyPaid
        | TransactionIsCancelled
        
    // Factory: Criação de uma nova despesa
    let createExpense (description: string) (amount: Money) (dueDate: DateTime) : Result<Transaction, DomainError> =
        if amount <= 0m then
            Error AmountMustBePositive
        else
            Ok {
                Id = Guid.NewGuid()
                Description = description
                Type = Expense
                Status = Pending
                Amount = amount
                DueDate = dueDate
                CreatedAt = DateTime.Now
            }
    
    // Função Pura: Recebe transação atual -> Retorna nova transação ou Erro
    let pay (transaction: Transaction) (paymentDate: DateTime) : Result<Transaction, DomainError> =
        // Validação 1:Data futura
        if paymentDate > DateTime.Now then
            Error PaymentDateCannotBeInFuture
        else
            // Pattern Matching no Status atual
            match transaction.Status with
            | Pending ->
                // sucesso: Retornacopia atualizada (Imutabilidade)
                Ok {
                    transaction with
                        Status = Paid paymentDate
                }
            | Paid _ | Conciliated _ ->
                Error TransactionAlreadyPaid
            | Cancelled _ ->
                Error TransactionIsCancelled