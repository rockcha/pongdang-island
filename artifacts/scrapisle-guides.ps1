Add-Type -AssemblyName System.Drawing
$p=Get-Content -Raw -Encoding utf8 artifacts/scrapisle-plan.json|ConvertFrom-Json
foreach($s in $p.species|Where-Object {$_.sprite}){
 $cols=if($s.frames -eq 8){4}else{2};$cell=512
 $b=[Drawing.Bitmap]::new($cols*$cell,1024);$g=[Drawing.Graphics]::FromImage($b);$g.Clear([Drawing.Color]::Transparent);$g.InterpolationMode=[Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
 $im=[Drawing.Image]::FromFile((Resolve-Path ($p.batch+'/'+$s.thumbnail)));$scale=340.0/[Math]::Max($im.Width,$im.Height);$w=[int]($im.Width*$scale);$h=[int]($im.Height*$scale)
 for($i=0;$i -lt $s.frames;$i++){$x=($i%$cols)*$cell+($cell-$w)/2;$y=[Math]::Floor($i/$cols)*$cell+($cell-$h)/2;$g.DrawImage($im,[int]$x,[int]$y,$w,$h)}
 $b.Save((Join-Path $PWD ('artifacts/guide-'+$s.id+'.png')),[Drawing.Imaging.ImageFormat]::Png);$im.Dispose();$g.Dispose();$b.Dispose()
}
