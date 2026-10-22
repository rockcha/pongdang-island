param([string]$Root='assets/storage-upload/new/20261023-034400',[switch]$RequireComplete)
$ErrorActionPreference='Stop'
Add-Type -AssemblyName System.Drawing
$helper=[IO.File]::ReadAllText((Join-Path (Get-Location) 'scripts/inspect-sprites.ps1'))
$code=[regex]::Match($helper,"(?s)-TypeDefinition @'\r?\n(.*?)\r?\n'@").Groups[1].Value
Add-Type -ReferencedAssemblies System.Drawing -TypeDefinition $code
$manifest=Get-Content -LiteralPath (Join-Path $Root 'manifest.json') -Raw -Encoding UTF8 | ConvertFrom-Json
$missing=@();$reports=@();$thumbs=0
foreach($entry in $manifest.items){
 $thumb=Join-Path $Root $entry.thumbnail_path
 if(!(Test-Path -LiteralPath $thumb)){$missing+=$entry.thumbnail_path;continue}
 $image=[Drawing.Bitmap]::new((Resolve-Path -LiteralPath $thumb).Path)
 # Ignore sub-visible one-byte alpha rounding; silhouette audits use alpha 32.
 if($image.GetPixel(0,0).A -gt 2){throw "Thumbnail background is not transparent: $($entry.id)"}
 $image.Dispose();$thumbs++
 if($entry.frames -eq 1){continue}
 $file=Join-Path $Root $entry.sprite_sheet_path
 if(!(Test-Path -LiteralPath $file)){$missing+=$entry.sprite_sheet_path;continue}
 $columns=if($entry.frames -eq 8){4}else{2}
 $bounds=[SpriteBounds]::Inspect((Resolve-Path -LiteralPath $file).Path,$columns)
 $cw=$bounds[0][0]/[double]$columns;$ch=$bounds[0][1]/2.0
 if([Math]::Abs($cw-$ch) -gt 1){throw "Wrong sprite grid: $($entry.id)"}
 $frames=@(0..($entry.frames-1) | ForEach-Object {
  $b=$bounds[$_+1]
  $margin=[Math]::Min([Math]::Min($b[0],$b[1]),[Math]::Min($cw-$b[0]-$b[2],$ch-$b[1]-$b[3]))
  [ordered]@{frame=$_;x=$b[0];y=$b[1];width=$b[2];height=$b[3];margin=$margin;marginRatio=$margin/[Math]::Min($cw,$ch);alphaPixels=$b[4]}
 })
 $threshold=if($entry.frames -eq 8){.08}else{.055}
 $safe=@($frames | Where-Object {$_.marginRatio -lt $threshold -or $_.alphaPixels -eq 0}).Count -eq 0
 $reports+=[ordered]@{id=$entry.id;file=$entry.sprite_sheet_path;width=$bounds[0][0];height=$bounds[0][1];columns=$columns;cell=$cw;safe=$safe;frames=$frames}
}
$report=[ordered]@{alphaThreshold=32;thumbnails=$thumbs;missing=$missing;sprites=$reports}
$report | ConvertTo-Json -Depth 10 | Set-Content -LiteralPath (Join-Path $Root 'sprite-audit.json') -Encoding UTF8
Write-Output "Thumbnails: $thumbs / $($manifest.items.Count). Sheets: $($reports.Count). Missing: $($missing.Count)."
$unsafe=@($reports | Where-Object {!$_.safe})
if($unsafe.Count -gt 0){Write-Output ($unsafe | ForEach-Object {$_.id+': '+(($_.frames | ForEach-Object {[Math]::Round($_.marginRatio,3)}) -join ', ')})}
if($RequireComplete -and ($missing.Count -gt 0 -or $unsafe.Count -gt 0)){throw 'Artwork is incomplete or has unsafe cell boundaries.'}
