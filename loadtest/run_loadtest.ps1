<#
.SYNOPSIS
    Script de lancement de test de charge Siege pour CUBE3
.DESCRIPTION
    Lance un test de charge sur le backend NestJS via le conteneur Docker Siege.
.PARAMETER Concurrent
    Nombre d'utilisateurs simultanés (par défaut : 50)
.PARAMETER Time
    Durée du test (par défaut : 30S pour 30 secondes)
.PARAMETER Benchmark
    Mode Benchmark (sans délai entre les requêtes)
#>

param(
    [int]$Concurrent = 50,
    [string]$Time = "30S",
    [switch]$Benchmark
)

Write-Host "==========================================================" -ForegroundColor Cyan
Write-Host " 🚀 Lancement du test de charge Siege (CUBE3 Backend)" -ForegroundColor Cyan
Write-Host "==========================================================" -ForegroundColor Cyan
Write-Host " Utilisateurs simultanés : $Concurrent" -ForegroundColor Yellow
Write-Host " Durée du test           : $Time" -ForegroundColor Yellow
Write-Host " Mode Benchmark          : $(if ($Benchmark) { 'ACTIVÉ (Intensif)' } else { 'Normal (Délais réalistes)' })" -ForegroundColor Yellow
Write-Host "==========================================================" -ForegroundColor Cyan
Write-Host " 💡 ASTUCE : Ouvrez Grafana (http://localhost:3001) pour voir le pic de charge en direct !" -ForegroundColor Green
Write-Host ""

$cmdArgs = @("exec", "-it", "collector-siege", "siege", "-c", $Concurrent, "-t", $Time, "-f", "/loadtest/urls.txt")
if ($Benchmark) {
    $cmdArgs += "-b"
}

docker @cmdArgs
