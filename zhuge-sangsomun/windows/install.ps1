# Zhuge Liang Sangsomun - installer (Windows)
# Registers a scheduled task that runs every day at 07:00 and at every logon.
# ASCII-only on purpose (Windows PowerShell 5.1).

$ErrorActionPreference = 'Stop'
$run  = Join-Path $PSScriptRoot 'run.ps1'
$name = 'ZhugeLiang-Sangsomun'
$user = "$env:USERDOMAIN\$env:USERNAME"
$arg  = "-NoProfile -WindowStyle Hidden -ExecutionPolicy Bypass -File `"$run`""

$action    = New-ScheduledTaskAction -Execute 'powershell.exe' -Argument $arg
$daily     = New-ScheduledTaskTrigger -Daily -At '07:00'
$logon     = New-ScheduledTaskTrigger -AtLogOn -User $user
$logon.Delay = 'PT30S'
$settings  = New-ScheduledTaskSettingsSet -StartWhenAvailable -AllowStartIfOnBatteries -DontStopIfGoingOnBatteries -ExecutionTimeLimit (New-TimeSpan -Minutes 20)
$principal = New-ScheduledTaskPrincipal -UserId $user -LogonType Interactive -RunLevel Limited

$startupCmd = Join-Path ([Environment]::GetFolderPath('Startup')) 'ZhugeLiang-Sangsomun.cmd'

try {
    Register-ScheduledTask -TaskName $name -Action $action -Trigger @($daily, $logon) -Settings $settings -Principal $principal -Force | Out-Null
    Write-Host "[OK] Scheduled task '$name' registered: every day 07:00 + at logon."
} catch {
    # Some PCs refuse logon triggers without admin rights: fall back to daily task + Startup folder.
    Register-ScheduledTask -TaskName $name -Action $action -Trigger $daily -Settings $settings -Principal $principal -Force | Out-Null
    Set-Content -Path $startupCmd -Encoding ASCII -Value "@start `"`" /min powershell.exe $arg"
    Write-Host "[OK] Daily 07:00 task registered. Logon launcher placed in the Startup folder."
}

Write-Host 'Opening your first sangsomun now...'
Start-Process powershell.exe -ArgumentList $arg
