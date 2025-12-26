namespace HomeOS.Domain.GoalBudgetTypes

open System

type Money = decimal

// --- Orçamentos (Budgets) ---

type BudgetPeriod =
    | Monthly
    | Yearly
    | Custom of startDate: DateTime * endDate: DateTime

type BudgetScope =
    | Global
    | Category of categoryId: Guid
    // Futuro: Group of groupId: Guid

type Budget =
    { Id: Guid
      UserId: Guid
      Name: string
      AmountLimit: Money
      Period: BudgetPeriod
      Scope: BudgetScope
      AlertThreshold: decimal // Ex: 0.8 para 80%
      CreatedAt: DateTime }

module BudgetModule =
    type BudgetError =
        | AmountMustBePositive
        | InvalidPeriod
        | ThresholdInvalid

    let create
        (userId: Guid)
        (name: string)
        (amountLimit: Money)
        (period: BudgetPeriod)
        (scope: BudgetScope)
        (alertThreshold: decimal)
        : Result<Budget, BudgetError> =
        
        if amountLimit <= 0m then
            Error AmountMustBePositive
        elif alertThreshold < 0m || alertThreshold > 1m then
            Error ThresholdInvalid
        else
            Ok {
                Id = Guid.NewGuid()
                UserId = userId
                Name = name
                AmountLimit = amountLimit
                Period = period
                Scope = scope
                AlertThreshold = alertThreshold
                CreatedAt = DateTime.Now
            }

    let update
        (budget: Budget)
        (name: string)
        (amountLimit: Money)
        (alertThreshold: decimal option)
        : Result<Budget, BudgetError> =
        
        if amountLimit <= 0m then
            Error AmountMustBePositive
        else
            let newThreshold = defaultArg alertThreshold budget.AlertThreshold
            if newThreshold < 0m || newThreshold > 1m then
                Error ThresholdInvalid
            else
                Ok { budget with 
                        Name = name; 
                        AmountLimit = amountLimit; 
                        AlertThreshold = newThreshold }

// --- Metas (Goals) ---

type GoalStatus =
    | InProgress
    | Achieved
    | Paused
    | Cancelled

type Goal =
    { Id: Guid
      UserId: Guid
      Name: string
      TargetAmount: Money
      CurrentAmount: Money
      Deadline: DateTime option
      LinkedInvestmentId: Guid option
      Status: GoalStatus
      CreatedAt: DateTime }

module GoalModule =
    type GoalError =
        | TargetAmountMustBePositive
        | CurrentAmountCannotBeNegative
        | GoalAlreadyAchieved

    let create
        (userId: Guid)
        (name: string)
        (targetAmount: Money)
        (deadline: DateTime option)
        (linkedInvestmentId: Guid option)
        : Result<Goal, GoalError> =
        
        if targetAmount <= 0m then
            Error TargetAmountMustBePositive
        else
            Ok {
                Id = Guid.NewGuid()
                UserId = userId
                Name = name
                TargetAmount = targetAmount
                CurrentAmount = 0m
                Deadline = deadline
                LinkedInvestmentId = linkedInvestmentId
                Status = InProgress
                CreatedAt = DateTime.Now
            }

    let deposit (goal: Goal) (fullAmount: Money) : Result<Goal, GoalError> =
        if goal.Status = Achieved || goal.Status = Cancelled then
            Error GoalAlreadyAchieved
        elif fullAmount < 0m then
            Error CurrentAmountCannotBeNegative
        else
            let newStatus = if fullAmount >= goal.TargetAmount then Achieved else InProgress
            Ok { goal with CurrentAmount = fullAmount; Status = newStatus }

    let updateStatus (goal: Goal) (status: GoalStatus) : Goal =
        { goal with Status = status }

