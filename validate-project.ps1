$ErrorActionPreference = "Stop"
$root = Split-Path -Parent $MyInvocation.MyCommand.Path
Set-Location $root

$scripts = @(
  "actividad-app.js",
  "actividad-firebase.js",
  "actividad-pdf-loader.js",
  "actividad-utils.js",
  "actividad-network-status.js",
  "codemirror-bundle.js",
  "panel-profesor.js",
  "actividad-cooperacion.js",
  "mejoras-seguimiento.js"
)

foreach ($script in $scripts) {
  if (-not (Test-Path -LiteralPath $script)) {
    throw "Falta el script requerido: $script"
  }
  node --check ".\$script"
  if ($LASTEXITCODE -ne 0) {
    throw "Sintaxis invalida: $script"
  }
}

$required = @(
  "actividad.html",
  "actividad-app.js",
  "actividad-base.css",
  "actividad-cooperacion.js",
  "actividad-firebase.js",
  "mejoras-seguimiento.css",
  "mejoras-seguimiento.js",
  "reglas.txt"
)

$missing = $required | Where-Object { -not (Test-Path -LiteralPath $_) }
if ($missing) {
  throw "Archivos faltantes: $($missing -join ', ')"
}

function Get-LocalReferencePath([string]$reference) {
  if ([string]::IsNullOrWhiteSpace($reference)) { return $null }
  if ($reference -match '^(?:https?:|//|data:|mailto:|javascript:|about:|#)') {
    return $null
  }
  $withoutQuery = ($reference -split '[?#]', 2)[0]
  if ([string]::IsNullOrWhiteSpace($withoutQuery)) { return $null }
  if ($withoutQuery -notmatch '^[A-Za-z0-9._/()\-\s]+$') { return $null }
  return $withoutQuery.Replace('/', [IO.Path]::DirectorySeparatorChar)
}

$missingReferences = New-Object System.Collections.Generic.List[string]
$legacyMissingReferences = New-Object System.Collections.Generic.List[string]
$versionReferences = New-Object System.Collections.Generic.List[string]
$legacyHtmlFiles = @(
  "modulo-profeso.html",
  "actividad_analista_viabilidad_excelencia (8).html",
  "ejerciciosbucles.html"
)

foreach ($htmlFile in Get-ChildItem -File -Filter "*.html") {
  $html = Get-Content -LiteralPath $htmlFile.FullName -Raw -Encoding UTF8
  $html = [regex]::Replace($html, "(?is)<code\b[^>]*>.*?</code>|<pre\b[^>]*>.*?</pre>", "")
  foreach ($match in [regex]::Matches($html, "(?:src|href)\s*=\s*['""]([^'""]+)['""]", "IgnoreCase")) {
    $reference = $match.Groups[1].Value
    $localPath = Get-LocalReferencePath $reference

    if ($localPath -and -not (Test-Path -LiteralPath $localPath)) {
      if ($legacyHtmlFiles -contains $htmlFile.Name) {
        $legacyMissingReferences.Add("$($htmlFile.Name): $reference")
      } else {
        $missingReferences.Add("$($htmlFile.Name): $reference")
      }
    }

    if ($reference -match '\?v=(\d{8}-\d+)') {
      $versionReferences.Add($Matches[1])
    } elseif ($reference -match '\?v=') {
      throw "Version de recurso invalida en $($htmlFile.Name): $reference"
    }
  }
}

foreach ($jsFile in Get-ChildItem -File -Filter "*.js") {
  $js = Get-Content -LiteralPath $jsFile.FullName -Raw -Encoding UTF8
  foreach ($match in [regex]::Matches($js, "from\s*['""](\./[A-Za-z0-9._/?=&-]+)['""]", "IgnoreCase")) {
    $reference = $match.Groups[1].Value
    $localPath = Get-LocalReferencePath $reference

    if ($localPath -and -not (Test-Path -LiteralPath $localPath)) {
      $missingReferences.Add("$($jsFile.Name): $reference")
    }

    if ($reference -match '\?v=(\d{8}-\d+)') {
      $versionReferences.Add($Matches[1])
    }
  }
}

if ($missingReferences.Count -gt 0) {
  throw "Referencias locales inexistentes:`n$($missingReferences -join "`n")"
}
if ($legacyMissingReferences.Count -gt 0) {
  Write-Warning "Referencias inexistentes en archivos heredados:`n$($legacyMissingReferences -join "`n")"
}

$distinctVersions = @($versionReferences | Sort-Object -Unique)
if ($distinctVersions.Count -gt 1) {
  Write-Warning "Versiones de recursos no uniformes: $($distinctVersions -join ', '). Ejecuta versionar-publicacion.ps1 antes de publicar."
}

$ignoreFile = if (Test-Path -LiteralPath ".gitignore") {
  Get-Content ".gitignore" -Raw -Encoding UTF8
} else {
  ""
}

foreach ($logFile in @("firebase-debug.log", "firestore-debug.log", "ui-debug.log")) {
  if (Test-Path -LiteralPath $logFile) {
    if ($ignoreFile -notmatch "(?m)^\s*$([regex]::Escape($logFile))\s*$") {
      throw "El registro $logFile existe y no esta excluido de la publicacion."
    }
    Write-Warning "El registro $logFile existe localmente, pero esta excluido por .gitignore."
  }
}

node ".\ui-contract.test.cjs"
if ($LASTEXITCODE -ne 0) {
  throw "Fallo el contrato de interfaz."
}

Write-Host "Validacion del proyecto: OK"
