param([string]$Suffix='thumbnail',[string]$Output='.cache/primal-contact.png')
Add-Type -AssemblyName System.Drawing
$files=@(Get-ChildItem -LiteralPath 'assets/storage-upload/new/20261017-135100' -Recurse -Filter "*_$Suffix.png"|Sort-Object FullName)
$b=New-Object Drawing.Bitmap 1200,([int][Math]::Ceiling($files.Count/4)*250)
$g=[Drawing.Graphics]::FromImage($b);$g.Clear([Drawing.Color]::Beige)
$font=New-Object Drawing.Font 'Arial',9
for($i=0;$i -lt $files.Count;$i++){
 $img=[Drawing.Image]::FromFile($files[$i].FullName);$x=($i%4)*300;$y=[int][Math]::Floor($i/4)*250
 $scale=[Math]::Min(280/$img.Width,210/$img.Height);$w=[int]($img.Width*$scale);$h=[int]($img.Height*$scale)
 $g.DrawImage($img,$x+(300-$w)/2,$y+(210-$h)/2,$w,$h);$g.DrawString($files[$i].BaseName.Replace("_$Suffix",''),$font,[Drawing.Brushes]::Black,$x+4,$y+220);$img.Dispose()
}
$b.Save((Join-Path (Get-Location) $Output));$font.Dispose();$g.Dispose();$b.Dispose()
