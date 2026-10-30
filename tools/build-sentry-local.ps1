# Upload source maps for the local staging artifact using a Windows user-protected token.
# Does not deploy or publish the website.
$ErrorActionPreference = 'Stop'
$repositoryRoot = Split-Path -Parent $PSScriptRoot
Push-Location -LiteralPath $repositoryRoot
$names = @('SENTRY_AUTH_TOKEN','SENTRY_ORG','SENTRY_PROJECT','SENTRY_UPLOAD_SOURCEMAPS','VITE_SENTRY_ENABLED','VITE_SENTRY_ENVIRONMENT')
$previous = @{}
foreach ($name in $names) { $previous[$name] = [Environment]::GetEnvironmentVariable($name, 'Process') }
try {
    Add-Type -AssemblyName System.Security
    $credentialPath = Join-Path $env:LOCALAPPDATA 'FicheBait\BuildSecrets\schema-reference-sentry.dpapi'
    $credentialBytes = [System.Security.Cryptography.ProtectedData]::Unprotect([System.IO.File]::ReadAllBytes($credentialPath), $null, [System.Security.Cryptography.DataProtectionScope]::CurrentUser)
    $env:SENTRY_AUTH_TOKEN = [System.Text.Encoding]::UTF8.GetString($credentialBytes)
    [Array]::Clear($credentialBytes)
    $env:SENTRY_ORG = 'silhouette-web-solutions'
    $env:SENTRY_PROJECT = 'schema-reference-web'
    $env:SENTRY_UPLOAD_SOURCEMAPS = 'true'
    $env:VITE_SENTRY_ENABLED = 'true'
    $env:VITE_SENTRY_ENVIRONMENT = 'staging'
    & npm.cmd run build
    if ($LASTEXITCODE -ne 0) { throw 'The Sentry-enabled build or source-map upload failed.' }
} finally {
    foreach ($name in $names) { [Environment]::SetEnvironmentVariable($name, $previous[$name], 'Process') }
    Pop-Location
}
