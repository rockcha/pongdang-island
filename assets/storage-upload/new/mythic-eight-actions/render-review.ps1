# Read-only preview of the same frame slicing, scale and origins used by the app.
Add-Type -AssemblyName System.Drawing
$layouts=Get-Content src/features/aquarium/mythic-action-layouts.json -Raw -Encoding utf8|ConvertFrom-Json
$canvas=New-Object System.Drawing.Bitmap(1200,($layouts.Count*170))
$g=[System.Drawing.Graphics]::FromImage($canvas)
$g.Clear([System.Drawing.Color]::FromArgb(40,60,75))
$font=New-Object System.Drawing.Font('Arial',8)
for($row=0;$row -lt $layouts.Count;$row++){
 $s=$layouts[$row];$img=[System.Drawing.Image]::FromFile((Resolve-Path ('public/aquarium/swim/'+$s.id+'_swim8_sprite.png')))
 for($frame=0;$frame -lt 8;$frame++){
  $cell=$img.Width/4;$size=125*$s.scale;$ox=.5+$s.shifts[$frame][0]/$cell;$oy=.5+$s.shifts[$frame][1]/$cell
  $dest=[System.Drawing.RectangleF]::new(($frame*150+75-$ox*$size),($row*170+90-$oy*$size),$size,$size)
  $source=[System.Drawing.RectangleF]::new((($frame%4)*$cell),([Math]::Floor($frame/4)*$cell),$cell,$cell)
  $g.DrawImage($img,$dest,$source,[System.Drawing.GraphicsUnit]::Pixel)
 }
 $g.DrawString($s.id,$font,[System.Drawing.Brushes]::White,4,($row*170))
 $img.Dispose()
}
$canvas.Save((Join-Path (Resolve-Path assets/storage-upload/new/mythic-eight-actions) 'review.png'))
$g.Dispose();$canvas.Dispose();$font.Dispose()
