param(
  [string]$DbHost = 'host.docker.internal',
  [int]$Port = 33066,
  [string]$Db = 'taskmaster',
  [string]$User = 'tmuser',
  [string]$Password = 'tmpassword'
)

$ErrorActionPreference = 'Stop'
New-Item -ItemType Directory -Force -Path 'docs/db-erd' | Out-Null

docker run --rm `
  -v "$PWD`/docs/db-erd:/output" schemaspy/schemaspy `
  -t mysql `
  -host $DbHost `
  -port $Port `
  -db $Db `
  -s $Db `
  -u $User `
  -p $Password

Write-Host "SchemaSpy ERD generated in docs/db-erd" -ForegroundColor Green
