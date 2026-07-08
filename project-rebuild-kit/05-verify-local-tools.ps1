$ErrorActionPreference = "Continue"

Write-Host "KREATON local tool verification"
Write-Host "================================"

$env:NPM_CONFIG_PREFIX = "C:\Users\alber\Projects\.tools\npm"

$tools = @(
    @{ Name = "Git"; Command = "git"; Args = @("--version") },
    @{ Name = "Node"; Command = "node"; Args = @("--version") },
    @{ Name = "npm"; Command = "npm"; Args = @("--version") },
    @{ Name = "Python"; Command = "python"; Args = @("--version") },
    @{ Name = "PHP portable"; Command = "C:\Users\alber\Projects\.tools\php-8.5.8\php.exe"; Args = @("-v") },
    @{ Name = "Composer portable"; Command = "C:\Users\alber\Projects\.tools\composer\composer.cmd"; Args = @("--version") }
)

foreach ($tool in $tools) {
    Write-Host ""
    Write-Host "Checking $($tool.Name)..."
    try {
        & $tool.Command @($tool.Args)
    } catch {
        Write-Host "Missing or not working: $($tool.Name)" -ForegroundColor Red
    }
}

Write-Host ""
Write-Host "Done."
