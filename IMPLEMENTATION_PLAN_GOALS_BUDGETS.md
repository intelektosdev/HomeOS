# Planejamento de Implementação: Módulo de Metas e Orçamentos

Este documento descreve o plano técnico e funcional para adicionar o suporte a **Metas Financeiras (Goals)** e **Orçamentos (Budgets)** ao HomeOS.

## 1. Visão Geral

O objetivo é permitir que o usuário:
1.  **Orçamentos (Budgets)**: Defina limites de gastos por categoria (ex: "Alimentação: R$ 1.000/mês") ou globalmente, acompanhando o progresso em tempo real.
2.  **Metas (Goals)**: Estabeleça objetivos de economia (ex: "Viagem: R$ 5.000 até Dezembro"), acompanhando o progresso de acumulação.

---

## 2. Modelagem de Domínio (F#)

Local: `src/HomeOS.Domain/GoalBudgetTypes.fs` (Novo arquivo)

### 2.1. Orçamentos (Budgets)
Orçamentos monitoram **despesas** (`TransactionType = Expense`).

*   **Tipos**:
    *   `BudgetPeriod`: `Monthly`, `Yearly`, `Custom(StartDate, EndDate)`.
    *   `BudgetScope`: `Global`, `Category(CategoryId)`, `Group(GroupId)`.
*   **Entidade `Budget`**:
    *   `Id`, `UserId`, `Name`.
    *   `AmountLimit`: Valor teto.
    *   `Period`: Frequência.
    *   `Scope`: Filtro de aplicação.
    *   `AlertThreshold`: Porcentagem para alerta (ex: 80%).

### 2.2. Metas (Goals)
Metas monitoram **saldo acumulado** ou **transferências específicas**.

*   **Tipos**:
    *   `GoalStatus`: `InProgress`, `Achieved`, `Paused`, `Cancelled`.
*   **Entidade `Goal`**:
    *   `Id`, `UserId`, `Name`.
    *   `TargetAmount`: Valor alvo.
    *   `CurrentAmount`: Valor já guardado (manual ou calculado).
    *   `Deadline`: Data alvo (opcional).
    *   `LinkedInvestmentId`: Vínculo opcional com um investimento (ex: Tesouro Direto específico para a meta).
    *   `Status`.

---

## 3. Banco de Dados (SQL Server)

Novas tabelas no schema `Finance`.

### 3.1. Tabela `Finance.Budgets`
```sql
CREATE TABLE Finance.Budgets (
    Id UNIQUEIDENTIFIER PRIMARY KEY,
    UserId UNIQUEIDENTIFIER NOT NULL,
    Name NVARCHAR(100) NOT NULL,
    AmountLimit DECIMAL(18, 2) NOT NULL,
    PeriodType INT NOT NULL, -- 0: Monthly, 1: Yearly
    CategoryId UNIQUEIDENTIFIER NULL, -- Se NULL e Scope=Global, aplica a tudo
    AlertThreshold DECIMAL(5, 2) DEFAULT 0.8,
    CreatedAt DATETIME DEFAULT GETDATE()
    -- Índices e FKs
);
```

### 3.2. Tabela `Finance.Goals`
```sql
CREATE TABLE Finance.Goals (
    Id UNIQUEIDENTIFIER PRIMARY KEY,
    UserId UNIQUEIDENTIFIER NOT NULL,
    Name NVARCHAR(100) NOT NULL,
    TargetAmount DECIMAL(18, 2) NOT NULL,
    CurrentAmount DECIMAL(18, 2) DEFAULT 0,
    Deadline DATETIME NULL,
    LinkedInvestmentId UNIQUEIDENTIFIER NULL,
    Status INT NOT NULL,
    CreatedAt DATETIME DEFAULT GETDATE()
);
```

---

## 4. Camada de Aplicação (Backend C#)

### 4.1. Repositórios (`HomeOS.Infra`)
*   `BudgetRepository`:
    *   CRUD básico.
    *   **Método Crítico**: `GetBudgetStatus(budgetId, period)` -> Calcula o total gasto no período atual somando `Transactions` da categoria vinculada.
*   `GoalRepository`:
    *   CRUD básico.
    *   Permitir atualizar `CurrentAmount` (aporte manual).

### 4.2. Controllers (`HomeOS.Api`)
*   `BudgetController`:
    *   `GET /api/budgets/status`: Retorna lista de orçamentos enriquecida com `SpentAmount` e `PercentageUsed`.
*   `GoalController`:
    *   `POST /api/goals/{id}/deposit`: Adicionar valor à meta.
    *   `PUT /api/goals`: Edição completa.

---

## 5. Interface do Usuário (Frontend React)

### 5.1. Novas Páginas
1.  **Orçamentos (`/budgets`)**:
    *   Grid de Cards.
    *   Cada card mostra: Nome, Barra de Progresso (Verde < 75%, Amarelo < 100%, Vermelho >= 100%), Valor Gasto / Limite, Restante.
2.  **Metas (`/goals`)**:
    *   Visualização inspiradora (Cards com imagens ou ícones).
    *   Circular Progress ou Barra preenchendo até o alvo.
    *   Projeção: "Nesse ritmo, você alcança em X meses".

### 5.2. Dashboard Principal
*   Adicionar Widget "Resumo de Orçamentos": Top 3 orçamentos mais críticos (perto de estourar).
*   Adicionar Widget "Minhas Metas": Progresso das metas favoritas.

---

## 6. Etapas de Execução

1.  **Database**: Criar scripts SQL de migração.
2.  **Domain (F#)**: Implementar tipos e regras de validação.
3.  **Infra (Repository)**: Implementar persistência e queries de agregação de gastos.
4.  **API**: Criar Endpoints.
5.  **Frontend**: Criar telas e integrar.
6.  **Testes**: Validar cálculos de orçamento (se está somando as categorias certas).

