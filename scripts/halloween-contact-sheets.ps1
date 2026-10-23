param([string]$Root='assets/storage-upload/new/20261023-212823',[string]$OutputDirectory='artifacts/previews/halloween')
$ErrorActionPreference='Stop';Add-Type -AssemblyName System.Drawing
$m=Get-Content -LiteralPath ($Root+'/manifest.json') -Raw -Encoding UTF8 | ConvertFrom-Json
$dir=[IO.Path]::GetFullPath($OutputDirectory);[IO.Directory]::CreateDirectory($dir)|Out-Null
$font=[Drawing.Font]::new('Malgun Gothic',12)
$small=[Drawing.Font]::new('Arial',9)
$brush=[Drawing.SolidBrush]::new([Drawing.Color]::FromArgb(66,46,39))
foreach($group in ($m.items|Group-Object kind,rarity)){
 $entries=@($group.Group|Where-Object{Test-Path -LiteralPath ($Root+'/'+$_.thumbnail_path)})
 if(!$entries.Count){continue}
 $cols=4;$cw=250;$ch=280;$rows=[int][Math]::Ceiling($entries.Count/[double]$cols)
 $sheet=[Drawing.Bitmap]::new($cols*$cw,$rows*$ch)
 $g=[Drawing.Graphics]::FromImage($sheet);$g.Clear([Drawing.Color]::FromArgb(242,233,220));$g.InterpolationMode=[Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
 for($i=0;$i -lt $entries.Count;$i++){
  $e=$entries[$i];$x=($i%$cols)*$cw;$y=[Math]::Floor($i/$cols)*$ch
  $img=[Drawing.Bitmap]::new([IO.Path]::GetFullPath($Root+'/'+$e.thumbnail_path))
  $factor=[Math]::Min(220/[double]$img.Width,220/[double]$img.Height)
  $g.DrawImage($img,[Drawing.RectangleF]::new($x+($cw-$img.Width*$factor)/2,$y+10,$img.Width*$factor,$img.Height*$factor));$img.Dispose()
  $name=$e.name -replace '^.* \u2014 ',''
  $g.DrawString($name,$font,$brush,[single]($x+8),[single]($y+231))
  $g.DrawString(($e.id -replace '^halloween-',''),$small,$brush,[single]($x+8),[single]($y+255))
 }
 $g.Dispose();$filename=$group.Group[0].kind+'-'+$group.Group[0].rarity+'-thumbnails.png';$sheet.Save((Join-Path $dir $filename),[Drawing.Imaging.ImageFormat]::Png);$sheet.Dispose()
 $sprites=@($entries|Where-Object{$_.frames -gt 1 -and (Test-Path -LiteralPath ($Root+'/'+$_.sprite_sheet_path))})
 if(!$sprites.Count){continue}
 $fwidth=if($sprites[0].frames -eq 8){170}else{230};$width=$fwidth*$sprites[0].frames;$height=$sprites.Count*($fwidth+45)
 $sheet=[Drawing.Bitmap]::new($width,$height);$g=[Drawing.Graphics]::FromImage($sheet);$g.Clear([Drawing.Color]::FromArgb(242,233,220));$g.InterpolationMode=[Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
 for($i=0;$i -lt $sprites.Count;$i++){
  $e=$sprites[$i];$columns=if($e.frames -eq 8){4}else{2};$y=$i*($fwidth+45)
  $g.DrawString($e.name,$font,$brush,8,[single]($y+4))
  $img=[Drawing.Bitmap]::new([IO.Path]::GetFullPath($Root+'/'+$e.sprite_sheet_path));$sw=$img.Width/[double]$columns;$sh=$img.Height/2.0
  for($f=0;$f -lt $e.frames;$f++){
   $source=[Drawing.RectangleF]::new(($f%$columns)*$sw,[Math]::Floor($f/$columns)*$sh,$sw,$sh)
   $dest=[Drawing.RectangleF]::new($f*$fwidth,$y+35,$fwidth,$fwidth)
   $g.DrawImage($img,$dest,$source,[Drawing.GraphicsUnit]::Pixel)
  }
  $img.Dispose()
 }
 $g.Dispose();$filename=$group.Group[0].kind+'-'+$group.Group[0].rarity+'-sprites.png';$sheet.Save((Join-Path $dir $filename),[Drawing.Imaging.ImageFormat]::Png);$sheet.Dispose()
}
$cols=6;$cw=180;$ch=210;$entries=@($m.items|Where-Object{Test-Path -LiteralPath ($Root+'/'+$_.thumbnail_path)})
$rows=[int][Math]::Ceiling($entries.Count/[double]$cols)
$sheet=[Drawing.Bitmap]::new($cols*$cw,$rows*$ch);$g=[Drawing.Graphics]::FromImage($sheet)
$g.Clear([Drawing.Color]::FromArgb(242,233,220));$g.InterpolationMode=[Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
for($i=0;$i -lt $entries.Count;$i++){
 $e=$entries[$i];$x=($i%$cols)*$cw;$y=[Math]::Floor($i/$cols)*$ch
 $img=[Drawing.Bitmap]::new([IO.Path]::GetFullPath($Root+'/'+$e.thumbnail_path));$factor=[Math]::Min(156/[double]$img.Width,156/[double]$img.Height)
 $g.DrawImage($img,[Drawing.RectangleF]::new($x+($cw-$img.Width*$factor)/2,$y+4,$img.Width*$factor,$img.Height*$factor));$img.Dispose()
 $name=$e.name -replace '^.* \u2014 ',''
 $g.DrawString($name,$font,$brush,[single]($x+4),[single]($y+164))
 $g.DrawString(($e.rarity+' / '+$e.sell_price+'G'),$small,$brush,[single]($x+4),[single]($y+189))
}
$g.Dispose();$sheet.Save((Join-Path $dir 'overview.png'),[Drawing.Imaging.ImageFormat]::Png);$sheet.Dispose()
$font.Dispose();$small.Dispose();$brush.Dispose();Write-Output $dir
