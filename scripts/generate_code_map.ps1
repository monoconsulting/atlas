param(
  [string]$PlantUmlUrl = "http://localhost:8010"
)

$ErrorActionPreference = 'Stop'

function Invoke-PlantUmlSvg {
  param(
    [Parameter(Mandatory=$true)][string]$InputPath,
    [Parameter(Mandatory=$true)][string]$OutputPath,
    [string]$Endpoint = "/svg"
  )
  Write-Host "Render $InputPath -> $OutputPath" -ForegroundColor Cyan
  $uri = "$PlantUmlUrl$Endpoint"
  Invoke-WebRequest -UseBasicParsing -Method Post -ContentType 'text/plain' -InFile $InputPath -Uri $uri -OutFile $OutputPath | Out-Null
}

New-Item -ItemType Directory -Force -Path "docs/architecture" | Out-Null

# 1) Python class/package diagrams via pyreverse (PlantUML output)
Write-Host "Generating Python class diagrams (pyreverse)" -ForegroundColor Green
$cmd = 'pip install -q pylint && pyreverse -o plantuml -p app app -d docs/architecture'
docker run --rm `
  -v "$PWD`:/src" -w /src `
  python:3.11 bash -lc $cmd

# Render any classes_*.puml to SVG
Get-ChildItem docs/architecture -Filter "classes_*.puml" | ForEach-Object {
  $out = [IO.Path]::ChangeExtension($_.FullName, ".svg")
  Invoke-PlantUmlSvg -InputPath $_.FullName -OutputPath $out
}

# 2) Python module map via AST (custom script)
Write-Host "Generating Python module map (AST)" -ForegroundColor Green
docker run --rm `
  -v "$PWD`:/src" -w /src `
  python:3.11 bash -lc 'python scripts/python_code_map.py'

# Render python-modules.puml to SVG
if (Test-Path "docs/architecture/python-modules.puml") {
  Invoke-PlantUmlSvg -InputPath "docs/architecture/python-modules.puml" -OutputPath "docs/architecture/python-modules.svg"
}

Write-Host "Done. See docs/architecture for outputs." -ForegroundColor Green
