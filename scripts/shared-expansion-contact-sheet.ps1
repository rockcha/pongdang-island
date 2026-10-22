Add-Type -AssemblyName System.Drawing
$root='assets/storage-upload/new/20261022-041530'
$m=Get-Content -LiteralPath "$root/manifest.json" -Raw -Encoding UTF8 | ConvertFrom-Json
$sheet=[Drawing.Bitmap]::new(1080,1050)
$g=[Drawing.Graphics]::FromImage($sheet)
$font=[Drawing.Font]::new('Malgun Gothic',10)
try{
 $g.Clear([Drawing.Color]::FromArgb(255,248,238))
 $g.InterpolationMode=[Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
 for($i=0;$i -lt $m.entries.Count;$i++){
  $e=$m.entries[$i];$b=[Drawing.Bitmap]::new((Join-Path (Get-Location) "$root/$($e.thumbnail_path)"))
  try{$x=($i%6)*180;$y=[Math]::Floor($i/6)*210;$g.DrawImage($b,[Drawing.Rectangle]::new($x+10,$y+5,160,160));$g.DrawString($e.name,$font,[Drawing.Brushes]::SaddleBrown,[Drawing.RectangleF]::new($x+6,$y+169,170,38))}finally{$b.Dispose()}
 }
 New-Item -ItemType Directory -Force artifacts/previews | Out-Null
 $sheet.Save((Join-Path (Get-Location) 'artifacts/previews/shared-expansion-contact.png'),[Drawing.Imaging.ImageFormat]::Png)
}finally{$g.Dispose();$font.Dispose();$sheet.Dispose()}
