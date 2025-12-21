# HomeOS - Documentação do Projeto

Este documento fornece uma visão geral técnica e funcional do que já foi implementado no projeto **HomeOS**.

## 1. Visão Geral
O HomeOS é um sistema de gestão financeira pessoal/residencial projetado com uma arquitetura multicamadas moderna, utilizando uma abordagem híbrida de linguagens (C# e F#) para maximizar a segurança de tipos e a expressividade do domínio.

## 2. Arquitetura e Tecnologias

O projeto está organizado em uma solução .NET dividida nos seguintes projetos:

*   **HomeOS.Domain (F#)**: Contém as entidades e regras de negócio. Utiliza o paradigma funcional para garantir que o estado do sistema seja consistente.
*   **HomeOS.Infra (C#)**: Camada de infraestrutura responsável pelo acesso ao banco de dados SQL Server via Dapper e configuração do Entity Framework Core.
*   **HomeOS.Api (C#)**: Interface REST que expõe as funcionalidades do sistema para o mundo exterior.
*   **HomeOS.Tests / IntegrationTests (C#)**: Suite de testes para garantir a integridade dos fluxos de negócio.

### Stack Tecnológica:
- **Back-end**: .NET 8/9
- **Linguagens**: C# e F#
- **Persistência**: SQL Server, Dapper, EF Core
- **Mapeamento**: Manual (Mappers estáticos) para tradução eficiente entre F# Types e DbModels C#.

## 3. Módulos e Funcionalidades Implementadas

### A. Core Financeiro (Transações)
A gestão de transações é o coração do sistema e foi totalmente refatorada para garantir integridade contábil.

- **Entidade de Domínio**: `Transaction` (F# Record).
    - **Estados (Discriminated Union)**: `Pending`, `Paid` (com data), `Conciliated` (com data), `Cancelled` (com motivo).
    - **Origem (TransactionSource)**: Define se a despesa saiu de uma Conta (`FromAccount`) ou de um Cartão de Crédito (`FromCreditCard`). Union Type que garante exclusividade mútua (XOR).
- **Regras de Negócio**: 
    - Validações de valores positivos.
    - Impossibilidade de datas de pagamento futuras.
    - Obrigatoriedade de vincular uma Categoria e uma Origem.
- **API Endpoints**:
    - `POST /api/transactions`: Cria despesas com validação robusta de origem.
    - `GET /api/transactions`: Extrato com filtros de data.
    - `GET /api/transactions/{id}`: Detalhes completos.

### B. Gestão de Cadastros (Auxiliares)
Módulos de apoio implementados para suportar as transações:

1.  **Categorias (`Categories`)**
    - Tipos: Receita ou Despesa.
    - Suporte a Ícones (opcional).
    - Endpoint: `/api/categories`.

2.  **Contas / Carteiras (`Accounts`)**
    - Tipos: Corrente, Carteira (Dinheiro físico), Investimento.
    - Controle de Saldo Inicial e Status (Ativo/Inativo).
    - Endpoint: `/api/accounts`.

3.  **Cartões de Crédito (`CreditCards`)**
    - Controle de Dia de Fechamento e Vencimento.
    - Limite de crédito.
    - Validação de dias (1-31) no domínio F#.
    - Endpoint: `/api/credit-cards`.

### C. Infraestrutura de Dados
- **Schema Finance**: Organização das tabelas em um schema dedicado no SQL Server.
- **Estratégia de Persistência**: Uso de `MERGE` (Upsert) no Dapper para simplificar a lógica de Salvar/Atualizar.
- **Constraints de Banco**:
    - `CK_Transaction_Source`: Garante no nível do banco que uma transação não pode ter AccountId e CreditCardId simultaneamente.
- **Scripts**:
    - `script/estrutura.sql`: Estrutura inicial.
    - `script/database_update.sql`: Script de migração idempotente para atualizar bancos existentes com as novas estruturas.

## 4. Diferenciais da Implementação Atual

1.  **Segurança de Domínio (Type Safety Extreme)**: 
    - O uso de F# impede a criação de objetos inválidos em memória.
    - O uso de *Discriminated Unions* para `Status` e `Source` elimina a necessidade de flags booleanas confusas ou nulos excessivos.
2.  **Performance Híbrida**: O repositório utiliza Dapper para consultas e escritas pesadas, permitindo o uso de recursos específicos do SQL Server que seriam mais complexos via ORM puro.
3.  **API Limpa**: Controllers enxutos que declaram explicitamente seus contratos (Records DTOs).

---
*Documentação atualizada em 2025-12-21*
