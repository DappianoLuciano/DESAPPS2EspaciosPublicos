# Script para testear el pipeline CI localmente en Windows
# Simula los checks que correrán en GitHub Actions

$ErrorActionPreference = "Continue"

Write-Host "🚀 Testing CI Pipeline Locally" -ForegroundColor Cyan
Write-Host "================================" -ForegroundColor Cyan
Write-Host ""

$FailedChecks = 0

function Print-Success {
    param([string]$Message)
    Write-Host "✅ $Message" -ForegroundColor Green
}

function Print-Error {
    param([string]$Message)
    Write-Host "❌ $Message" -ForegroundColor Red
}

function Print-Warning {
    param([string]$Message)
    Write-Host "⚠️  $Message" -ForegroundColor Yellow
}

function Print-Info {
    param([string]$Message)
    Write-Host "ℹ️  $Message" -ForegroundColor Cyan
}

function Run-Check {
    param(
        [string]$CheckName,
        [scriptblock]$Command
    )

    Write-Host ""
    Write-Host "Running: $CheckName" -ForegroundColor Cyan
    Write-Host "---"

    try {
        & $Command
        if ($LASTEXITCODE -eq 0) {
            Print-Success "$CheckName passed"
            return $true
        } else {
            Print-Error "$CheckName failed"
            return $false
        }
    } catch {
        Print-Error "$CheckName failed with exception: $_"
        return $false
    }
}

# Verificar que estamos en la raíz del proyecto
if (-not (Test-Path "espacios-publicos-backend") -or -not (Test-Path "espacios-publicos-frontend")) {
    Print-Error "Este script debe ejecutarse desde la raíz del proyecto"
    exit 1
}

Print-Info "Iniciando tests del pipeline..."
Write-Host ""

# ========================================
# BACKEND CHECKS
# ========================================
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "🔧 BACKEND CHECKS" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan

Push-Location espacios-publicos-backend

# Install dependencies
if (-not (Run-Check "Backend: Install dependencies" { npm ci })) {
    $FailedChecks++
}

# Generate Prisma
if (-not (Run-Check "Backend: Generate Prisma Client" { npm run prisma:generate })) {
    $FailedChecks++
}

# Run tests
if (-not (Run-Check "Backend: Run tests" { npm test })) {
    $FailedChecks++
}

# Build
if (-not (Run-Check "Backend: Build" { npm run build })) {
    $FailedChecks++
}

# Check for build output
if (Test-Path "dist") {
    Print-Success "Backend: Build artifacts created"
    $size = (Get-ChildItem -Path dist -Recurse | Measure-Object -Property Length -Sum).Sum / 1MB
    Write-Host "Build size: $([math]::Round($size, 2)) MB"
} else {
    Print-Error "Backend: Build artifacts not found"
    $FailedChecks++
}

Pop-Location

# ========================================
# FRONTEND CHECKS
# ========================================
Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "🎨 FRONTEND CHECKS" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan

Push-Location espacios-publicos-frontend

# Install dependencies
if (-not (Run-Check "Frontend: Install dependencies" { npm ci })) {
    $FailedChecks++
}

# Run linter
if (-not (Run-Check "Frontend: Run linter" { npm run lint })) {
    $FailedChecks++
}

# Build
if (-not (Run-Check "Frontend: Build" { npm run build })) {
    $FailedChecks++
}

# Check for build output
if (Test-Path "dist") {
    Print-Success "Frontend: Build artifacts created"
    $size = (Get-ChildItem -Path dist -Recurse | Measure-Object -Property Length -Sum).Sum / 1MB
    Write-Host "Build size: $([math]::Round($size, 2)) MB"

    if ($size -gt 10) {
        Print-Warning "Frontend bundle size is large ($([math]::Round($size, 2))MB). Consider optimization."
    }
} else {
    Print-Error "Frontend: Build artifacts not found"
    $FailedChecks++
}

Pop-Location

# ========================================
# ADDITIONAL CHECKS
# ========================================
Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "🔍 ADDITIONAL CHECKS" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan

# Check for console.log
Print-Info "Checking for console.log in frontend source..."
$consoleLogs = Select-String -Path "espacios-publicos-frontend\src\*.ts", "espacios-publicos-frontend\src\*.tsx" -Pattern "console\.log" -Recursive 2>$null
if ($consoleLogs) {
    Print-Warning "Found console.log statements in frontend source code"
} else {
    Print-Success "No console.log found in frontend"
}

# Check for TODO comments
Print-Info "Checking for TODO/FIXME comments..."
$todos = Select-String -Path ".\*.ts", ".\*.tsx" -Pattern "TODO|FIXME|XXX" -Exclude "*node_modules*", "*dist*" -Recursive 2>$null
if ($todos) {
    Print-Warning "Found $($todos.Count) TODO/FIXME comments"
} else {
    Print-Success "No TODO comments found"
}

# Check for .env files in git
Print-Info "Checking for uncommitted .env files..."
$envFiles = git ls-files | Select-String -Pattern "^\.env$|\.env\.local$"
if ($envFiles) {
    Print-Error "Found .env files in git! These should not be committed."
    $FailedChecks++
} else {
    Print-Success "No .env files in repository"
}

# ========================================
# SUMMARY
# ========================================
Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "📊 TEST SUMMARY" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

if ($FailedChecks -eq 0) {
    Print-Success "All checks passed! ✨"
    Print-Info "You can safely push your changes"
    exit 0
} else {
    Print-Error "$FailedChecks check(s) failed"
    Print-Info "Please fix the issues before pushing"
    exit 1
}
