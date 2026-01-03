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

type CreditCardPayment =
    { Id: Guid
      CreditCardId: Guid
      AccountId: Guid
      Amount: Money
      PaymentDate: DateTime
      ReferenceMonth: int } // YYYYMM format

type Transaction =
    { Id: Guid
      Description: string
      Type: TransactionType
      Status: TransactionStatus
      Amount: Money
      DueDate: DateTime
      CreatedAt: DateTime
      CategoryId: Guid
      Source: TransactionSource
      ProductId: Guid option
    // BillPaymentId removed - it belongs to CreditCardTransaction now
    // InstallmentId removed - it belongs to CreditCardTransaction now
    // InstallmentNumber removed - it belongs to CreditCardTransaction now
    // TotalInstallments removed - it belongs to CreditCardTransaction now
    }

// New Entity for Credit Card Transactions
type CreditCardTransactionStatus =
    | Open
    | Invoiced // Fechado na fatura, aguardando pagamento
    | Paid // Fatura paga

type CreditCardTransaction =
    { Id: Guid
      CreditCardId: Guid
      UserId: Guid
      CategoryId: Guid
      Description: string
      Amount: Money
      TransactionDate: DateTime
      CreatedAt: DateTime
      Status: CreditCardTransactionStatus
      InstallmentId: Guid option
      InstallmentNumber: int option
      TotalInstallments: int option
      BillPaymentId: Guid option
      ProductId: Guid option }

// --- COMPORTAMENTOS (MODULES) ---

module CategoryModule =
    let create (name: string) (catType: TransactionType) (icon: string option) =
        { Id = Guid.NewGuid()
          Name = name
          Type = catType
          Icon = icon }

    let update (category: Category) (name: string) (catType: TransactionType) (icon: string option) =
        { category with
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

    let update
        (card: CreditCard)
        (name: string)
        (closingDay: int)
        (dueDay: int)
        (limit: Money)
        : Result<CreditCard, CreditCardError> =
        if closingDay < 1 || closingDay > 31 then
            Error InvalidClosingDay
        elif dueDay < 1 || dueDay > 31 then
            Error InvalidDueDay
        elif limit < 0m then
            Error LimitMustBePositive
        else
            Ok
                { card with
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
                  Source = source
                  ProductId = None }

    // Factory: Criação de uma nova receita
    let createIncome
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
                  Type = Income
                  Status = Pending
                  Amount = amount
                  DueDate = dueDate
                  CreatedAt = DateTime.Now
                  CategoryId = categoryId
                  Source = source
                  ProductId = None }


    // Função Pura: Recebe transação atual -> Retorna nova transação ou Erro
    let pay (transaction: Transaction) (paymentDate: DateTime) : Result<Transaction, DomainError> =
        // Validação 1:Data futura
        if paymentDate > DateTime.Now then
            Error PaymentDateCannotBeInFuture
        else
            // Pattern Matching no Status atual
            match transaction.Status with
            | TransactionStatus.Pending ->
                // sucesso: Retornacopia atualizada (Imutabilidade)
                Ok
                    { transaction with
                        Status = TransactionStatus.Paid paymentDate }
            | TransactionStatus.Paid _
            | TransactionStatus.Conciliated _ -> Error TransactionAlreadyPaid
            | TransactionStatus.Cancelled _ -> Error TransactionIsCancelled

    // addInstallmentDetails removed - Transactions no longer support installments directly (handled by CreditCardTransaction)
    // let addInstallmentDetails (transaction: Transaction) (id: Guid) (number: int) (total: int) : Transaction = ...


    let cancel (transaction: Transaction) (reason: string) : Result<Transaction, DomainError> =
        match transaction.Status with
        | TransactionStatus.Conciliated _ -> Error TransactionIsCancelled
        | TransactionStatus.Cancelled _ -> Error TransactionIsCancelled
        | _ ->
            Ok
                { transaction with
                    Status = TransactionStatus.Cancelled reason }

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
            | TransactionStatus.Cancelled _ -> Error TransactionIsCancelled
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
            | TransactionStatus.Cancelled _ -> Error TransactionIsCancelled
            | _ ->
                Ok
                    { transaction with
                        Status = TransactionStatus.Conciliated conciliatedAt }
