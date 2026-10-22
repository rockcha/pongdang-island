param([string]$Root='assets/storage-upload/new/20261022-083559',[switch]$RequireSafeSource)
$ErrorActionPreference='Stop'
Add-Type -AssemblyName System.Drawing
$helper=[IO.File]::ReadAllText((Join-Path (Get-Location) 'assets/siren/register-sprites.ps1'))
$code=[regex]::Match($helper,"(?s)-TypeDefinition @'\r?\n(.*?)\r?\n'@").Groups[1].Value
Add-Type -ReferencedAssemblies System.Drawing -TypeDefinition $code
$manifest=Get-Content -LiteralPath (Join-Path $Root 'manifest.json') -Raw -Encoding UTF8 | ConvertFrom-Json
$layouts=@();$reports=@()
foreach($entry in $manifest.entries){
 $source=[Drawing.Bitmap]::new((Join-Path (Get-Location) (Join-Path $Root $entry.source)))
 $w=[int][Math]::Floor($source.Width/4);$h=[int][Math]::Floor($source.Height/2)
 if([Math]::Abs($w-$h) -gt 2){throw "Invalid grid $($entry.id)"}
 # A common centered canvas and common scale preserve proportions across poses.
 $cell=[Math]::Max($w,$h)
 $output=[Drawing.Bitmap]::new($cell*4,$cell*2,[Drawing.Imaging.PixelFormat]::Format32bppArgb)
 $g=[Drawing.Graphics]::FromImage($output)
 $g.Clear([Drawing.Color]::Transparent)
 for($f=0;$f -lt 8;$f++){
  $dst=[Drawing.Rectangle]::new(($f%4)*$cell,[Math]::Floor($f/4)*$cell,$w,$h)
  $src=[Drawing.Rectangle]::new(($f%4)*$w,[Math]::Floor($f/4)*$h,$w,$h)
  $g.DrawImage($source,$dst,$src,[Drawing.GraphicsUnit]::Pixel)
 }
 $g.Dispose();$source.Dispose()
 $path=Join-Path (Get-Location) (Join-Path $Root $entry.storage_path)
 $output.Save($path,[Drawing.Imaging.ImageFormat]::Png);$output.Dispose()
 $before=[SirenRegistration]::Inspect($path,4,$entry.anchor[0],$entry.anchor[1])
 if($RequireSafeSource){
  foreach($b in $before.bounds){
   $margin=[Math]::Min([Math]::Min($b[0],$b[1]),[Math]::Min($cell-$b[0]-$b[2],$cell-$b[1]-$b[3]))
   if($margin -lt $cell*.08){throw "Source art touches unsafe cell area: $($entry.id), margin $margin. Regenerate; padding cannot restore a clipped nose or tail."}
  }
 }
 $factor=[Math]::Min([double]1,[double](.84/$before.extent))
 if($factor -lt .999){
  $bitmap=[Drawing.Bitmap]::new($path)
  $padded=[Drawing.Bitmap]::new($cell*4,$cell*2,[Drawing.Imaging.PixelFormat]::Format32bppArgb)
  $g=[Drawing.Graphics]::FromImage($padded);$g.Clear([Drawing.Color]::Transparent)
  $g.InterpolationMode=[Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
  for($f=0;$f -lt 8;$f++){
   $x=($f%4)*$cell;$y=[Math]::Floor($f/4)*$cell
   $dst=[Drawing.RectangleF]::new($x+$cell*(1-$factor)/2,$y+$cell*(1-$factor)/2,$cell*$factor,$cell*$factor)
   $src=[Drawing.RectangleF]::new($x,$y,$cell,$cell)
   $g.DrawImage($bitmap,$dst,$src,[Drawing.GraphicsUnit]::Pixel)
  }
  $g.Dispose();$bitmap.Dispose();$padded.Save($path,[Drawing.Imaging.ImageFormat]::Png);$padded.Dispose()
 }
 $audit=[SirenRegistration]::Inspect($path,4,$entry.anchor[0],$entry.anchor[1])
 if($audit.samples -lt 5){throw "Insufficient body anchor pixels $($entry.id)"}
 $displayScale=1
 if($RequireSafeSource){$displayScale=[Math]::Min([double]1.6,[double](.84/$audit.extent))}
 $layouts+=@{id=$entry.id;aliases=@($entry.id);cell=$cell;scale=$displayScale;shifts=$audit.shifts}
 $reports+=@{id=$entry.id;storage_path=$entry.storage_path;rawAudit=$before;audit=$audit;commonScale=$factor}
 Copy-Item -LiteralPath $path -Destination (Join-Path 'public/aquarium/swim' ([IO.Path]::GetFileName($entry.storage_path)))
 Write-Output "Registered eight poses: $($entry.id)"
}
$layouts | ConvertTo-Json -Depth 12 | Set-Content -LiteralPath 'src/features/aquarium/shared-mythic-action-layouts.json' -Encoding UTF8
$reports | ConvertTo-Json -Depth 14 | Set-Content -LiteralPath (Join-Path $Root 'registration.json') -Encoding UTF8
