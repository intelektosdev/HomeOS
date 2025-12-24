namespace HomeOS.Domain.FinancialTypes

open System

// Recurring Transaction Types

type RecurrenceFrequency =
    | Daily
    | Weekly
    | Biweekly
    | Monthly
    | Bimonthly
    | Quarterly
    | Semiannual
    | Annual

type AmountType =
    | Fixed of amount: decimal
    | Variable of averageAmount: decimal

type RecurringTransaction =
    { Id: Guid
      Description: string
      Type: TransactionType
      CategoryId: Guid
      Source: TransactionSource
      AmountType: AmountType
      Frequency: RecurrenceFrequency
      DayOfMonth: int option // For monthly/bimonthly etc: 1-31, None = last day
      StartDate: DateTime
      EndDate: DateTime option
      NextOccurrence: DateTime
      IsActive: bool
      CreatedAt: DateTime
      LastGeneratedAt: DateTime option }

module RecurringTransactionModule =

    type RecurringTransactionError =
        | AmountMustBePositive
        | InvalidDayOfMonth
        | EndDateBeforeStartDate
        | InvalidFrequencyForDayOfMonth

    let create
        (description: string)
        (transactionType: TransactionType)
        (categoryId: Guid)
        (source: TransactionSource)
        (amountType: AmountType)
        (frequency: RecurrenceFrequency)
        (dayOfMonth: int option)
        (startDate: DateTime)
        (endDate: DateTime option)
        : Result<RecurringTransaction, RecurringTransactionError> =

        // Validate amount
        let amountValid =
            match amountType with
            | Fixed amt when amt <= 0m -> false
            | Variable avg when avg <= 0m -> false
            | _ -> true

        if not amountValid then
            Error AmountMustBePositive
        elif dayOfMonth.IsSome && (dayOfMonth.Value < 1 || dayOfMonth.Value > 31) then
            Error InvalidDayOfMonth
        elif endDate.IsSome && endDate.Value < startDate then
            Error EndDateBeforeStartDate
        else
            Ok
                { Id = Guid.NewGuid()
                  Description = description
                  Type = transactionType
                  CategoryId = categoryId
                  Source = source
                  AmountType = amountType
                  Frequency = frequency
                  DayOfMonth = dayOfMonth
                  StartDate = startDate
                  EndDate = endDate
                  NextOccurrence = startDate
                  IsActive = true
                  CreatedAt = DateTime.Now
                  LastGeneratedAt = None }

    let toggleActive (recurring: RecurringTransaction) =
        { recurring with
            IsActive = not recurring.IsActive }

    let update
        (recurring: RecurringTransaction)
        (description: string)
        (categoryId: Guid)
        (source: TransactionSource)
        (amountType: AmountType)
        (frequency: RecurrenceFrequency)
        (dayOfMonth: int option)
        (endDate: DateTime option)
        : Result<RecurringTransaction, RecurringTransactionError> =

        let amountValid =
            match amountType with
            | Fixed amt when amt <= 0m -> false
            | Variable avg when avg <= 0m -> false
            | _ -> true

        if not amountValid then
            Error AmountMustBePositive
        elif dayOfMonth.IsSome && (dayOfMonth.Value < 1 || dayOfMonth.Value > 31) then
            Error InvalidDayOfMonth
        elif endDate.IsSome && endDate.Value < recurring.StartDate then
            Error EndDateBeforeStartDate
        else
            Ok
                { recurring with
                    Description = description
                    CategoryId = categoryId
                    Source = source
                    AmountType = amountType
                    Frequency = frequency
                    DayOfMonth = dayOfMonth
                    EndDate = endDate }

    let calculateNextOccurrence (recurring: RecurringTransaction) (fromDate: DateTime) : DateTime =
        let baseDate = fromDate.Date

        match recurring.Frequency with
        | Daily -> baseDate.AddDays(1.0)
        | Weekly -> baseDate.AddDays(7.0)
        | Biweekly -> baseDate.AddDays(14.0)
        | Monthly ->
            let nextMonth = baseDate.AddMonths(1)

            match recurring.DayOfMonth with
            | Some day ->
                let daysInMonth = DateTime.DaysInMonth(nextMonth.Year, nextMonth.Month)
                let actualDay = min day daysInMonth
                DateTime(nextMonth.Year, nextMonth.Month, actualDay)
            | None ->
                // Last day of month
                let daysInMonth = DateTime.DaysInMonth(nextMonth.Year, nextMonth.Month)
                DateTime(nextMonth.Year, nextMonth.Month, daysInMonth)
        | Bimonthly ->
            let nextMonth = baseDate.AddMonths(2)

            match recurring.DayOfMonth with
            | Some day ->
                let daysInMonth = DateTime.DaysInMonth(nextMonth.Year, nextMonth.Month)
                let actualDay = min day daysInMonth
                DateTime(nextMonth.Year, nextMonth.Month, actualDay)
            | None ->
                let daysInMonth = DateTime.DaysInMonth(nextMonth.Year, nextMonth.Month)
                DateTime(nextMonth.Year, nextMonth.Month, daysInMonth)
        | Quarterly -> baseDate.AddMonths(3)
        | Semiannual -> baseDate.AddMonths(6)
        | Annual -> baseDate.AddYears(1)

    let updateNextOccurrence (recurring: RecurringTransaction) : RecurringTransaction =
        let nextDate = calculateNextOccurrence recurring recurring.NextOccurrence

        { recurring with
            NextOccurrence = nextDate
            LastGeneratedAt = Some DateTime.Now }
