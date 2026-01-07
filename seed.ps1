$baseUrl = "http://localhost:5055/api"

function Post-Request([string]$endpoint, [hashtable]$body) {
    $json = $body | ConvertTo-Json
    Invoke-RestMethod -Uri "$baseUrl/$endpoint" -Method Post -Body $json -ContentType "application/json"
}

Write-Host "⏳ Aguardando API iniciar..."
Start-Sleep -Seconds 10

Write-Host "🌱 Semeando Categorias..."
Post-Request "categories" @{ Name="Supermercado"; Type="Expense"; Icon="🛒" }
Post-Request "categories" @{ Name="Salário"; Type="Income"; Icon="💰" }
Post-Request "categories" @{ Name="Lazer"; Type="Expense"; Icon="🎮" }

Write-Host "🌱 Semeando Contas..."
Post-Request "accounts" @{ Name="Nubank"; Type="Checking"; InitialBalance=1500.00 }
Post-Request "accounts" @{ Name="Carteira"; Type="Wallet"; InitialBalance=50.00 }

Write-Host "🌱 Semeando Cartões..."
Post-Request "credit-cards" @{ Name="Visa Infinite"; ClosingDay=5; DueDay=10; Limit=15000.00 }

Write-Host "✅ Dados semeados com sucesso!"
