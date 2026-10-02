$ErrorActionPreference = "Stop"
$utf8 = New-Object System.Text.UTF8Encoding($false)
$pares = @(
  @('\u00C3\u00A1','\u00E1'), @('\u00C3\u00A9','\u00E9'), @('\u00C3\u00AD','\u00ED'),
  @('\u00C3\u00B3','\u00F3'), @('\u00C3\u00BA','\u00FA'), @('\u00C3\u00B1','\u00F1'),
  @('\u00C3\u00BC','\u00FC'), @('\u00C3\u0081','\u00C1'), @('\u00C3\u2030','\u00C9'),
  @('\u00C3\u008D','\u00CD'), @('\u00C3\u201C','\u00D3'), @('\u00C3\u0160','\u00DA'),
  @('\u00C3\u2018','\u00D1'), @('\u00C3\u0153','\u00DC'), @('\u00C3\u009F','\u00DF'),
  @('\u00C2\u00BF','\u00BF'), @('\u00C2\u00A1','\u00A1'), @('\u00C2\u00B0','\u00B0'),
  @('\u00C2\u00B7','\u00B7'), @('\u00C2\u00AB','\u00AB'), @('\u00C2\u00BB','\u00BB'),
  @('\u00C2\u00B2','\u00B2'), @('\u00C3\u2014','\u00D7'), @('\u00C3\u00B7','\u00F7'),
  @('\u00E2\u2013','\u2013'), @('\u00E2\u20AC\u201D','\u2014'), @('\u00E2\u20AC\u0153','\u201C'),
  @('\u00E2\u20AC\u009D','\u201D'), @('\u00E2\u20AC\u02DC','\u2018'), @('\u00E2\u20AC\u2122','\u2019'),
  @('\u00E2\u20AC\u00A6','\u2026'), @('\u00E2\u20AC\u00A2','\u2022'), @('\u00E2\u2020\u2019','\u2192'),
  @('\u00E2\u2030\u00A5','\u2265'), @('\u00E2\u2030\u00A4','\u2264'), @('\u00E2\u009A\u00A0','\u26A0'),
  @('\u00E2\u009C\u0085','\u2705'), @('\u00E2\u009D\u008C','\u274C'), @('\u00E2\u0098\u0091','\u2611'),
  @('\u00E2\u0098\u0090','\u2610'), @('\u00E2\u008F\u00B0','\u23F0'), @('\u00E2\u008F\u00B8','\u23F8'),
  @('\u00E2\u2013','\u2013'), @('\u00E2\u0096\u00B6','\u25B6'), @('\u00E2\u201E\u00B9','\u2139'),
  @('\u00E2\u2022\u0090','\u2022'), @('\u00E2\u2022\u0094','\u2022'),
  @('\u00F0\u0178\u201D\u0090','\uD83D\uDD10'), @('\u00F0\u0178\u2018\u00A1','\uD83D\uDCA1'),
  @('\u00F0\u0178\u201C\u008C','\uD83D\uDCCC'), @('\u00F0\u0178\u201D\u008D','\uD83D\uDD0D'),
  @('\u00F0\u0178\u201D\u009F','\uD83D\uDD1F'), @('\u00F0\u0178\u00A7\u00A9','\uD83E\uDDE9'),
  @('\u00F0\u0178\u00A7\u00AA','\uD83E\uDDEA'), @('\u00F0\u0178\u008F\u0086','\uD83C\uDFC6'),
  @('\u00F0\u0178\u0096\u0090\u00EF\u00B8\u008F','\uD83D\uDD90\uFE0F'), @('\u00F0\u0178\u009A\u0080','\uD83D\uDE80'),
  @('\u00F0\u0178\u017D\u00AF','\uD83C\uDFAF'), @('\u00F0\u0178\u009A\u00AB','\uD83D\uDEAB')
)
$archivos = Get-ChildItem -File | Where-Object { $_.Extension.ToLowerInvariant() -in @('.html','.js','.css','.txt','.md','.rules') }
foreach ($archivo in $archivos) {
  $texto = [IO.File]::ReadAllText($archivo.FullName, $utf8)
  $original = $texto
  foreach ($par in $pares) {
    $texto = $texto.Replace([regex]::Unescape($par[0]), [regex]::Unescape($par[1]))
  }
  if ($texto -ne $original) {
    [IO.File]::WriteAllText($archivo.FullName, $texto, $utf8)
    Write-Output "$($archivo.Name): actualizado"
  }
}
