param([string]$Root='assets/storage-upload/new/20261027-034411')
$ErrorActionPreference='Stop'
Add-Type -AssemblyName System.Drawing
$helper=[IO.File]::ReadAllText((Join-Path (Get-Location) 'scripts/inspect-sprites.ps1'))
$code=[regex]::Match($helper,"(?s)-TypeDefinition @'\r?\n(.*?)\r?\n'@").Groups[1].Value
Add-Type -ReferencedAssemblies System.Drawing -TypeDefinition $code
$manifest=Get-Content -LiteralPath (Join-Path $Root 'manifest.json') -Raw -Encoding UTF8 | ConvertFrom-Json
$reports=@();$configs4=@();$configs8=@()
foreach($entry in $manifest.items | Where-Object {$_.frames -gt 1}){
 $file=Join-Path $Root $entry.sprite_sheet_path
 if(!(Test-Path -LiteralPath $file)){throw "Missing animation: $($entry.id)"}
 $original=Join-Path $Root ('sources/'+$entry.id+'-sprite.source')
 if(!(Test-Path -LiteralPath $original)){
  [IO.Directory]::CreateDirectory([IO.Path]::GetDirectoryName([IO.Path]::GetFullPath($original))) | Out-Null
  Copy-Item -LiteralPath $entry.spriteSource -Destination $original
 }
 $columns=if($entry.frames -eq 8){4}else{2}
 $raw=[SpriteBounds]::Inspect((Resolve-Path -LiteralPath $original).Path,$columns)
 $cw=$raw[0][0]/[double]$columns;$ch=$raw[0][1]/2.0
 if([Math]::Abs($cw-$ch) -gt 1){throw "Invalid grid: $($entry.id)"}
 $extent=0.0;$radius=0.0
 for($f=0;$f -lt $entry.frames;$f++){
  $b=$raw[$f+1]
  $margin=[Math]::Min([Math]::Min($b[0],$b[1]),[Math]::Min($cw-$b[0]-$b[2],$ch-$b[1]-$b[3]))
  if($margin -lt 1 -or ($entry.frames -eq 8 -and $margin -lt $cw*.08)){throw "Unsafe original cell: $($entry.id), frame $f margin $margin. Regenerate source."}
  $extent=[Math]::Max($extent,[Math]::Max($b[2]/$cw,$b[3]/$ch))
  foreach($edge in @(($b[0]/$cw),(($b[0]+$b[2])/$cw),($b[1]/$ch),(($b[1]+$b[3])/$ch))){
   $radius=[Math]::Max($radius,[Math]::Abs($edge-.5))
  }
 }
 $cell=[int][Math]::Ceiling([Math]::Max($cw,$ch))
 $factor=[Math]::Min(1.0,[Math]::Min(.84/$extent,.419/$radius))
 $source=[Drawing.Bitmap]::new((Resolve-Path -LiteralPath $original).Path)
 $output=[Drawing.Bitmap]::new($cell*$columns,$cell*2,[Drawing.Imaging.PixelFormat]::Format32bppArgb)
 $g=[Drawing.Graphics]::FromImage($output);$g.Clear([Drawing.Color]::Transparent)
 $g.InterpolationMode=[Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
 for($f=0;$f -lt $entry.frames;$f++){
  $src=[Drawing.RectangleF]::new(($f%$columns)*$cw,[Math]::Floor($f/$columns)*$ch,$cw,$ch)
  $dst=[Drawing.RectangleF]::new(($f%$columns)*$cell+$cell*(1-$factor)/2,[Math]::Floor($f/$columns)*$cell+$cell*(1-$factor)/2,$cell*$factor,$cell*$factor)
  $g.DrawImage($source,$dst,$src,[Drawing.GraphicsUnit]::Pixel)
 }
 $g.Dispose();$source.Dispose();$output.Save([IO.Path]::GetFullPath($file),[Drawing.Imaging.ImageFormat]::Png);$output.Dispose()
 # One common export scale for the entire sheet; runtime anchors do the alignment.
 $displayScale=[Math]::Min(1.5,.84/($extent*$factor))
 $px=.58;$py=.43
 # Provisional locations only. Inspect and select opaque rigid anatomy patches
 # before running register-sprite-anchors.ps1; do not publish these defaults.
 if($entry.kind -eq 'decoration'){$px=.47;$py=.56}
 $patch=@([int]($cell*$px),[int]($cell*$py),[int]($cell*.09),[int]($cell*.09))
 $config=[ordered]@{file=$file;storage_path=$entry.sprite_sheet_path;patch=$patch}
 if($entry.frames -eq 8){$configs8+=$config}else{$configs4+=$config}
 $reports+=[ordered]@{id=$entry.id;storage_path=$entry.sprite_sheet_path;cell=$cell;scale=$displayScale;commonExportScale=$factor;patch=$patch;rawAudit=[ordered]@{width=$raw[0][0];height=$raw[0][1];bounds=@(1..$entry.frames | ForEach-Object {,$raw[$_]})}}
 Write-Output "Prepared $($entry.frames) poses: $($entry.id)"
}
ConvertTo-Json -InputObject $reports -Depth 12 | Set-Content -LiteralPath (Join-Path $Root 'registration.json') -Encoding UTF8
ConvertTo-Json -InputObject $configs4 -Depth 6 | Set-Content -LiteralPath (Join-Path $Root 'anchors-four.json') -Encoding UTF8
ConvertTo-Json -InputObject $configs8 -Depth 6 | Set-Content -LiteralPath (Join-Path $Root 'anchors-eight.json') -Encoding UTF8
