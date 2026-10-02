$ErrorActionPreference = "Stop"
$utf8 = New-Object System.Text.UTF8Encoding($false)
$latin1 = [System.Text.Encoding]::GetEncoding(28591)
$sospechoso = [regex]::new(('[{0}{1}{2}{3}{4}{5}]' -f
    [char]0x00C3, [char]0x00C2, [char]0x00E2,
    [char]0x00EF, [char]0x00F0, [char]0xFFFD))

function Repair-Line([string]$line) {
    $actual = $line
    for ($ronda = 0; $ronda -lt 4; $ronda++) {
        if (-not $sospechoso.IsMatch($actual)) { break }
        $antes = $sospechoso.Matches($actual).Count
        $candidato = [System.Text.Encoding]::UTF8.GetString($latin1.GetBytes($actual))
        $despues = $sospechoso.Matches($candidato).Count
        $reemplazosAntes = ([regex]::Matches($actual, [char]0xFFFD)).Count
        $reemplazosDespues = ([regex]::Matches($candidato, [char]0xFFFD)).Count
        if ($candidato -eq $actual -or $despues -ge $antes -or $reemplazosDespues -gt $reemplazosAntes + 2) {
            break
        }
        $actual = $candidato
    }
    return $actual
}

$extensiones = @(".html", ".js", ".css", ".txt", ".md", ".rules")
$archivos = Get-ChildItem -File | Where-Object { $extensiones -contains $_.Extension.ToLowerInvariant() }
foreach ($archivo in $archivos) {
    $texto = [System.IO.File]::ReadAllText($archivo.FullName, $utf8)
    if (-not $sospechoso.IsMatch($texto)) { continue }
    $lineas = $texto -split "`r?`n", -1
    $reparadas = foreach ($linea in $lineas) { Repair-Line $linea }
    $salida = [string]::Join("`r`n", $reparadas)
    [System.IO.File]::WriteAllText($archivo.FullName, $salida, $utf8)
    Write-Output "$($archivo.Name): reparado"
}
