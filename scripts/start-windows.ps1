# TracKeeper local launcher for Windows.
# - Frees the 8080-8099 dev-port range.
# - Starts Expo on LAN host/port 8080 for Web + Expo Go device testing.

param(
  [int]$PortStart = $(if ($env:PORT_START) { [int]$env:PORT_START } else { 8080 }),
  [int]$PortEnd = $(if ($env:PORT_END) { [int]$env:PORT_END } else { 8099 }),
  [int]$ExpoPort = $(if ($env:EXPO_PORT) { [int]$env:EXPO_PORT } else { 8080 }),
  [string]$ExpoHost = $(if ($env:EXPO_HOST) { $env:EXPO_HOST } else { "lan" })
)

$ErrorActionPreference = "Stop"
$ProjectDir = Resolve-Path (Join-Path $PSScriptRoot "..")
Set-Location $ProjectDir

Write-Host "TracKeeper launcher"
Write-Host "Project: $ProjectDir"
Write-Host "Clearing TCP ports $PortStart-$PortEnd..."

for ($port = $PortStart; $port -le $PortEnd; $port++) {
  $lines = netstat -ano -p tcp | Select-String -Pattern "[:.]$port\\s"
  foreach ($line in $lines) {
    $parts = ($line.ToString() -split "\\s+") | Where-Object { $_ -ne "" }
    $pidText = $parts[-1]
    if ($pidText -match "^[0-9]+$") {
      $pidNumber = [int]$pidText
      try {
        $process = Get-Process -Id $pidNumber -ErrorAction Stop
        Write-Host "  port $port: killing PID $pidNumber ($($process.ProcessName))"
        Stop-Process -Id $pidNumber -Force -ErrorAction SilentlyContinue
      } catch {
        # Process may have already exited.
      }
    }
  }
}

$lanIp = Get-NetIPAddress -AddressFamily IPv4 |
  Where-Object {
    $_.IPAddress -notlike "127.*" -and
    $_.IPAddress -notlike "169.254.*" -and
    $_.InterfaceOperationalStatus -eq "Up"
  } |
  Select-Object -First 1 -ExpandProperty IPAddress

if (-not $lanIp) {
  $lanIp = "localhost"
}

Write-Host ""
Write-Host "Starting Expo..."
Write-Host "Web:      http://$lanIp`:$ExpoPort"
Write-Host "Expo Go:  exp://$lanIp`:$ExpoPort"
Write-Host ""

npx expo start --web --port $ExpoPort --host $ExpoHost
