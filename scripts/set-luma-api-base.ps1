param(
  [Parameter(Mandatory = $true)]
  [string]$ApiBaseUrl
)

$ErrorActionPreference = "Stop"

$root = Split-Path -Parent $PSScriptRoot
$cleanUrl = $ApiBaseUrl.Trim().TrimEnd("/")

if ($cleanUrl -notmatch "^https://") {
  throw "ApiBaseUrl must start with https://"
}

$configPath = Join-Path $root "luma-config.js"
Set-Content -LiteralPath $configPath -Value "window.LUMA_API_BASE_URL = `"$cleanUrl`";" -Encoding utf8

$htmlFiles = @(
  "admin.html",
  "ai-builder.html",
  "client/setup/index.html",
  "site.html"
)

$nextVersion = [int][double]::Parse((Get-Date -UFormat %s))

foreach ($relativePath in $htmlFiles) {
  $path = Join-Path $root $relativePath
  $content = Get-Content -LiteralPath $path -Raw
  $content = $content -replace "luma-config\.js\?v=\d+", "luma-config.js?v=$nextVersion"
  Set-Content -LiteralPath $path -Value $content -Encoding utf8
}

Write-Host "Luma API base URL updated to $cleanUrl"
Write-Host "Config cache version: $nextVersion"
