namespace HomeOS.Domain.DebtTypes

open System

type Money = decimal

// Categoria da Dívida
type DebtCategory =
    | Mortgage // Financiamento Imobiliário
    | PersonalLoan // Empréstimo Pessoal
    | CarLoan // Financiamento de Veículo
    | StudentLoan // Financiamento Estudantil
    | Other of string // Outros

// Tipo de Juros
type InterestType =
    | Fixed of rate: decimal // Taxa fixa (ex: 0.008 = 0.8% a.m.)
    | Variable of indexer: string // Indexado (ex: "CDI + 2%")

// Sistema de Amortização
type AmortizationType =
    | Price // Sistema Francês (parcelas fixas)
    | SAC // Sistema de Amortização Constante
    | Bullet // Pagamento único no final
    | Custom // Personalizado

// Status da Dívida
type DebtStatus =
    | Active
    | PaidOff of paidOffDate: DateTime
    | Refinanced of newDebtId: Guid
    | Defaulted of reason: string

// Entidade Principal
type Debt =
    { Id: Guid
      UserId: Guid
      Name: string
      Category: DebtCategory
      Creditor: string

      // Valores Financeiros
      OriginalAmount: Money
      CurrentBalance: Money
      InterestType: InterestType
      AmortizationType: AmortizationType

      // Prazos
      StartDate: DateTime
      TotalInstallments: int
      InstallmentsPaid: int

      // Controle
      Status: DebtStatus
      LinkedAccountId: Guid option // Conta padrão para débito

      // Observações
      Notes: string option }

// Registro de Pagamento de Parcela
type DebtInstallment =
    { Id: Guid
      DebtId: Guid
      InstallmentNumber: int
      DueDate: DateTime
      PaidDate: DateTime option

      // Decomposição da Parcela
      TotalAmount: Money
      PrincipalAmount: Money
      InterestAmount: Money

      // Saldo após pagamento
      RemainingBalance: Money

      // Link com Transaction (integração)
      TransactionId: Guid option }

// Módulo de Comportamentos
module DebtModule =
    type DebtError =
        | AmountMustBePositive
        | InvalidInstallmentCount
        | InvalidInterestRate
        | DebtAlreadyPaidOff
        | DebtNotActive

    // Factory: Criar nova dívida
    let create
        (userId: Guid)
        (name: string)
        (category: DebtCategory)
        (creditor: string)
        (amount: Money)
        (interestType: InterestType)
        (amortizationType: AmortizationType)
        (totalInstallments: int)
        (startDate: DateTime)
        : Result<Debt, DebtError> =

        if amount <= 0m then
            Error AmountMustBePositive
        elif totalInstallments <= 0 then
            Error InvalidInstallmentCount
        else
            match interestType with
            | Fixed rate when rate < 0m -> Error InvalidInterestRate
            | _ ->
                Ok
                    { Id = Guid.NewGuid()
                      UserId = userId
                      Name = name
                      Category = category
                      Creditor = creditor
                      OriginalAmount = amount
                      CurrentBalance = amount
                      InterestType = interestType
                      AmortizationType = amortizationType
                      StartDate = startDate
                      TotalInstallments = totalInstallments
                      InstallmentsPaid = 0
                      Status = Active
                      LinkedAccountId = None
                      Notes = None }

    // Atualizar informações da dívida
    let update
        (debt: Debt)
        (name: string)
        (creditor: string)
        (linkedAccountId: Guid option)
        (notes: string option)
        : Result<Debt, DebtError> =

        match debt.Status with
        | PaidOff _ -> Error DebtAlreadyPaidOff
        | _ ->
            Ok
                { debt with
                    Name = name
                    Creditor = creditor
                    LinkedAccountId = linkedAccountId
                    Notes = notes }

    // Cálculo de Parcela - Sistema Price (Tabela Price)
    let calculatePriceInstallment (principal: Money) (monthlyRate: decimal) (periods: int) : Money =
        if monthlyRate = 0m then
            principal / decimal periods
        else
            let factor = decimal (Math.Pow(float (1m + monthlyRate), float periods))
            principal * (monthlyRate * factor) / (factor - 1m)

    // Cálculo de Parcela - SAC
    let calculateSACInstallment
        (remainingBalance: Money)
        (monthlyRate: decimal)
        (remainingPeriods: int)
        : Money * Money =
        let amortization = remainingBalance / decimal remainingPeriods
        let interest = remainingBalance * monthlyRate
        (amortization, interest)

    // Gerar Tabela de Amortização (Schedule)
    let generateAmortizationSchedule (debt: Debt) : DebtInstallment list =
        match debt.InterestType with
        | Fixed rate ->
            match debt.AmortizationType with
            | Price ->
                let installmentValue =
                    calculatePriceInstallment debt.OriginalAmount rate debt.TotalInstallments

                let mutable balance = debt.OriginalAmount

                [ 1 .. debt.TotalInstallments ]
                |> List.map (fun n ->
                    let interest = balance * rate
                    let principal = installmentValue - interest
                    let dueDate = debt.StartDate.AddMonths(n - 1)
                    let newBalance = balance - principal
                    balance <- newBalance

                    { Id = Guid.NewGuid()
                      DebtId = debt.Id
                      InstallmentNumber = n
                      DueDate = dueDate
                      PaidDate = None
                      TotalAmount = installmentValue
                      PrincipalAmount = principal
                      InterestAmount = interest
                      RemainingBalance = if newBalance < 0m then 0m else newBalance
                      TransactionId = None })
            | SAC ->
                let mutable balance = debt.OriginalAmount

                [ 1 .. debt.TotalInstallments ]
                |> List.map (fun n ->
                    let (amortization, interest) =
                        calculateSACInstallment balance rate (debt.TotalInstallments - n + 1)

                    let totalAmount = amortization + interest
                    let dueDate = debt.StartDate.AddMonths(n - 1)
                    let newBalance = balance - amortization
                    balance <- newBalance

                    { Id = Guid.NewGuid()
                      DebtId = debt.Id
                      InstallmentNumber = n
                      DueDate = dueDate
                      PaidDate = None
                      TotalAmount = totalAmount
                      PrincipalAmount = amortization
                      InterestAmount = interest
                      RemainingBalance = if newBalance < 0m then 0m else newBalance
                      TransactionId = None })
            | Bullet ->
                // Pagamento único no final
                let totalInterest = debt.OriginalAmount * rate * decimal debt.TotalInstallments

                [ { Id = Guid.NewGuid()
                    DebtId = debt.Id
                    InstallmentNumber = 1
                    DueDate = debt.StartDate.AddMonths(debt.TotalInstallments)
                    PaidDate = None
                    TotalAmount = debt.OriginalAmount + totalInterest
                    PrincipalAmount = debt.OriginalAmount
                    InterestAmount = totalInterest
                    RemainingBalance = 0m
                    TransactionId = None } ]
            | Custom -> [] // Custom será tratado de forma específica
        | Variable _ -> [] // Variável requer dados externos

    // Registrar Pagamento de Parcela
    let payInstallment
        (debt: Debt)
        (installmentNumber: int)
        (paymentDate: DateTime)
        (amountPaid: Money)
        : Result<Debt, DebtError> =

        match debt.Status with
        | PaidOff _ -> Error DebtAlreadyPaidOff
        | Defaulted _ -> Error DebtNotActive
        | Refinanced _ -> Error DebtNotActive
        | Active ->
            // Recalcular saldo devedor
            let schedule = generateAmortizationSchedule debt

            let installment =
                schedule |> List.tryFind (fun i -> i.InstallmentNumber = installmentNumber)

            match installment with
            | Some inst ->
                let newBalance = debt.CurrentBalance - inst.PrincipalAmount
                let newPaidCount = debt.InstallmentsPaid + 1
                let isPaidOff = newPaidCount >= debt.TotalInstallments || newBalance <= 0m

                Ok
                    { debt with
                        CurrentBalance = if newBalance < 0m then 0m else newBalance
                        InstallmentsPaid = newPaidCount
                        Status = if isPaidOff then PaidOff paymentDate else Active }
            | None ->
                // Se não encontrou a parcela no schedule, apenas incrementa contador
                let newPaidCount = debt.InstallmentsPaid + 1
                let isPaidOff = newPaidCount >= debt.TotalInstallments

                Ok
                    { debt with
                        InstallmentsPaid = newPaidCount
                        Status = if isPaidOff then PaidOff paymentDate else Active }

    // Marcar dívida como refinanciada
    let refinance (debt: Debt) (newDebtId: Guid) : Result<Debt, DebtError> =
        match debt.Status with
        | PaidOff _ -> Error DebtAlreadyPaidOff
        | _ ->
            Ok
                { debt with
                    Status = Refinanced newDebtId }

    // Marcar dívida como inadimplente
    let markAsDefaulted (debt: Debt) (reason: string) : Result<Debt, DebtError> =
        match debt.Status with
        | PaidOff _ -> Error DebtAlreadyPaidOff
        | _ -> Ok { debt with Status = Defaulted reason }

    // Calcular total de juros a pagar
    let calculateTotalInterest (debt: Debt) : Money =
        let schedule = generateAmortizationSchedule debt
        schedule |> List.sumBy (fun i -> i.InterestAmount)

    // Calcular custo total da dívida
    let calculateTotalCost (debt: Debt) : Money =
        debt.OriginalAmount + calculateTotalInterest debt
