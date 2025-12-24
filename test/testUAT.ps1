# ============================================================
# SCRIPT DE PRUEBA UAT - TRAXON cargoJSON API
# ============================================================
# Ejecutar desde PowerShell:
# .\test\testUAT.ps1
# ============================================================

$ErrorActionPreference = "Continue"

# Configuración UAT
$ENDPOINT = "https://community.champ.aero:8444/avatar-uat/NO_WAIT"
$PASSWORD = "S81bLvtr3Nz!"

# Crear header de autenticación Basic (usuario vacío, solo password)
$base64Auth = [Convert]::ToBase64String([Text.Encoding]::ASCII.GetBytes(":$PASSWORD"))

$headers = @{
    "Content-Type" = "application/json"
    "Authorization" = "Basic $base64Auth"
    "Accept" = "application/json"
}

Write-Host ""
Write-Host "╔════════════════════════════════════════════════════════════╗" -ForegroundColor Cyan
Write-Host "║     PRUEBAS UAT - TRAXON cargoJSON API                     ║" -ForegroundColor Cyan
Write-Host "╚════════════════════════════════════════════════════════════╝" -ForegroundColor Cyan
Write-Host ""
Write-Host "📅 Fecha: $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')" -ForegroundColor Gray
Write-Host "🔗 Endpoint: $ENDPOINT" -ForegroundColor Gray
Write-Host ""

# Ignorar errores de certificado SSL para UAT
[System.Net.ServicePointManager]::ServerCertificateValidationCallback = { $true }

# Si PowerShell 7+, usar -SkipCertificateCheck
$psVersion = $PSVersionTable.PSVersion.Major

# ============================================================
# PRUEBA 1: AWB DIRECTO
# ============================================================
Write-Host "═══════════════════════════════════════════════════════════" -ForegroundColor Yellow
Write-Host "🔷 PRUEBA 1: AWB DIRECTO (Sin Houses)" -ForegroundColor Yellow
Write-Host "═══════════════════════════════════════════════════════════" -ForegroundColor Yellow

$awbDirectoPath = Join-Path $PSScriptRoot "awb_directo_test.json"
$awbDirecto = Get-Content $awbDirectoPath -Raw

Write-Host "📤 Enviando AWB Directo: 145-12345678..." -ForegroundColor White

try {
    if ($psVersion -ge 7) {
        $response1 = Invoke-RestMethod -Uri $ENDPOINT -Method POST -Headers $headers -Body $awbDirecto -SkipCertificateCheck
    } else {
        # Para PS 5.1, ignorar SSL de otra forma
        Add-Type @"
using System.Net;
using System.Security.Cryptography.X509Certificates;
public class TrustAllCerts : ICertificatePolicy {
    public bool CheckValidationResult(ServicePoint sp, X509Certificate cert, WebRequest req, int problem) { return true; }
}
"@
        [System.Net.ServicePointManager]::CertificatePolicy = New-Object TrustAllCerts
        $response1 = Invoke-RestMethod -Uri $ENDPOINT -Method POST -Headers $headers -Body $awbDirecto
    }
    Write-Host "✅ ÉXITO - AWB Directo enviado" -ForegroundColor Green
    Write-Host "Respuesta: $response1" -ForegroundColor Gray
} catch {
    Write-Host "❌ ERROR - AWB Directo" -ForegroundColor Red
    Write-Host "Status: $($_.Exception.Response.StatusCode.value__)" -ForegroundColor Red
    Write-Host "Error: $($_.Exception.Message)" -ForegroundColor Red
}

Start-Sleep -Seconds 2

# ============================================================
# PRUEBA 2: AWB CONSOLIDADO
# ============================================================
Write-Host ""
Write-Host "═══════════════════════════════════════════════════════════" -ForegroundColor Yellow
Write-Host "🔷 PRUEBA 2: AWB CONSOLIDADO (Con 3 Houses)" -ForegroundColor Yellow
Write-Host "═══════════════════════════════════════════════════════════" -ForegroundColor Yellow

# 2.1 AWB Master
Write-Host ""
Write-Host "📦 2.1 - AWB Master: 145-98765432" -ForegroundColor White

$awbConsolidadoPath = Join-Path $PSScriptRoot "awb_consolidado_test.json"
$awbConsolidado = Get-Content $awbConsolidadoPath -Raw

try {
    if ($psVersion -ge 7) {
        $response2 = Invoke-RestMethod -Uri $ENDPOINT -Method POST -Headers $headers -Body $awbConsolidado -SkipCertificateCheck
    } else {
        $response2 = Invoke-RestMethod -Uri $ENDPOINT -Method POST -Headers $headers -Body $awbConsolidado
    }
    Write-Host "✅ ÉXITO - AWB Consolidado enviado" -ForegroundColor Green
    Write-Host "Respuesta: $response2" -ForegroundColor Gray
} catch {
    Write-Host "❌ ERROR - AWB Consolidado" -ForegroundColor Red
    Write-Host "Status: $($_.Exception.Response.StatusCode.value__)" -ForegroundColor Red
    Write-Host "Error: $($_.Exception.Message)" -ForegroundColor Red
}

Start-Sleep -Seconds 1

# 2.2 CSL
Write-Host ""
Write-Host "📦 2.2 - CSL (Lista de Consolidación)" -ForegroundColor White

$cslPath = Join-Path $PSScriptRoot "csl_consolidado_test.json"
$csl = Get-Content $cslPath -Raw

try {
    if ($psVersion -ge 7) {
        $response3 = Invoke-RestMethod -Uri $ENDPOINT -Method POST -Headers $headers -Body $csl -SkipCertificateCheck
    } else {
        $response3 = Invoke-RestMethod -Uri $ENDPOINT -Method POST -Headers $headers -Body $csl
    }
    Write-Host "✅ ÉXITO - CSL enviado" -ForegroundColor Green
    Write-Host "Respuesta: $response3" -ForegroundColor Gray
} catch {
    Write-Host "❌ ERROR - CSL" -ForegroundColor Red
    Write-Host "Status: $($_.Exception.Response.StatusCode.value__)" -ForegroundColor Red
    Write-Host "Error: $($_.Exception.Message)" -ForegroundColor Red
}

# ============================================================
# NOTA: Los FHL (House Waybills individuales) YA NO se envían
# Según Traxon EMA, el CSL contiene toda la información necesaria
# de las houses en el campo houseWaybillSummaries
# ============================================================
Write-Host ""
Write-Host "ℹ️ NOTA: FHL individuales ya NO se envían" -ForegroundColor Yellow
Write-Host "   El CSL contiene houseWaybillSummaries con toda la info de las houses" -ForegroundColor Yellow

# ============================================================
# RESUMEN
# ============================================================
Write-Host ""
Write-Host "═══════════════════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host "                    PRUEBAS COMPLETADAS                     " -ForegroundColor Cyan
Write-Host "═══════════════════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host ""
Write-Host "Para consolidados solo se envían: AWB (Master) + CSL" -ForegroundColor White
Write-Host "El CSL incluye houseWaybillSummaries con los detalles de cada house." -ForegroundColor White
Write-Host ""
