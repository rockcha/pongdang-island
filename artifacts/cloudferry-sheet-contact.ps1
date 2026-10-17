param([int]$Page=0)
Add-Type -AssemblyName System.Drawing
$p=Get-Content -Raw -Encoding utf8 artifacts/cloudferry-expansion-plan.json|ConvertFrom-Json
$sheets=@($p.species|Where-Object {$_.sprite})
$canvas=[Drawing.Bitmap]::new(880,1150);$g=[Drawing.Graphics]::FromImage($canvas);$g.Clear([Drawing.Color]::FromArgb(255,241,238,221));$g.InterpolationMode=[Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
$font=[Drawing.Font]::new('Malgun Gothic',12)
for($row=0;$row -lt 5;$row++){
 $index=$Page*5+$row;if($index -ge $sheets.Count){break};$s=$sheets[$index];$file=Join-Path $p.batch $s.sprite
 $g.DrawString($s.name,$font,[Drawing.Brushes]::DarkSlateGray,8,[single]($row*230+4))
 if(!(Test-Path -LiteralPath $file)){continue};$im=[Drawing.Image]::FromFile((Resolve-Path -LiteralPath $file));$cols=if($s.frames -eq 8){4}else{2};$cw=$im.Width/$cols;$ch=$im.Height/2
 for($f=0;$f -lt 4;$f++){$x=$f*220;$y=$row*230+28;$g.DrawImage($im,[Drawing.RectangleF]::new($x+10,$y,200,200),[Drawing.RectangleF]::new(($f%$cols)*$cw,[Math]::Floor($f/$cols)*$ch,$cw,$ch),[Drawing.GraphicsUnit]::Pixel)}
 $im.Dispose()
}
$output="artifacts/cloudferry-sheets-$Page.png";$canvas.Save((Join-Path $PWD $output),[Drawing.Imaging.ImageFormat]::Png);$font.Dispose();$g.Dispose();$canvas.Dispose();Write-Output $output
