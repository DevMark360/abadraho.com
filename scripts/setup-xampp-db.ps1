# AbadRaho v2 — XAMPP MySQL setup (run once after XAMPP MySQL is started)
# Creates database + user matching Laravel .env

$mysql = "C:\xampp\mysql\bin\mysql.exe"
if (-not (Test-Path $mysql)) {
  Write-Error "XAMPP MySQL not found at $mysql"
  exit 1
}

$dbName = "markprop_dev"
$dbUser = "markprop_usrDev"
$envFile = Join-Path $PSScriptRoot "..\.env"
$dbPass = $env:LEGACY_DB_PASSWORD
if (-not $dbPass -and (Test-Path $envFile)) {
  $line = Get-Content $envFile | Where-Object { $_ -match '^\s*LEGACY_DB_PASSWORD\s*=' } | Select-Object -First 1
  if ($line) { $dbPass = ($line -split '=', 2)[1].Trim().Trim('"') }
}
if (-not $dbPass) { Write-Error "LEGACY_DB_PASSWORD is not set in .env"; exit 1 }

$sql = @"
CREATE DATABASE IF NOT EXISTS ``$dbName`` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE USER IF NOT EXISTS '$dbUser'@'localhost' IDENTIFIED BY '$dbPass';
CREATE USER IF NOT EXISTS '$dbUser'@'127.0.0.1' IDENTIFIED BY '$dbPass';
GRANT ALL PRIVILEGES ON ``$dbName``.* TO '$dbUser'@'localhost';
GRANT ALL PRIVILEGES ON ``$dbName``.* TO '$dbUser'@'127.0.0.1';
FLUSH PRIVILEGES;
"@

$sql | & $mysql -u root 2>&1
if ($LASTEXITCODE -ne 0) {
  Write-Error "MySQL setup failed. Is XAMPP MySQL running?"
  exit 1
}

Write-Host "OK: Database $dbName and user $dbUser created."
Write-Host "Next: cd abadraho-v2; npx prisma db push; npm run db:seed"
