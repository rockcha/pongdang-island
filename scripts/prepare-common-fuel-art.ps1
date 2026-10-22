param([Parameter(Mandatory=$true)][string]$Root)
Add-Type -AssemblyName System.Drawing
$helper=[IO.File]::ReadAllText((Join-Path (Get-Location) 'assets/siren/register-sprites.ps1'))
$code=[regex]::Match($helper,"(?s)-TypeDefinition @'\r?\n(.*?)\r?\n'@").Groups[1].Value
$code=$code.Replace('range=Math.Max(30,w/6)','range=Math.Max(30,w/3)')
Add-Type -ReferencedAssemblies System.Drawing -TypeDefinition $code
$manifest=Get-Content -LiteralPath (Join-Path $Root 'manifest.json') -Raw -Encoding UTF8 | ConvertFrom-Json
$reports=@();$layouts=@{}
foreach($entry in $manifest.entries){
 $source=[Drawing.Bitmap]::new((Join-Path (Get-Location) (Join-Path $Root $entry.thumbnail_source)))
 $destPath=Join-Path (Get-Location) (Join-Path $Root $entry.thumbnail_path)
 [IO.Directory]::CreateDirectory([IO.Path]::GetDirectoryName($destPath)) | Out-Null
 $thumb=[Drawing.Bitmap]::new(512,512,[Drawing.Imaging.PixelFormat]::Format32bppArgb)
 $g=[Drawing.Graphics]::FromImage($thumb)
 try{
  $g.Clear([Drawing.Color]::Transparent);$g.InterpolationMode=[Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
  $factor=512.0/[Math]::Max($source.Width,$source.Height)
  $w=$source.Width*$factor;$h=$source.Height*$factor
  $g.DrawImage($source,[Drawing.RectangleF]::new((512-$w)/2,(512-$h)/2,$w,$h))
  $thumb.Save($destPath,[Drawing.Imaging.ImageFormat]::Png)
 }finally{$g.Dispose();$thumb.Dispose();$source.Dispose()}
 if($entry.frames -ne 4){continue}
 $raw=Join-Path (Get-Location) (Join-Path $Root $entry.sprite_source)
 $rawAudit=[SirenRegistration]::Inspect($raw,2,.82,.5)
 if($rawAudit.width -ne $rawAudit.height -or $rawAudit.width%2){throw "Non-square/even sprite: $($entry.id)"}
 foreach($bounds in $rawAudit.bounds){
  if([Math]::Min([Math]::Min($bounds[0],$bounds[1]),[Math]::Min($rawAudit.cell-$bounds[0]-$bounds[2],$rawAudit.cell-$bounds[1]-$bounds[3])) -lt 4){throw "Clipped source: $($entry.id)"}
 }
 # Align rigid heads in the image itself, so already deployed clients also
 # play these new sheets without requiring a runtime correction deployment.
 # Derive ONE shared canvas/scale from the union; never fit poses separately.
 $left=1e9;$top=1e9;$right=-1e9;$bottom=-1e9
 for($f=0;$f -lt 4;$f++){
  $b=$rawAudit.bounds[$f];$dx=$rawAudit.shifts[$f][0];$dy=$rawAudit.shifts[$f][1]
  $left=[Math]::Min($left,$b[0]-$dx);$top=[Math]::Min($top,$b[1]-$dy)
  $right=[Math]::Max($right,$b[0]+$b[2]-$dx);$bottom=[Math]::Max($bottom,$b[1]+$b[3]-$dy)
 }
 $factor=512*.84/[Math]::Max($right-$left,$bottom-$top)
 $offsetX=256-($left+$right)*$factor/2;$offsetY=256-($top+$bottom)*$factor/2
 $sheet=[Drawing.Bitmap]::new(1024,1024,[Drawing.Imaging.PixelFormat]::Format32bppArgb)
 $g=[Drawing.Graphics]::FromImage($sheet);$source=[Drawing.Bitmap]::new($raw)
 try{
  $g.Clear([Drawing.Color]::Transparent);$g.InterpolationMode=[Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
  for($f=0;$f -lt 4;$f++){
   $x=($f%2)*512;$y=[Math]::Floor($f/2)*512;$w=$rawAudit.cell
   $src=[Drawing.RectangleF]::new(($f%2)*$w,[Math]::Floor($f/2)*$w,$w,$w)
   $dx=$rawAudit.shifts[$f][0];$dy=$rawAudit.shifts[$f][1]
   $dst=[Drawing.RectangleF]::new($x+$offsetX-$dx*$factor,$y+$offsetY-$dy*$factor,$w*$factor,$w*$factor)
   $g.SetClip([Drawing.Rectangle]::new($x,$y,512,512))
   $g.DrawImage($source,$dst,$src,[Drawing.GraphicsUnit]::Pixel)
   $g.ResetClip()
  }
  $sheet.Save((Join-Path (Get-Location) (Join-Path $Root $entry.storage_path)),[Drawing.Imaging.ImageFormat]::Png)
 }finally{$source.Dispose();$g.Dispose();$sheet.Dispose()}
 $audit=[SirenRegistration]::Inspect((Join-Path (Get-Location) (Join-Path $Root $entry.storage_path)),2,.82,.5)
 $reports+=@{id=$entry.id;rawAudit=$rawAudit;audit=$audit}
 $layouts[$entry.storage_path]=@{cell=$audit.cell;scale=1;shifts=$audit.shifts}
}
$reports | ConvertTo-Json -Depth 15 | Set-Content -LiteralPath (Join-Path $Root 'registration.json') -Encoding UTF8
$layouts | ConvertTo-Json -Depth 12 | Set-Content -LiteralPath 'src/features/aquarium/common-fuel-frame-layouts.json' -Encoding UTF8
Write-Output "Prepared 10 thumbnails and $($reports.Count) four-pose sheets"
