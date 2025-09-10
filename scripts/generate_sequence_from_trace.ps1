param(
  [string]$PlantUmlUrl = "http://localhost:8010"
)

$ErrorActionPreference = 'Stop'

docker run --rm -v "$PWD`:/src" -w /src python:3.11 bash -lc 'python scripts/trace_to_sequence.py'

if (Test-Path 'docs/architecture/seq-latest.puml') {
  Invoke-WebRequest -UseBasicParsing -Method Post -ContentType 'text/plain' -InFile 'docs/architecture/seq-latest.puml' -Uri "$PlantUmlUrl/svg" -OutFile 'docs/architecture/seq-latest.svg'
  Write-Host "Sequence diagram generated: docs/architecture/seq-latest.svg" -ForegroundColor Green
} else {
  Write-Host "No sequence PUML generated" -ForegroundColor Yellow
}

