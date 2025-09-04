param(
  [string]$PlantUmlUrl = "http://localhost:8010"
)

$ErrorActionPreference = 'Stop'
New-Item -ItemType Directory -Force -Path 'docs/architecture' | Out-Null

# Use dependency-cruiser to output DOT, then render with PlantUML's @startdot
$cmd = @'
set -e
npm -s i -g dependency-cruiser@^15
depcruise --no-config -T dot -x "node_modules|playwright-report|web/test-reports|_backup|_versions" web > docs/architecture/js-deps.dot
'@

docker run --rm -v "$PWD`:/src" -w /src node:20 bash -lc $cmd

$puml = "docs/architecture/js-deps.puml"
"@startuml`n@startdot" | Set-Content -Path $puml -NoNewline
Add-Content -Path $puml -Value (Get-Content 'docs/architecture/js-deps.dot' -Raw)
Add-Content -Path $puml -Value "`n@enddot`n@enduml"

function Invoke-PlantUmlSvg($InputPath, $OutputPath) {
  $uri = "$PlantUmlUrl/svg"
  Invoke-WebRequest -UseBasicParsing -Method Post -ContentType 'text/plain' -InFile $InputPath -Uri $uri -OutFile $OutputPath | Out-Null
}

Invoke-PlantUmlSvg -InputPath $puml -OutputPath 'docs/architecture/js-deps.svg'
Write-Host "JS dependency graph written to docs/architecture/js-deps.svg" -ForegroundColor Green
