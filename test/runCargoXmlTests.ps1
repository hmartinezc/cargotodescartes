# Script de test para validar Cargo-XML IATA
# Ejecutar desde PowerShell: .\test\runCargoXmlTests.ps1

Write-Host "========================================================"  -ForegroundColor Cyan
Write-Host "     IATA Cargo-XML Validation Tests Runner"              -ForegroundColor Cyan
Write-Host "========================================================"  -ForegroundColor Cyan
Write-Host ""

$projectRoot = Split-Path -Parent (Split-Path -Parent $MyInvocation.MyCommand.Path)
Set-Location $projectRoot

Write-Host "Proyecto: $projectRoot" -ForegroundColor Gray
Write-Host ""

# Verificar que tsx está disponible
if (-not (Get-Command "npx" -ErrorAction SilentlyContinue)) {
    Write-Host "Error: npx no encontrado. Instale Node.js" -ForegroundColor Red
    exit 1
}

Write-Host "Ejecutando tests de validación Cargo-XML..." -ForegroundColor Yellow
Write-Host ""

# Ejecutar el test con tsx (TypeScript ejecutor)
npx tsx test/cargoXmlValidator.test.ts

if ($LASTEXITCODE -eq 0) {
    Write-Host ""
    Write-Host "========================================================" -ForegroundColor Green
    Write-Host "     Tests completados" -ForegroundColor Green
    Write-Host "========================================================" -ForegroundColor Green
} else {
    Write-Host ""
    Write-Host "========================================================" -ForegroundColor Red
    Write-Host "     Tests fallaron con código: $LASTEXITCODE" -ForegroundColor Red
    Write-Host "========================================================" -ForegroundColor Red
}
