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
    - Implementada alternância entre modo Grade (Cards visuais) e Tabela para: Produtos, Grupos de Produtos, Fornecedores e Contas.
    - Design consistente seguindo o padrão Glassmorphism.
- **Padronização**:
    - Cards de "Contas", "Grupos" e "Fornecedores" unificados visualmente (Ícone + Header + Ações).

---
*Documentação atualizada em 2025-12-23*
