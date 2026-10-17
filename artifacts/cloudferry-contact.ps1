param([string]$Output='artifacts/cloudferry-thumbnails-contact.png')
Add-Type -AssemblyName System.Drawing
$p=Get-Content -Raw -Encoding utf8 artifacts/cloudferry-expansion-plan.json|ConvertFrom-Json
$canvas=[Drawing.Bitmap]::new(1100,1250);$g=[Drawing.Graphics]::FromImage($canvas)
$g.Clear([Drawing.Color]::FromArgb(255,245,241,228));$g.InterpolationMode=[Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
$font=[Drawing.Font]::new('Malgun Gothic',11);$brush=[Drawing.Brushes]::DarkSlateGray
$i=0
foreach($s in $p.species){
 $x=($i%5)*220;$y=[int][Math]::Floor($i/5)*250;$file=Join-Path $p.batch $s.thumbnail
 if(Test-Path -LiteralPath $file){$im=[Drawing.Image]::FromFile((Resolve-Path -LiteralPath $file));$scale=[Math]::Min(205/$im.Width,205/$im.Height);$w=[int]($im.Width*$scale);$h=[int]($im.Height*$scale);$g.DrawImage($im,$x+[int]((220-$w)/2),$y+[int]((210-$h)/2),$w,$h);$im.Dispose()}
 $g.DrawString(($i+1).ToString()+'. '+$s.name,$font,$brush,[single]($x+6),[single]($y+211));$g.DrawString($s.rarity+' / '+$s.movement,$font,$brush,[single]($x+6),[single]($y+232));$i++
}
$canvas.Save((Join-Path $PWD $Output),[Drawing.Imaging.ImageFormat]::Png);$font.Dispose();$g.Dispose();$canvas.Dispose()
Write-Output $Output
