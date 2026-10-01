# Import legacy MySQL dump into XAMPP (same data as dev.abadraho.com)
param(
  [string]$SqlFile = "",
  [string]$DbName = "markprop_dev_abadraho"
)

$mysql = "C:\xampp\mysql\bin\mysql.exe"
if (-not (Test-Path $mysql)) { Write-Error "Start XAMPP MySQL first."; exit 1 }

$candidates = @()
if ($SqlFile) { $candidates += $SqlFile }
$candidates += @(
  "$PSScriptRoot\..\data\markprop_dev_abadraho.sql",
  "$PSScriptRoot\..\data\markprop_dev.sql",
  "$PSScriptRoot\..\data\database.sql",
  "$env:USERPROFILE\Downloads\markprop_dev_abadraho.sql",
  "$env:USERPROFILE\Downloads\markprop_dev.sql"
)

$dataDir = "$PSScriptRoot\..\data"
if (Test-Path $dataDir) {
  Get-ChildItem -Path $dataDir -Filter "*.sql" -File | ForEach-Object { $candidates += $_.FullName }
}

$SqlFile = $candidates | Where-Object { $_ -and (Test-Path $_) } | Select-Object -First 1
if (-not $SqlFile) {
  Write-Error @"
SQL file not found. Place dump in:
  e:\abadraho-v2\data\markprop_dev_abadraho.sql
or Downloads\markprop_dev_abadraho.sql
"@
  exit 1
}

$dbUser = "markprop_usrDev"
$envFile = Join-Path $PSScriptRoot "..\.env"
$dbPass = $env:LEGACY_DB_PASSWORD
if (-not $dbPass -and (Test-Path $envFile)) {
  $line = Get-Content $envFile | Where-Object { $_ -match '^\s*LEGACY_DB_PASSWORD\s*=' } | Select-Object -First 1
  if ($line) { $dbPass = ($line -split '=', 2)[1].Trim().Trim('"') }
}
if (-not $dbPass) { Write-Error "LEGACY_DB_PASSWORD is not set in .env"; exit 1 }

Write-Host "Using SQL: $SqlFile"
Write-Host "Target DB: $DbName (may take 1-3 min)..."

$setup = @"
DROP DATABASE IF EXISTS ``$DbName``;
CREATE DATABASE ``$DbName`` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
GRANT ALL PRIVILEGES ON ``$DbName``.* TO '$dbUser'@'localhost';
GRANT ALL PRIVILEGES ON ``$DbName``.* TO '$dbUser'@'127.0.0.1';
FLUSH PRIVILEGES;
"@
$setup | & $mysql -u root 2>&1
if ($LASTEXITCODE -ne 0) { exit 1 }

Get-Content -Path $SqlFile -Raw | & $mysql -u root $DbName 2>&1
if ($LASTEXITCODE -ne 0) {
  Write-Error "Import failed. Try phpMyAdmin: Import -> $SqlFile"
  exit 1
}

$count = & $mysql -u root $DbName -e "SELECT COUNT(*) AS c FROM projects;" 2>&1
Write-Host "Done. Projects:"
Write-Host $count
Write-Host ""
Write-Host "abadraho-v2/.env:"
Write-Host "  USE_DATABASE=true"
Write-Host "  DATABASE_URL=mysql://${dbUser}:PASSWORD@127.0.0.1:3306/${DbName}"
Write-Host ""
Write-Host "Then: cd e:\abadraho-v2; npm run db:verify; npm run dev"
