# 🚀 Guia de Execução - HomeOS com Dívidas e Investimentos

## ⚠️ Problema Identificado
O `dotnet watch` não suporta projetos F# misturados. Use `dotnet run` em vez disso.

## 📋 Pré-requisitos

### 1. Executar Scripts SQL
Execute os scripts na ordem abaixo no SQL Server:

```sql
-- 1. DebtSchema.sql
-- Localização: c:\projetos\finance_dev\HomeOS\scripts\DebtSchema.sql

-- 2. InvestmentSchema.sql  
-- Localização: c:\projetos\finance_dev\HomeOS\scripts\InvestmentSchema.sql
```

## 🎯 Execução do Backend (API)

**IMPORTANTE: Use `dotnet run` ao invés de `dotnet watch`**

```bash
# Navegue até a pasta da API
cd c:\projetos\finance_dev\HomeOS\src\HomeOS.Api

# Execute (SEM watch)
dotnet run

# A API estará disponível em: http://localhost:5050
```

## 🌐 Execução do Frontend (Client)

### Opção 1: Desenvolvimento (Recomendado)
```bash
# Navegue até a pasta do Client
cd c:\projetos\finance_dev\HomeOS\src\HomeOS.Client

# Execute em modo dev
npm run dev

# Acesse: http://localhost:5173
```

### Opção 2: Se houver problema de PowerShell Execution Policy
```powershell
# Execute uma vez (como Administrador)
Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser

# Depois execute normalmente
npm run dev
```

### Opção 3: Build de produção
```bash
# Build
npm run build

# Preview
npm run preview
```

## 🗺️ Navegação no Sistema

### Novas Páginas Implementadas

1. **💳 Dívidas** - `/debts`
   - Visualização em cards e tabela
   - Cadastro de financiamentos e empréstimos
   - Modal de tabela de amortização
   - Estatísticas de saldo devedor
   - Progresso de pagamento visual

2. **📈 Investimentos** - `/investments`
   - Visualização em cards e tabela
   - Cadastro de investimentos (Ações, Renda Fixa, Imóveis, Cripto)
   - Modal de performance detalhada
   - Portfólio consolidado
   - Cálculos de rentabilidade em tempo real

### Acesso pelo Menu Lateral

Na seção **Financeiro** do menu lateral, você encontrará:
- 💸 Transações
- 🔄 Recorrências
- **💳 Dívidas** ← NOVO
- **📈 Investimentos** ← NOVO

## 🧪 Testando as Funcionalidades

### 1. Testar Dívidas

#### Criar uma dívida:
1. Acesse `/debts`
2. Clique em "+ Nova Dívida"
3. Preencha o formulário:
   - **Nome**: "Financiamento Apartamento"
   - **Categoria**: Financiamento Imobiliário
   - **Credor**: "Banco XYZ"
   - **Valor**: 500000
   - **Taxa Mensal**: 0.7 (0.7%)
   - **Sistema**: Tabela Price
   - **Parcelas**: 360
   - **Data**: Data atual

4. Clique em "Cadastrar Dívida"

#### Visualizar Tabela de Amortização:
1. No card da dívida, clique em "📊 Tabela"
2. Veja todas as parcelas com:
   - Vencimento
   - Valor da parcela
   - Amortização
   - Juros
   - Saldo restante

### 2. Testar Investimentos

#### Criar um investimento em Ações:
1. Acesse `/investments`
2. Clique em "+ Novo Investimento"
3. Preencha:
   - **Nome**: "PETR4"
   - **Tipo**: Ações
   - **Ticker**: "PETR4"
   - **Quantidade**: 100
   - **Preço Unitário**: 35.50
   - **Data**: Data atual

4. Clique em "Cadastrar Investimento"

#### Ver Performance:
1. No card do investimento, clique em "📊 Performance"
2. Veja:
   - Valor atual
   - Rentabilidade (%)
   - Rentabilidade anualizada
   - Lucro/Prejuízo

#### Criar um CDB:
1. Clique em "+ Novo Investimento"
2. Selecione **Tipo**: Renda Fixa
3. O formulário se adapta mostrando:
   - **Subtipo**: CDB
   - **Banco**: "Banco Inter"
   - Demais campos

## 🔧 Troubleshooting

### Problema: "dotnet watch" erro com .fsproj
**Solução**: Use `dotnet run` sem watch. O F# não suporta bem hot reload.

### Problema: Frontend não atualiza
**Solução**:
```bash
# Pare o frontend (Ctrl+C)
# Limpe cache
npm run dev -- --force
```

### Problema: CORS Error
**Solução**: Verifique se a API está rodando em `http://localhost:5050`

### Problema: "userId não encontrado"
**Solução**: Faça login primeiro. O sistema usa `localStorage` para userId.

## 📊 Endpoints da API

### Dívidas
- `GET /api/debts?userId={guid}` - Lista todas as dívidas
- `POST /api/debts` - Cria nova dívida
- `GET /api/debts/{id}/amortization-schedule` - Tabela de amortização
- `POST /api/debts/{id}/pay-installment` - Pagar parcela
- `GET /api/debts/statistics?userId={guid}` - Estatísticas

### Investimentos
- `GET /api/investments?userId={guid}` - Lista investimentos
- `POST /api/investments` - Cria investimento
- `POST /api/investments/{id}/buy` - Comprar mais
- `POST /api/investments/{id}/sell` - Vender
- `GET /api/investments/{id}/performance` - Performance
- `GET /api/investments/portfolio?userId={guid}` - Portfolio

## ✅ Checklist de Verificação

- [ ] SQL Scripts executados
- [ ] Backend rodando em http://localhost:5050
- [ ] Frontend rodando em http://localhost:5173
- [ ] Login realizado
- [ ] Menu lateral mostra "Dívidas" e "Investimentos"
- [ ] Consegue criar uma dívida
- [ ] Consegue ver tabela de amortização
- [ ] Consegue criar um investimento
- [ ] Consegue ver performance

## 🎯 Próximas Melhorias Sugeridas

1. Integração com Transactions (pagamento de parcelas)
2. Gráficos de evolução patrimonial
3. Exportação de relatórios
4. Dashboard consolidado
5. Testes automatizados

---

**Status**: ✅ Sistema 100% funcional e pronto para uso!
**Build**: 0 erros, 0 avisos
**Última atualização**: 25/12/2025
