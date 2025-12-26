# Plano de Implementação: Pagamento com Cartão de Crédito e Parcelamento na Lista de Compras

## Contexto
Atualmente, o módulo de Lista de Compras ("Fechar Compras") permite apenas o registro de pagamentos via Conta Corrente (débito imediato). O objetivo é expandir essa funcionalidade para suportar pagamentos via Cartão de Crédito, incluindo a opção de parcelamento.

## Alterações Propostas

### 1. Backend (API & Domain)

#### Atualização do DTO `CheckoutRequest`
Arquivo: `src/HomeOS.Api/Controllers/ShoppingListController.cs`
- Adicionar propriedade `Installments` (int?) ao record `CheckoutRequest`.

#### Atualização da Lógica de `Checkout` (ShoppingListController)
- **Validação:** Se `Installments > 1`, validar se `CreditCardId` foi fornecido (parcelamento exige cartão).
- **Criação de Transações:**
  - **Cenário 1: Pagamento à Vista (1x) ou Débito:** Manter lógica atual de criar uma única transação (Expense).
  - **Cenário 2: Parcelamento (> 1x):**
    - Remover a chamada única para `TransactionModule.createExpense`.
    - Implementar loop (similar ao `TransactionController`) para gerar `N` transações.
    - Calcular valor da parcela: `Valor Total / N`.
    - Ajustar valor da primeira parcela para cobrir resíduos de arredondamento.
    - Definir datas de vencimento sequenciais: `Data Compra + 1 mês`, `+ 2 meses`, etc.
    - Persistir todas as transações geradas.
- **Vínculo com Itens de Compra (`PurchaseItem`):**
  - Os itens de compra (`PurchaseItem`) exigem um `TransactionId`.
  - **Decisão:** Vincular todos os itens à **primeira parcela** (primeira transação gerada). Isso garante que o registro de inventário esteja associado à data da compra, mantendo a rastreabilidade inicial.

### 2. Frontend (React Client)

#### Atualização do Serviço (`api.ts`)
- Atualizar interface `CheckoutRequest` para incluir `installments?: number`.
- Garantir que `CreditCardsService` esteja disponível para buscar cartões.

#### Atualização da Tela `ShoppingList.tsx`
- **Estado (State):**
  - Adicionar `creditCards` (array) carregado via `CreditCardsService.getAll`.
  - Adicionar `paymentMethod` ('account' | 'creditCard').
  - Adicionar `installments` (number), padrão 1.
- **Interface de Checkout:**
  - Adicionar Radio Button ou Select para escolher "Forma de Pagamento":
    - Contas (Débito)
    - Cartão de Crédito
  - **Lógica Condicional:**
    - Se "Contas": Mostrar dropdown de Contas (como hoje).
    - Se "Cartão de Crédito": Mostrar dropdown de Cartões + Input de Parcelas.
- **Envio do Formulário:**
  - Ajustar payload para enviar `accountId` OU `creditCardId` (o outro deve ser nulo).
  - Enviar número de parcelas.

## Passos de Execução
1.  **Backend:** Modificar `CheckoutRequest` e implementar lógica de parcelamento no `ShoppingListController`.
2.  **Frontend:** Atualizar `api.ts` e modificar componente `ShoppingList.tsx` para buscar cartões e exibir novos campos.
3.  **Testes:** Validar fluxo de compra à vista (conta e cartão) e parcelado, verificando se as transações financeiras foram geradas corretamente no Banco de Dados e se os itens saíram da lista de compras.
