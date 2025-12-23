namespace HomeOS.Domain.InventoryTypes

open System

// --- TIPOS BASE ---

type UnitOfMeasure =
    | Unit // Unidade (un)
    | Kilogram // Quilograma (kg)
    | Gram // Grama (g)
    | Liter // Litro (L)
    | Milliliter // Mililitro (ml)

// --- ENTIDADES ---

type ProductGroup =
    { Id: Guid
      Name: string
      Description: string option
      CreatedAt: DateTime }

type Supplier =
    { Id: Guid
      Name: string
      Email: string option
      Phone: string option
      CreatedAt: DateTime }

type Product =
    { Id: Guid
      Name: string
      Unit: UnitOfMeasure
      CategoryId: Guid option
      ProductGroupId: Guid option
      Barcode: string option
      LastPrice: decimal option
      StockQuantity: decimal
      MinStockAlert: decimal option
      IsActive: bool
      CreatedAt: DateTime }

type PurchaseItem =
    { Id: Guid
      ProductId: Guid
      TransactionId: Guid
      SupplierId: Guid option
      Quantity: decimal
      UnitPrice: decimal
      PurchaseDate: DateTime }

type ShoppingListItem =
    { Id: Guid
      ProductId: Guid option
      Name: string
      Quantity: decimal
      Unit: UnitOfMeasure option
      EstimatedPrice: decimal option
      IsPurchased: bool
      CreatedAt: DateTime
      PurchasedAt: DateTime option }

// --- MÓDULOS ---

module UnitOfMeasureModule =
    let toString (unit: UnitOfMeasure) =
        match unit with
        | Unit -> "un"
        | Kilogram -> "kg"
        | Gram -> "g"
        | Liter -> "L"
        | Milliliter -> "ml"

    let fromString (str: string) =
        match str.ToLowerInvariant() with
        | "un"
        | "unidade"
        | "unit" -> Some Unit
        | "kg"
        | "kilogram"
        | "quilograma" -> Some Kilogram
        | "g"
        | "gram"
        | "grama" -> Some Gram
        | "l"
        | "liter"
        | "litro" -> Some Liter
        | "ml"
        | "milliliter"
        | "mililitro" -> Some Milliliter

        | _ -> None

module ProductGroupModule =
    let create (name: string) (description: string option) =
        { Id = Guid.NewGuid()
          Name = name
          Description = description
          CreatedAt = DateTime.UtcNow }

    let update (group: ProductGroup) (name: string) (description: string option) =
        { group with
            Name = name
            Description = description }

module SupplierModule =
    let create (name: string) (email: string option) (phone: string option) =
        { Id = Guid.NewGuid()
          Name = name
          Email = email
          Phone = phone
          CreatedAt = DateTime.UtcNow }

    let update (supplier: Supplier) (name: string) (email: string option) (phone: string option) =
        { supplier with
            Name = name
            Email = email
            Phone = phone }

module ProductModule =
    type ProductError =
        | NameRequired
        | QuantityMustBeNonNegative
        | PriceMustBePositive

    let create
        (name: string)
        (unit: UnitOfMeasure)
        (categoryId: Guid option)
        (productGroupId: Guid option)
        (barcode: string option)
        : Result<Product, ProductError> =
        if String.IsNullOrWhiteSpace(name) then
            Error NameRequired
        else
            Ok
                { Id = Guid.NewGuid()
                  Name = name.Trim()
                  Unit = unit
                  CategoryId = categoryId
                  ProductGroupId = productGroupId
                  Barcode = barcode
                  LastPrice = None
                  StockQuantity = 0m
                  MinStockAlert = None
                  IsActive = true
                  CreatedAt = DateTime.UtcNow }

    let updateStock (product: Product) (quantity: decimal) : Result<Product, ProductError> =
        let newQuantity = product.StockQuantity + quantity

        if newQuantity < 0m then
            Error QuantityMustBeNonNegative
        else
            Ok
                { product with
                    StockQuantity = newQuantity }

    let updatePrice (product: Product) (price: decimal) : Result<Product, ProductError> =
        if price <= 0m then
            Error PriceMustBePositive
        else
            Ok { product with LastPrice = Some price }

    let toggleActive (product: Product) =
        { product with
            IsActive = not product.IsActive }

    let update
        (product: Product)
        (name: string)
        (unit: UnitOfMeasure)
        (categoryId: Guid option)
        (productGroupId: Guid option)
        (barcode: string option)
        (minStockAlert: decimal option)
        (isActive: bool)
        : Result<Product, ProductError> =
        if String.IsNullOrWhiteSpace(name) then
            Error NameRequired
        else
            Ok
                { product with
                    Name = name.Trim()
                    Unit = unit
                    CategoryId = categoryId
                    ProductGroupId = productGroupId
                    Barcode = barcode
                    MinStockAlert = minStockAlert
                    IsActive = isActive }

    let setMinStockAlert (product: Product) (minStockAlert: decimal option) =
        { product with
            MinStockAlert = minStockAlert }

module ShoppingListModule =
    type ShoppingListError =
        | NameRequired
        | QuantityMustBePositive
        | ItemAlreadyPurchased

    let createFromProduct (product: Product) (quantity: decimal) : Result<ShoppingListItem, ShoppingListError> =
        if quantity <= 0m then
            Error QuantityMustBePositive
        else
            Ok
                { Id = Guid.NewGuid()
                  ProductId = Some product.Id
                  Name = product.Name
                  Quantity = quantity
                  Unit = Some product.Unit
                  EstimatedPrice = product.LastPrice
                  IsPurchased = false
                  CreatedAt = DateTime.UtcNow
                  PurchasedAt = None }

    let createCustomItem
        (name: string)
        (quantity: decimal)
        (unit: UnitOfMeasure option)
        : Result<ShoppingListItem, ShoppingListError> =
        if String.IsNullOrWhiteSpace(name) then
            Error NameRequired
        elif quantity <= 0m then
            Error QuantityMustBePositive
        else
            Ok
                { Id = Guid.NewGuid()
                  ProductId = None
                  Name = name.Trim()
                  Quantity = quantity
                  Unit = unit
                  EstimatedPrice = None
                  IsPurchased = false
                  CreatedAt = DateTime.UtcNow
                  PurchasedAt = None }

    let markAsPurchased (item: ShoppingListItem) : Result<ShoppingListItem, ShoppingListError> =
        if item.IsPurchased then
            Error ItemAlreadyPurchased
        else
            Ok
                { item with
                    IsPurchased = true
                    PurchasedAt = Some DateTime.UtcNow }

module PurchaseItemModule =
    type PurchaseError =
        | QuantityMustBePositive
        | PriceMustBePositive

    let create
        (productId: Guid)
        (transactionId: Guid)
        (supplierId: Guid option)
        (quantity: decimal)
        (unitPrice: decimal)
        (purchaseDate: DateTime)
        : Result<PurchaseItem, PurchaseError> =
        if quantity <= 0m then
            Error QuantityMustBePositive
        elif unitPrice <= 0m then
            Error PriceMustBePositive
        else
            Ok
                { Id = Guid.NewGuid()
                  ProductId = productId
                  TransactionId = transactionId
                  SupplierId = supplierId
                  Quantity = quantity
                  UnitPrice = unitPrice
                  PurchaseDate = purchaseDate }

    let totalPrice (item: PurchaseItem) = item.Quantity * item.UnitPrice
