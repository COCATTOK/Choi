# Zhuge Liang Sangsomun - daily runner (Windows)
# 1) Opens the sangsomun window.
# 2) If today's memorial has not been written yet, asks Claude Code (claude -p)
#    to write a new one from about-me.md + recent Claude Code prompt history.
# This file is intentionally ASCII-only so Windows PowerShell 5.1 reads it correctly.

$ErrorActionPreference = 'Continue'
$root    = Split-Path -Parent $PSScriptRoot
$dataDir = Join-Path $root 'data'
$archive = Join-Path $dataDir 'archive'
$html    = Join-Path $root 'sangsomun.html'
$today   = Get-Date -Format 'yyyy-MM-dd'
$utf8    = New-Object System.Text.UTF8Encoding $false

[Console]::OutputEncoding = $utf8
[Console]::InputEncoding  = $utf8
$OutputEncoding = $utf8

New-Item -ItemType Directory -Force -Path $archive | Out-Null

function Write-Utf8($path, $text) { [IO.File]::WriteAllText($path, $text, $utf8) }

function Write-Status($state, $reason) {
    Write-Utf8 (Join-Path $dataDir 'status.js') ("window.SANGSOMUN_STATUS = {state:'$state', date:'$today', reason:'$reason'};`n")
}

function Open-Window {
    $url = ([Uri]$html).AbsoluteUri
    $candidates = @(
        "${env:ProgramFiles(x86)}\Microsoft\Edge\Application\msedge.exe",
        "$env:ProgramFiles\Microsoft\Edge\Application\msedge.exe",
        "$env:ProgramFiles\Google\Chrome\Application\chrome.exe",
        "$env:LOCALAPPDATA\Google\Chrome\Application\chrome.exe"
    )
    foreach ($b in $candidates) {
        if ($b -and (Test-Path $b)) {
            Start-Process -FilePath $b -ArgumentList @("--app=$url", '--window-size=1180,900')
            return
        }
    }
    Start-Process $html
}

function Find-Claude {
    $cmd = Get-Command claude -ErrorAction SilentlyContinue
    if ($cmd) { return $cmd.Source }
    foreach ($p in @("$env:USERPROFILE\.local\bin\claude.exe", "$env:APPDATA\npm\claude.cmd")) {
        if (Test-Path $p) { return $p }
    }
    return $null
}

$lastFile = Join-Path $dataDir 'last-generated.txt'
$lockFile = Join-Path $dataDir 'writing.lock'
$done = (Test-Path $lastFile) -and ((Get-Content $lastFile -Raw).Trim() -eq $today)
$locked = (Test-Path $lockFile) -and ((Get-Item $lockFile).LastWriteTime -gt (Get-Date).AddMinutes(-15))

if ($done -or $locked) { Open-Window; exit 0 }

$claude = Find-Claude
if (-not $claude) { Write-Status 'failed' 'claude-not-found'; Open-Window; exit 0 }

Write-Utf8 $lockFile $today
Write-Status 'writing' ''
Open-Window

try {
    $sb = New-Object System.Text.StringBuilder
    [void]$sb.AppendLine((Get-Content (Join-Path $root 'prompt.md') -Raw -Encoding UTF8))
    [void]$sb.AppendLine("`n## ABOUT ME (about-me.md)`n")
    $about = Join-Path $root 'about-me.md'
    if (Test-Path $about) { [void]$sb.AppendLine((Get-Content $about -Raw -Encoding UTF8)) }
    [void]$sb.AppendLine("`n## RECENT CLAUDE CODE PROMPTS (~/.claude/history.jsonl, newest last)`n")
    $hist = Join-Path $env:USERPROFILE '.claude\history.jsonl'
    if (Test-Path $hist) {
        foreach ($line in (Get-Content $hist -Tail 200 -Encoding UTF8)) {
            if ($line.Length -gt 800) { $line = $line.Substring(0, 800) + '...' }
            [void]$sb.AppendLine($line)
        }
    } else {
        [void]$sb.AppendLine('(no history yet)')
    }
    $archived = Get-ChildItem $archive -Filter '*.json' -ErrorAction SilentlyContinue | Sort-Object Name | Select-Object -Last 1
    if ($archived) {
        [void]$sb.AppendLine("`n## YESTERDAY'S MEMORIAL (do not repeat the same advice)`n")
        [void]$sb.AppendLine((Get-Content $archived.FullName -Raw -Encoding UTF8))
    }
    [void]$sb.AppendLine("`nTODAY: $today")

    $out = ($sb.ToString() | & $claude -p 2>$null) -join "`n"

    $s = $out.IndexOf('{'); $e = $out.LastIndexOf('}')
    if ($s -lt 0 -or $e -le $s) { throw 'bad-output' }
    $json = $out.Substring($s, $e - $s + 1)
    $obj = $json | ConvertFrom-Json
    if (-not $obj.part1.paragraphs -or -not $obj.part2.paragraphs) { throw 'bad-output' }

    Write-Utf8 (Join-Path $archive "$today.json") $json
    Write-Utf8 (Join-Path $dataDir 'today.js') ("window.SANGSOMUN_TODAY = {`"date`":`"$today`",`"content`":$json};`n")
    Write-Utf8 $lastFile $today
    Write-Status 'done' ''
} catch {
    $reason = if ("$_" -eq 'bad-output') { 'bad-output' } else { 'claude-error' }
    Write-Status 'failed' $reason
} finally {
    Remove-Item $lockFile -ErrorAction SilentlyContinue
}
