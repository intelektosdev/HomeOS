namespace HomeOS.Domain.InvestmentTypes

open System

type Money = decimal

// Tipo de Investimento
type InvestmentType =
    | Stock of ticker: string // Ações (ex: PETR4)
    | FixedIncome of FixedIncomeType // Renda Fixa
    | RealEstate of property: string // Imóveis
    | Cryptocurrency of symbol: string // Cripto
    | Other of description: string

and FixedIncomeType =
    | CDB of bank: string
    | LCI
    | LCA
    | TesouroDireto of title: string
    | Debenture of issuer: string

// Status do Investimento
type InvestmentStatus =
    | Active
    | Redeemed of redemptionDate: DateTime
    | Matured of maturityDate: DateTime

// Tipo de Transação
type InvestmentTransactionType =
    | Buy
    | Sell
    | Dividend
    | InterestPayment

// Entidade Principal
type Investment =
    { Id: Guid
      UserId: Guid
      Name: string
      Type: InvestmentType

      // Informações Financeiras
      InitialAmount: Money
      CurrentQuantity: decimal // Ações: quantidade, RF: valor aplicado
      AveragePrice: Money // Preço médio de compra
      CurrentPrice: Money // Preço/valor atual

      // Prazos (para RF)
      InvestmentDate: DateTime
      MaturityDate: DateTime option

      // Rentabilidade
      AnnualYield: decimal option // Taxa anual (ex: 12.5% = 0.125)

      Status: InvestmentStatus
      LinkedAccountId: Guid option

      Notes: string option }

// Transação de Investimento (Histórico)
type InvestmentTransaction =
    { Id: Guid
      InvestmentId: Guid
      Type: InvestmentTransactionType
      Date: DateTime

      Quantity: decimal
      UnitPrice: Money
      TotalAmount: Money

      Fees: Money // Corretagem, impostos

      // Link com transação financeira
      FinancialTransactionId: Guid option }

// Módulo de Comportamentos
module InvestmentModule =
    type InvestmentError =
        | AmountMustBePositive
        | QuantityMustBePositive
        | PriceMustBePositive
        | InvestmentNotActive
        | InsufficientQuantity

    let create
        (userId: Guid)
        (name: string)
        (invType: InvestmentType)
        (initialAmount: Money)
        (quantity: decimal)
        (price: Money)
        (investmentDate: DateTime)
        : Result<Investment, InvestmentError> =

        if initialAmount <= 0m then
            Error AmountMustBePositive
        elif quantity <= 0m then
            Error QuantityMustBePositive
        elif price <= 0m then
            Error PriceMustBePositive
        else
            Ok
                { Id = Guid.NewGuid()
                  UserId = userId
                  Name = name
                  Type = invType
                  InitialAmount = initialAmount
                  CurrentQuantity = quantity
                  AveragePrice = price
                  CurrentPrice = price
                  InvestmentDate = investmentDate
                  MaturityDate = None
                  AnnualYield = None
                  Status = Active
                  LinkedAccountId = None
                  Notes = None }

    // Atualizar informações do investimento
    let update
        (investment: Investment)
        (name: string)
        (currentPrice: Money)
        (annualYield: decimal option)
        (linkedAccountId: Guid option)
        (notes: string option)
        : Result<Investment, InvestmentError> =

        if currentPrice < 0m then
            Error PriceMustBePositive
        else
            Ok
                { investment with
                    Name = name
                    CurrentPrice = currentPrice
                    AnnualYield = annualYield
                    LinkedAccountId = linkedAccountId
                    Notes = notes }

    // Calcular valor atual do investimento
    let calculateCurrentValue (investment: Investment) : Money =
        investment.CurrentPrice * investment.CurrentQuantity

    // Calcular rentabilidade absoluta
    let calculateReturn (investment: Investment) : Money =
        calculateCurrentValue investment - investment.InitialAmount

    // Calcular rentabilidade percentual
    let calculateReturnPercentage (investment: Investment) : decimal =
        if investment.InitialAmount = 0m then
            0m
        else
            (calculateReturn investment) / investment.InitialAmount * 100m

    // Calcular dias de investimento
    let calculateDaysInvested (investment: Investment) : int =
        (DateTime.Now - investment.InvestmentDate).Days

    // Calcular rentabilidade anualizada
    let calculateAnnualizedReturn (investment: Investment) : decimal =
        let days = calculateDaysInvested investment

        if days = 0 then
            0m
        else
            let returnPct = calculateReturnPercentage investment
            returnPct * 365m / decimal days

    // Registrar compra adicional (aumenta posição)
    let buy (investment: Investment) (quantity: decimal) (price: Money) : Result<Investment, InvestmentError> =

        match investment.Status with
        | Redeemed _
        | Matured _ -> Error InvestmentNotActive
        | Active ->
            if quantity <= 0m then
                Error QuantityMustBePositive
            elif price <= 0m then
                Error PriceMustBePositive
            else
                let totalQuantity = investment.CurrentQuantity + quantity

                let newAvgPrice =
                    ((investment.AveragePrice * investment.CurrentQuantity) + (price * quantity))
                    / totalQuantity

                Ok
                    { investment with
                        CurrentQuantity = totalQuantity
                        AveragePrice = newAvgPrice
                        CurrentPrice = price } // Atualiza preço atual

    // Registrar venda (reduz posição)
    let sell (investment: Investment) (quantity: decimal) (price: Money) : Result<Investment, InvestmentError> =

        match investment.Status with
        | Redeemed _
        | Matured _ -> Error InvestmentNotActive
        | Active ->
            if quantity <= 0m then
                Error QuantityMustBePositive
            elif price <= 0m then
                Error PriceMustBePositive
            elif quantity > investment.CurrentQuantity then
                Error InsufficientQuantity
            else
                let newQuantity = investment.CurrentQuantity - quantity
                let newStatus = if newQuantity = 0m then Redeemed DateTime.Now else Active

                Ok
                    { investment with
                        CurrentQuantity = newQuantity
                        CurrentPrice = price
                        Status = newStatus }

    // Registrar dividendo recebido
    let recordDividend (investment: Investment) (amount: Money) (date: DateTime) : InvestmentTransaction =
        { Id = Guid.NewGuid()
          InvestmentId = investment.Id
          Type = Dividend
          Date = date
          Quantity = 0m // Dividendos não afetam quantidade
          UnitPrice = 0m
          TotalAmount = amount
          Fees = 0m
          FinancialTransactionId = None }

    // Registrar rendimento de juros (renda fixa)
    let recordInterest (investment: Investment) (amount: Money) (date: DateTime) : InvestmentTransaction =
        { Id = Guid.NewGuid()
          InvestmentId = investment.Id
          Type = InterestPayment
          Date = date
          Quantity = 0m
          UnitPrice = 0m
          TotalAmount = amount
          Fees = 0m
          FinancialTransactionId = None }

    // Marcar como resgatado
    let redeem (investment: Investment) (redemptionDate: DateTime) : Result<Investment, InvestmentError> =
        match investment.Status with
        | Redeemed _
        | Matured _ -> Error InvestmentNotActive
        | Active ->
            Ok
                { investment with
                    Status = Redeemed redemptionDate
                    CurrentQuantity = 0m }

    // Marcar como vencido (para renda fixa)
    let mature (investment: Investment) (maturityDate: DateTime) : Result<Investment, InvestmentError> =
        match investment.Status with
        | Redeemed _
        | Matured _ -> Error InvestmentNotActive
        | Active ->
            Ok
                { investment with
                    Status = Matured maturityDate
                    CurrentQuantity = 0m }

    // Calcular lucro/prejuízo na venda
    let calculateSaleProfit (investment: Investment) (quantity: decimal) (salePrice: Money) : Money =
        let costBasis = investment.AveragePrice * quantity
        let saleValue = salePrice * quantity
        saleValue - costBasis

    // Calcular projeção de rendimento futuro (renda fixa)
    let projectFutureValue (investment: Investment) (months: int) : Money option =
        match investment.AnnualYield with
        | Some yieldRate ->
            let monthlyRate = yieldRate / 12m
            let currentValue = calculateCurrentValue investment

            let futureValue =
                currentValue * decimal (Math.Pow(float (1m + monthlyRate), float months))

            Some futureValue
        | None -> None
