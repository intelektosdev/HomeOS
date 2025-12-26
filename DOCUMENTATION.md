# HomeOS - Documentação do Projeto

Este documento fornece uma visão geral técnica e funcional do que já foi implementado no projeto **HomeOS**.

## 1. Visão Geral
O HomeOS é um sistema de gestão financeira pessoal/residencial projetado com uma arquitetura multicamadas moderna, utilizando uma abordagem híbrida de linguagens (C# e F#) para maximizar a segurança de tipos e a expressividade do domínio.

## 2. Arquitetura e Tecnologias

O projeto está organizado em uma solução .NET dividida nos seguintes projetos:

*   **HomeOS.Domain (F#)**: Contém as entidades e regras de negócio. Utiliza o paradigma funcional para garantir que o estado do sistema seja consistente através de imutabilidade e tipos algébricos.
*   **HomeOS.Infra (C#)**: Camada de infraestrutura responsável pelo acesso ao banco de dados SQL Server via Dapper e configuração do Entity Framework Core.
*   **HomeOS.Api (C#)**: Interface REST que expõe as funcionalidades do sistema. Inclui configuração de CORS para integração com o frontend.
*   **HomeOS.Client (TS/React)**: Frontend moderno construído com React 19, Vite e Tailwind CSS, focado em uma experiência de usuário premium.
*   **HomeOS.Tests / IntegrationTests (C#)**: Suite de testes para garantir a integridade dos fluxos de negócio.

### Stack Tecnológica:
- **Back-end**: .NET 8/9, C#, F#
- **Front-end**: React 19, Vite, TypeScript, Tailwind CSS
- **Persistência**: SQL Server, Dapper, EF Core
- **Comunicação**: Axios (Frontend) para REST API (Backend)

## 3. Módulos e Funcionalidades Implementadas

### A. Core Financeiro (Transações)
A gestão de transações foi totalmente refatorada para suportar o ciclo de vida completo de uma despesa.

- **Entidade de Domínio**: `Transaction` (F# Record).
- **Estados (Discriminated Union)**:
    - `Pending`: Aguardando pagamento.
    - `Paid`: Pago em uma data específica.
    - `Conciliated`: Conciliado com o banco.
    - `Cancelled`: Cancelado com motivação.
- **Origem (TransactionSource)**: Define se a despesa saiu de uma Conta (`FromAccount`) ou de um Cartão de Crédito (`FromCreditCard`).
- **Ações Implementadas**:
    - `Create`: Criação com validação de origem (XOR entre Conta/Cartão).
    - `Pay`: Marca como paga validando que não é uma data futura.
    - `Cancel`: Cancela transações pendentes/pagas informando motivo.
    - `Conciliate`: Finaliza o ciclo da transação.
    - `Update`: Permite alteração de dados básicos enquanto não conciliada.

### B. Gestão de Cadastros (Auxiliares)
- **Categorias (`Categories`)**: Tipos Receita/Despesa com suporte a ícones.
- **Contas (`Accounts`)**: Gestão de saldos iniciais e status ativo/inativo.
- **Cartões de Crédito (`CreditCards`)**: Controle de limites e datas (fechamento/vencimento) validadas no domínio.

### C. Interface do Usuário (Frontend)
- **Dashboard**: Visão geral financeira (em desenvolvimento).
- **Gestão de Contas**: Listagem e criação de contas com design glassmorphism.
- **Categorias e Cartões**: Interfaces dedicadas para manutenção de cadastros.
- **Design System**: Paleta de cores premium (Dark Mode), tipografia Inter e micro-animações.

## 4. Diferenciais da Implementação

1.  **Segurança de Domínio**: O uso de F# impede a criação de estados inválidos (ex: uma transação paga sem data de pagamento).
2.  **Performance**: Consultas otimizadas via Dapper com uso de comandos nativos SQL como `MERGE`.
3.  **UI/UX Premium**: Foco em estética moderna sem comprometer a usabilidade.

### D. Sistema de Inventário (Novo)
Módulo completo para gestão de estoque doméstico e compras.

- **Domínio (F#)**:
    - `Product`: Produto com unidade de medida, preço, estoque mínimo e código de barras.
    - `Supplier`: Fornecedores com nome, email e telefone.
    - `ShoppingList`: Lista de compras inteligente que calcula valor total e integra com transações.
- **Funcionalidades**:
    - **Produtos**: Cadastro completo, ajuste rápido de estoque (+1/-1), alerta de estoque baixo visual (Badge amarelo).
    - **Grupos de Produtos**: Categorização para organização do estoque.
    - **Fornecedores**: Gestão de contatos de compras.
    - **Lista de Compras**:
        - Adição de itens do estoque ou itens avulsos.
        - **Finalização de Compra (Checkout)**: Gera automaticamente uma Transação Financeira (`Expense`) no valor total, permite criar produtos novos on-the-fly e atualiza o histórico.

### E. Melhorias de UI/UX
- **Visualização Híbrida (Grid/Cards)**:
    - Implementada alternância entre modo Grade (Cards visuais) e Tabela para: Produtos, Grupos de Produtos, Fornecedores, Contas e Cartões de Crédito.
    - Design consistente seguindo o padrão Glassmorphism.
- **Padronização**:
    - Cards de "Contas", "Grupos" e "Fornecedores" unificados visualmente (Ícone + Header + Ações).

### F. Funcionalidades de Edição (CRUD Completo)
- **Grupos de Produtos**: Botão "Editar" nas visualizações Cards e Grid, com endpoint `PUT /api/product-groups/{id}`.
- **Fornecedores**: Botão "Editar" nas visualizações Cards e Grid, com endpoint `PUT /api/suppliers/{id}`.
- **Cartões de Crédito**: Botão "Editar" nas visualizações Cards e Grid, com endpoint `PUT /api/credit-cards/{id}` e lógica de validação em F# (`CreditCardModule.update`).
- **Transações**: Seleção de Cartão de Crédito como origem de pagamento corrigida e funcional.

---
### G. Controle de Cartões de Crédito (Novo)
Módulo avançado para gestão de despesas via cartão, incluindo parcelamento e pagamento de faturas.

- **Parcelamento Inteligente**:
    - Suporte a compras parceladas diretamente no formulário de transação.
    - O sistema gera automaticamente N transações (uma para cada mês subsequente) mantendo o valor total impactando o limite imediatamente.
    - Visualização clara de "Parcela X de Y" nas listas de transações.

- **Gestão de Faturas (Statement View)**:
    - **Extrato Futuro**: Novo modo de visualização "Detalhes do Cartão" que agrupa lançamentos futuros por mês (YYYY-MM), permitindo projeção de gastos.
    - **Pagamento de Fatura**:
        - Fluxo automatizado de seleção de transações pendentes.
        - Seleção da conta de origem (Checking/Wallet).
        - Criação automática de um registro de `CreditCardPayment` e conciliação em lote das transações pagas.
    - **Indicadores**:
        - Barra de progresso visual do Limite Utilizado.
        - Contadores de transações pendentes.

- **Cálculo de Juros e Vencimento Inteligente**:
    - **Vencimento Automático**: Ao selecionar um cartão, a data de vencimento é preenchida automaticamente baseada no dia de fechamento (Compra após fechamento = Vencimento no próximo mês).
    - **Juros Compostos**: Suporte a cálculo de juros mensais em compras parceladas. O valor total da transação é recalculado automaticamente utilizando a fórmula de juros compostos para refletir o custo real da compra a prazo.

---
### H. Transações Recorrentes (Novo)
Sistema completo para automação de lançamentos periódicos (receitas e despesas), eliminando o trabalho manual de registro mensal.

- **tipos de Recorrência**:
    - **8 Frequências Suportadas**: Diária, Semanal, Quinzenal, Mensal, Bimestral, Trimestral, Semestral, Anual.
    - **Valores Fixos**: Para despesas/receitas com valor constante (ex: salário R$ 5.000, condomínio R$ 800).
    - **Valores Variáveis**: Para contas com valor flutuante (ex: luz ~R$ 180, água ~R$ 90). O sistema usa a média para geração e permite ajuste posterior.

- **Domínio (F#)**:
    - `RecurrenceFrequency`: Discriminated Union com 8 opções de periodicidade.
    - `AmountType`: Fixed (valor exato) ou Variable (média estimada).
    - `RecurringTransaction`: Entidade com regras de validação e cálculo inteligente de próximas datas.
    - **`RecurringTransactionModule.calculateNextOccurrence`**: Lógica sofisticada que:
        - Lida com meses de 30/31 dias (dia 31 em fevereiro = dia 28/29).
        - Suporta "último dia do mês" (útil para faturas de cartão).
        - Calcula corretamente anos bissextos.

- **Funcionalidades Backend**:
    - **Geração Automática**: Serviço que cria transações futuras baseado em recorrências ativas.
    - **Preview de Ocorrências**: Visualização das próximas 12 datas sem persistir.
    - **Rastreabilidade**: Tabela `GeneratedTransactions` mantém vínculo entre transações geradas e sua origem recorrente.
    - **Controle de Ativação**: Habilitar/desabilitar recorrências sem excluir histórico.

- **API REST**:
    - `GET /api/recurring-transactions` - Listar todas (com filtro de inativas).
    - `POST /api/recurring-transactions` - Criar nova recorrência.
    - `PUT /api/recurring-transactions/{id}` - Atualizar configuração.
    - `PATCH /api/recurring-transactions/{id}/toggle` - Ativar/desativar.
    - `POST /api/recurring-transactions/{id}/preview` - Prévia de datas futuras.
    - `POST /api/recurring-transactions/generate` - Gatilho manual de geração (útil para testes).

- **Casos de Uso**:
    - **Salário Mensal**: Receita fixa de R$ 5.000 todo dia 5, gerando automaticamente lançamentos futuros.
    - **Conta de Luz**: Despesa variável ~R$ 180 todo dia 15, permitindo ajuste do valor real quando chegar a conta.
    - **IPTU Anual**: Despesa fixa parcelada em 10x, com geração automática das parcelas.
    - **Assinaturas**: Netflix, Spotify, etc. com renovação mensal automática.

- **Banco de Dados**:
    - `Finance.RecurringTransactions`: Tabela principal com 21 colunas e constraints de integridade.
    - `Finance.GeneratedTransactions`: Tabela de auditoria para rastreamento.
    - Índices otimizados em `NextOccurrence` e `UserId+IsActive` para performance.

- **Benefícios**:
    - ✅ **Automação Total**: Nunca mais esquecer de lançar condomínio ou salário.
    - ✅ **Fluxo de Caixa Preciso**: Projeções financeiras baseadas em compromissos reais.
    - ✅ **Orçamento Realista**: Saber exatamente quais despesas virão nos próximos meses.
    - ✅ **Detecção de Anomalias**: Valores variáveis fora do padrão ficam evidentes.

---
---
### I. Gestão de Dívidas (Novo)
Módulo especializado para controle de passivos financeiros e planejamento de amortização.

- **Domínio (F#)**:
    - `Debt`: Entidade principal contendo credor, montante original, saldo atual e prazos.
    - `DebtInstallment`: Detalhamento de cada parcela com decomposição entre Principal e Juros.
- **Configurações Flexíveis**:
    - **Categorias**: Financiamento Imobiliário, Empréstimo Pessoal, Financiamento de Veículo, Estudantil e Outros.
    - **Sistemas de Amortização**: **Price** (parcelas fixas), **SAC** (amortização constante), **Bullet** (pagamento único ao final) e Customizado.
    - **Tipos de Juros**: Suporte a Taxa Fixa ou Variável (Indexadores como CDI, IPCA, etc).
- **Funcionalidades**:
    - **Geração de Tabela de Amortização**: Cálculo automático de todas as parcelas futuras baseado no sistema escolhido (Price/SAC/Bullet).
    - **Pagamento de Parcelas**: Registro de pagamentos com atualização automática do saldo devedor e contagem de parcelas.
    - **Ciclo de Vida**: Estados para dívidas Ativas, Quitadas, Refinanciadas ou Inadimplentes.
    - **Custo Efetivo**: Cálculo do custo total da dívida (Principal + Juros Acumulados).

---
### J. Gestão de Investimentos (Novo)
Módulo completo para acompanhamento de patrimônio, gestão de ativos e análise de rentabilidade.

- **Domínio (F#)**:
    - `Investment`: Registro consolidado do ativo (Preço Médio, Quantidade, Valor Atual).
    - `InvestmentTransaction`: Histórico de movimentações (Compra, Venda, Dividendos, Juros).
- **Tipos de Ativos Suportados**:
    - **Renda Variável**: Ações (Ticker) e Criptomoedas (Símbolo).
    - **Renda Fixa**: CDB, LCI, LCA, Tesouro Direto e Debêntures.
    - **Outros**: Imóveis e ativos genéricos.
- **Inteligência de Carteira**:
    - **Gestão de Posição**: Cálculo automático de **Preço Médio** em compras/vendas sucessivas.
    - **Rentabilidade Real-Time**: Acompanhamento de lucro/prejuízo (valor absoluto e percentual) baseado no preço de mercado atualizado.
    - **Performance Anualizada**: Cálculo de taxa de retorno anualizada (Annualized Return) baseada no tempo de permanência no ativo.
    - **Projeções**: Estimativa de valor futuro para ativos de renda fixa baseada no Yield anual.
    - **Rendimentos Passivos**: Registro e histórico dedicado para Dividendos e Juros sobre Capital Próprio.

---
*Documentação atualizada em 2025-12-26*

