namespace HomeOS.Domain.FinancialTypes

open System

type Money = decimal

type TransactionType =
    | Income
    | Expense

type AccountType =
    | Checking
    | Wallet
    | Investment

// Novo Type para garantir a regra de negócio do SQL:
// Ou é Débito em Conta ou é Crédito no Cartão
type TransactionSource =
    | FromAccount of accountId: Guid
    | FromCreditCard of creditCardId: Guid

// Dicriminated Union: O status carrega dados consigo
// Só existe data de pagamento se estiver 'Paid'
type TransactionStatus =
    | Pending
    | Paid of paidAt: DateTime
    | Conciliated of conciliatedAt: DateTime
    | Cancelled of reason: string

// --- ENTIDADES ---

type Category =
    { Id: Guid
      Name: string
      Type: TransactionType
      Icon: string option }

type Account =
    { Id: Guid
      Name: string
      Type: AccountType
      InitialBalance: Money
      IsActive: bool }

type CreditCard =
    { Id: Guid
      Name: string
      ClosingDay: int
      DueDay: int
      Limit: Money }

type Transaction =
    { Id: Guid
      Description: string
      Type: TransactionType
      Status: TransactionStatus
      Amount: Money
      DueDate: DateTime
      CreatedAt: DateTime
      // Novos campos
      CategoryId: Guid
      Source: TransactionSource }

// --- COMPORTAMENTOS (MODULES) ---

module CategoryModule =
    let create (name: string) (catType: TransactionType) (icon: string option) =
        { Id = Guid.NewGuid()
          Name = name
          Type = catType
          Icon = icon }

module AccountModule =
    let create (name: string) (accType: AccountType) (initialBalance: Money) =
        { Id = Guid.NewGuid()
          Name = name
          Type = accType
          InitialBalance = initialBalance
          IsActive = true }

    let toggleActive (account: Account) =
        { account with
            IsActive = not account.IsActive }

    let update (account: Account) (name: string) (accType: AccountType) (initialBalance: Money) =
        { account with
            Name = name
            Type = accType
            InitialBalance = initialBalance }

module CreditCardModule =
    type CreditCardError =
        | InvalidClosingDay
        | InvalidDueDay
        | LimitMustBePositive

    let create (name: string) (closingDay: int) (dueDay: int) (limit: Money) : Result<CreditCard, CreditCardError> =
        if closingDay < 1 || closingDay > 31 then
            Error InvalidClosingDay
        elif dueDay < 1 || dueDay > 31 then
            Error InvalidDueDay
        elif limit < 0m then
            Error LimitMustBePositive
        else
            Ok
                { Id = Guid.NewGuid()
                  Name = name
                  ClosingDay = closingDay
                  DueDay = dueDay
                  Limit = limit }

module TransactionModule =

    type DomainError =
        | AmountMustBePositive
        | PaymentDateCannotBeInFuture
        | TransactionAlreadyPaid
        | TransactionIsCancelled

    // Factory: Criação de uma nova despesa
    let createExpense
        (description: string)
        (amount: Money)
        (dueDate: DateTime)
        (categoryId: Guid)
        (source: TransactionSource)
        : Result<Transaction, DomainError> =
        if amount <= 0m then
            Error AmountMustBePositive
        else
            Ok
                { Id = Guid.NewGuid()
                  Description = description
                  Type = Expense
                  Status = Pending
                  Amount = amount
                  DueDate = dueDate
                  CreatedAt = DateTime.Now
                  CategoryId = categoryId
                  Source = source }

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
                Ok
                    { transaction with
                        Status = Paid paymentDate }
            | Paid _
            | Conciliated _ -> Error TransactionAlreadyPaid
            | Cancelled _ -> Error TransactionIsCancelled

    let cancel (transaction: Transaction) (reason: string) : Result<Transaction, DomainError> =
        match transaction.Status with
        | Conciliated _ -> Error TransactionIsCancelled
        | Cancelled _ -> Error TransactionIsCancelled
        | _ ->
            Ok
                { transaction with
                    Status = Cancelled reason }

    let update
        (transaction: Transaction)
        (description: string)
        (amount: Money)
        (dueDate: DateTime)
        (categoryId: Guid)
        (source: TransactionSource)
        : Result<Transaction, DomainError> =

        if amount <= 0m then
            Error AmountMustBePositive
        else
            match transaction.Status with
            | Cancelled _ -> Error TransactionIsCancelled
            | _ ->
                Ok
                    { transaction with
                        Description = description
                        Amount = amount
                        DueDate = dueDate
                        CategoryId = categoryId
                        Source = source }

    let conciliate (transaction: Transaction) (conciliatedAt: DateTime) : Result<Transaction, DomainError> =
        if conciliatedAt > DateTime.Now then
            Error PaymentDateCannotBeInFuture
        else
            match transaction.Status with
            | Cancelled _ -> Error TransactionIsCancelled
            | _ ->
                Ok
                    { transaction with
                        Status = Conciliated conciliatedAt }
