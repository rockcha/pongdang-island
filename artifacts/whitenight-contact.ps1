Add-Type -AssemblyName System.Drawing
$root='assets/storage-upload/new/20261017-153200'
$files=@(Get-ChildItem -LiteralPath $root -Recurse -Filter '*_thumbnail.png'|Sort-Object FullName)
$b=New-Object Drawing.Bitmap(1000,([int][Math]::Ceiling($files.Count/4)*225))
$g=[Drawing.Graphics]::FromImage($b);$g.Clear([Drawing.ColorTranslator]::FromHtml('#e4f1f5'))
$font=New-Object Drawing.Font('Arial',9)
for($i=0;$i -lt $files.Count;$i++){
 $img=[Drawing.Bitmap]::FromFile($files[$i].FullName);$x=($i%4)*250;$y=[int][Math]::Floor($i/4)*225
 $scale=[Math]::Min(220/$img.Width,185/$img.Height);$w=[int]($img.Width*$scale);$h=[int]($img.Height*$scale)
 $g.DrawImage($img,$x+[int]((250-$w)/2),$y+[int]((190-$h)/2),$w,$h)
 $g.DrawString($files[$i].BaseName.Replace('_thumbnail',''),$font,[Drawing.Brushes]::DarkSlateGray,$x+5,$y+193)
 $img.Dispose()
}
$b.Save((Join-Path (Get-Location) 'artifacts/whitenight-thumbnails-contact.png'),[Drawing.Imaging.ImageFormat]::Png);$g.Dispose();$b.Dispose()
