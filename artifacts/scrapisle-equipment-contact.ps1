Add-Type -AssemblyName System.Drawing
$p=Get-Content -Raw -Encoding utf8 artifacts/scrapisle-plan.json|ConvertFrom-Json
$paths=@('public/region-icons/scrapisle.png',($p.batch+'/equipment/rods/scrapisle/reel-frame.png'),($p.batch+'/equipment/rods/scrapisle/reel-rotor.png'),($p.batch+'/equipment/rods/scrapisle/float.png'))
$b=[Drawing.Bitmap]::new(1000,250);$g=[Drawing.Graphics]::FromImage($b);$g.Clear([Drawing.Color]::Beige);$i=0
foreach($path in $paths){$im=[Drawing.Image]::FromFile((Resolve-Path $path));$g.DrawImage($im,$i*250,0,250,250);$im.Dispose();$i++}
$b.Save((Join-Path $PWD 'artifacts/scrapisle-equipment-contact.png'),[Drawing.Imaging.ImageFormat]::Png);$g.Dispose();$b.Dispose()
