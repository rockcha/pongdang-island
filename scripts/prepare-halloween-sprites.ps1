param([string]$Root='assets/storage-upload/new/20261023-212823')
$ErrorActionPreference='Stop';Add-Type -AssemblyName System.Drawing
$helper=[IO.File]::ReadAllText((Join-Path (Get-Location) 'scripts/inspect-sprites.ps1'))
$code=[regex]::Match($helper,"(?s)-TypeDefinition @'\r?\n(.*?)\r?\n'@").Groups[1].Value
Add-Type -ReferencedAssemblies System.Drawing -TypeDefinition $code
$m=Get-Content -LiteralPath ($Root+'/manifest.json') -Raw -Encoding UTF8|ConvertFrom-Json
$registration=@()
foreach($e in $m.items|Where-Object{$_.frames -gt 1 -and $_.spriteSource}){
 $source=[IO.Path]::GetFullPath($e.spriteSource)
 $columns=if($e.frames -eq 8){4}else{2}
 $raw=[SpriteBounds]::Inspect($source,$columns)
 $cw=$raw[0][0]/[double]$columns;$ch=$raw[0][1]/2.0
 if([Math]::Abs($cw-$ch) -gt 1){throw ('Wrong raw grid: '+$e.id)}
 $extent=0.0;$radius=0.0
 for($f=0;$f -lt $e.frames;$f++){
  $b=$raw[$f+1];$margin=[Math]::Min([Math]::Min($b[0],$b[1]),[Math]::Min($cw-$b[0]-$b[2],$ch-$b[1]-$b[3]))
  $minimum=if($e.frames -eq 8){$cw*.08}else{2}
  if($margin -lt $minimum){throw ('Unsafe raw cell: '+$e.id+' frame '+$f+' margin '+$margin)}
  $extent=[Math]::Max($extent,[Math]::Max($b[2]/$cw,$b[3]/$ch))
  foreach($edge in @(($b[0]/$cw),(($b[0]+$b[2])/$cw),($b[1]/$ch),(($b[1]+$b[3])/$ch))){$radius=[Math]::Max($radius,[Math]::Abs($edge-.5))}
 }
 $factor=[Math]::Min(1.0,[Math]::Min(.84/$extent,.419/$radius));$cell=[int][Math]::Ceiling([Math]::Max($cw,$ch))
 $bmp=[Drawing.Bitmap]::new($source)
 $out=[Drawing.Bitmap]::new($cell*$columns,$cell*2,[Drawing.Imaging.PixelFormat]::Format32bppArgb)
 $g=[Drawing.Graphics]::FromImage($out);$g.Clear([Drawing.Color]::Transparent);$g.InterpolationMode=[Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
 for($f=0;$f -lt $e.frames;$f++){
  $src=[Drawing.RectangleF]::new(($f%$columns)*$cw,[Math]::Floor($f/$columns)*$ch,$cw,$ch)
  $dst=[Drawing.RectangleF]::new(($f%$columns)*$cell+$cell*(1-$factor)/2,[Math]::Floor($f/$columns)*$cell+$cell*(1-$factor)/2,$cell*$factor,$cell*$factor)
  $g.DrawImage($bmp,$dst,$src,[Drawing.GraphicsUnit]::Pixel)
 }
 $g.Dispose();$bmp.Dispose();$out.Save([IO.Path]::GetFullPath($Root+'/'+$e.sprite_sheet_path),[Drawing.Imaging.ImageFormat]::Png);$out.Dispose()
 $scale=[Math]::Min(1.5,.84/($extent*$factor))
 $registration+=[ordered]@{id=$e.id;storage_path=$e.sprite_sheet_path;cell=$cell;scale=$scale;commonExportScale=$factor;rawAudit=[ordered]@{width=$raw[0][0];height=$raw[0][1];bounds=@(1..$e.frames|ForEach-Object{,$raw[$_]})}}
}
$registration|ConvertTo-Json -Depth 9|Set-Content -LiteralPath ($Root+'/registration.json') -Encoding UTF8
Write-Output ('Prepared '+$registration.Count+' sheets with one scale per sheet; originals preserved.')
