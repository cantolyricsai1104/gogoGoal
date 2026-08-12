$ErrorActionPreference = 'Stop'

$project = 'gogo-ai-project-202608'
$region = 'asia-east1'
$service = 'gogo-goal-ai'
$port = 8787

$candidates = @(
  'gcloud.cmd',
  (Join-Path ${env:ProgramFiles} 'Google\Cloud SDK\google-cloud-sdk\bin\gcloud.cmd'),
  (Join-Path ${env:ProgramFiles(x86)} 'Google\Cloud SDK\google-cloud-sdk\bin\gcloud.cmd'),
  (Join-Path ${env:LOCALAPPDATA} 'Google\Cloud SDK\google-cloud-sdk\bin\gcloud.cmd')
)
$gcloud = $null
foreach ($candidate in $candidates) {
  if ($candidate -eq 'gcloud.cmd') {
    $command = Get-Command $candidate -ErrorAction SilentlyContinue
    if ($command) { $gcloud = $command.Source; break }
  } elseif (Test-Path -LiteralPath $candidate) {
    $gcloud = $candidate
    break
  }
}

if (-not $gcloud) {
  throw 'gcloud CLI was not found. Add it to PATH or edit scripts/cloud-run-proxy.ps1 with its path.'
}

Write-Host "Starting authenticated Cloud Run proxy on http://127.0.0.1:$port"
& $gcloud run services proxy $service --project=$project --region=$region --port=$port
