# Instalador do MesaFacil Print Service para Windows
# Uso: .\scripts\setup-print-service-windows.ps1 -ServiceAccountPath "C:\path\to\service-account.json"
# Ou com permissões: Set-ExecutionPolicy -ExecutionPolicy Bypass -Scope CurrentUser -Force
#                    .\scripts\setup-print-service-windows.ps1 -ServiceAccountPath "..."

param(
    [string]$ServiceAccountPath = ""
)

$ErrorActionPreference = "Stop"

if ($PSVersionTable.PSVersion.Major -lt 5) {
    Write-Host "PowerShell 5.0 ou superior é necessário." -ForegroundColor Red
    exit 2
}

if ($PSVersionTable.Platform -and $PSVersionTable.Platform -ne "Win32NT") {
    Write-Host "Este instalador é destinado ao Windows." -ForegroundColor Red
    exit 2
}

$RootDir = Split-Path -Parent $PSScriptRoot
$AppDataDir = $env:APPDATA
$DefaultConfigDir = Join-Path $AppDataDir "MesaFacil"
$DefaultSAPath = Join-Path $DefaultConfigDir "service-account.json"
$LogsDir = Join-Path $AppDataDir "MesaFacil" "Logs"
$StdoutLog = Join-Path $LogsDir "print-service.out.log"
$StderrLog = Join-Path $LogsDir "print-service.err.log"
$PortValue = $env:PORT ?? "4891"
$HostValue = $env:HOST ?? "127.0.0.1"
$QueueWorkerValue = $env:ENABLE_QUEUE_WORKER ?? "true"
$AdcValue = $env:ALLOW_FIREBASE_ADC ?? "false"
$TaskName = "MesaFacil Print Service"
$TaskPath = "\MesaFacil\"

$NodeCmd = Get-Command node -ErrorAction SilentlyContinue
if (-not $NodeCmd) {
    Write-Host "Node.js não encontrado no PATH. Instale o Node antes de continuar." -ForegroundColor Red
    exit 2
}

$NodeBin = $NodeCmd.Source

Write-Host "Preparando diretórios..." -ForegroundColor Cyan
New-Item -ItemType Directory -Path $DefaultConfigDir -Force | Out-Null
New-Item -ItemType Directory -Path $LogsDir -Force | Out-Null

if ($ServiceAccountPath) {
    if (-not (Test-Path $ServiceAccountPath -PathType Leaf)) {
        Write-Host "Arquivo de credencial não encontrado: $ServiceAccountPath" -ForegroundColor Red
        exit 2
    }

    Write-Host "Copiando credencial..." -ForegroundColor Cyan
    Copy-Item -Path $ServiceAccountPath -Destination $DefaultSAPath -Force
    (Get-Item $DefaultSAPath).Attributes = 'Normal'
    Write-Host "Credencial copiada para $DefaultSAPath" -ForegroundColor Green
}

if (-not (Test-Path $DefaultSAPath -PathType Leaf)) {
    Write-Host "Credencial não encontrada em $DefaultSAPath" -ForegroundColor Red
    Write-Host "Uso: .\scripts\setup-print-service-windows.ps1 -ServiceAccountPath 'C:\path\to\service-account.json'" -ForegroundColor Yellow
    exit 2
}

Write-Host "Instalando dependências do print-service..." -ForegroundColor Cyan
Push-Location "$RootDir\apps\print-service"
npm install
Pop-Location

if ($LASTEXITCODE -ne 0) {
    Write-Host "Falha ao instalar dependências." -ForegroundColor Red
    exit 1
}

Write-Host "Configurando Task Scheduler..." -ForegroundColor Cyan

$PrintServiceScript = Join-Path $RootDir "apps\print-service\server.js"
$TaskAction = New-ScheduledTaskAction `
    -Execute $NodeBin `
    -Argument $PrintServiceScript `
    -WorkingDirectory "$RootDir\apps\print-service"

$TaskTrigger = New-ScheduledTaskTrigger -AtLogOn

$TaskSettings = New-ScheduledTaskSettingsSet `
    -AllowStartIfOnBatteries `
    -DontStopIfGoingOnBatteries `
    -StartWhenAvailable `
    -RestartCount 3 `
    -RestartInterval (New-TimeSpan -Minutes 5) `
    -ExecutionTimeLimit (New-TimeSpan -Hours 23 -Minutes 59)

$TaskDescription = "MesaFacil Print Service - Descoberta automática de impressoras e impressão por setor"

$Principal = New-ScheduledTaskPrincipal -UserId "$env:USERDOMAIN\$env:USERNAME" -LogonType Interactive

$EnvironmentLines = @(
    "PORT=$PortValue",
    "HOST=$HostValue",
    "ENABLE_QUEUE_WORKER=$QueueWorkerValue",
    "ALLOW_FIREBASE_ADC=$AdcValue",
    "FIREBASE_SERVICE_ACCOUNT_PATH=$DefaultSAPath",
    "GOOGLE_APPLICATION_CREDENTIALS=$DefaultSAPath"
)

$EnvFile = Join-Path $DefaultConfigDir "print-service.env"
Set-Content -Path $EnvFile -Value $EnvironmentLines -Force

$WrapperScript = @"
`$env:PATH = `$env:PATH + `;$([System.IO.Path]::GetDirectoryName($NodeBin))`
`$envVars = Get-Content '$EnvFile' | Where-Object { `$_ -match '=' }
foreach (`$line in `$envVars) {
    if (`$line -match '^([^=]+)=(.*)$') {
        [System.Environment]::SetEnvironmentVariable(`$matches[1], `$matches[2], 'Process')
    }
}
& '$NodeBin' '$PrintServiceScript' >> '$StdoutLog' 2>> '$StderrLog'
"@

$WrapperScriptPath = Join-Path $DefaultConfigDir "print-service-wrapper.ps1"
Set-Content -Path $WrapperScriptPath -Value $WrapperScript -Force

$TaskAction = New-ScheduledTaskAction `
    -Execute "powershell.exe" `
    -Argument "-NoProfile -ExecutionPolicy Bypass -File `"$WrapperScriptPath`"" `
    -WorkingDirectory "$RootDir\apps\print-service"

$ExistingTask = Get-ScheduledTask -TaskName $TaskName -TaskPath $TaskPath -ErrorAction SilentlyContinue
if ($ExistingTask) {
    Write-Host "Desinstalando tarefa existente..." -ForegroundColor Cyan
    Unregister-ScheduledTask -TaskName $TaskName -TaskPath $TaskPath -Confirm:$false
}

Register-ScheduledTask `
    -TaskName $TaskName `
    -TaskPath $TaskPath `
    -Action $TaskAction `
    -Trigger $TaskTrigger `
    -Settings $TaskSettings `
    -Principal $Principal `
    -Description $TaskDescription `
    -Force

Write-Host "Task Scheduler registrada com sucesso!" -ForegroundColor Green
Write-Host ""
Write-Host "Informações de configuração:" -ForegroundColor Cyan
Write-Host "  Credencial padrão: $DefaultSAPath"
Write-Host "  Variáveis de ambiente: $EnvFile"
Write-Host "  Script wrapper: $WrapperScriptPath"
Write-Host "  Logs stdout: $StdoutLog"
Write-Host "  Logs stderr: $StderrLog"
Write-Host ""
Write-Host "A tarefa foi registrada e iniciará automaticamente no próximo login." -ForegroundColor Cyan
Write-Host "Para iniciar imediatamente, execute:" -ForegroundColor Yellow
Write-Host "  Start-ScheduledTask -TaskName '$TaskName' -TaskPath '$TaskPath'"
Write-Host ""
Write-Host "Teste sugerido após início:" -ForegroundColor Cyan
Write-Host "  curl http://127.0.0.1:$PortValue/config-status"
