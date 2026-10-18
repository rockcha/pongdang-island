Add-Type -AssemblyName System.Drawing
$p=Get-Content -Raw -Encoding utf8 artifacts/scrapisle-plan.json|ConvertFrom-Json
$ids=@('scrap-tin-home-hermit-crab','scrap-bulb-home-octopus','scrap-scrap-armored-sturgeon')
$b=[Drawing.Bitmap]::new(1881,627);$g=[Drawing.Graphics]::FromImage($b);$g.Clear([Drawing.Color]::Beige)
$i=0
foreach($id in $ids){$s=$p.species|Where-Object {$_.id -eq $id};$im=[Drawing.Image]::FromFile((Resolve-Path ($p.batch+'/'+$s.sprite)));$g.DrawImage($im,[Drawing.Rectangle]::new($i*627,0,627,627),[Drawing.Rectangle]::new(0,0,627,627),[Drawing.GraphicsUnit]::Pixel);$im.Dispose();$i++}
$b.Save((Join-Path $PWD 'artifacts/scrapisle-anchor-reference.png'),[Drawing.Imaging.ImageFormat]::Png);$g.Dispose();$b.Dispose()
