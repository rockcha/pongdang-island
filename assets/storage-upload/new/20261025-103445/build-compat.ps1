param([string]$Root='assets/storage-upload/new/20261025-103445')
$ErrorActionPreference='Stop';Add-Type -AssemblyName System.Drawing
$m=Get-Content -LiteralPath ($Root+'/manifest.json') -Raw -Encoding UTF8|ConvertFrom-Json
$registrations=Get-Content -LiteralPath ($Root+'/registration.json') -Raw -Encoding UTF8|ConvertFrom-Json
$anchors=Get-Content -LiteralPath ($Root+'/anchor-results-eight.json') -Raw -Encoding UTF8|ConvertFrom-Json
$indices=@(0,2,5,7)
foreach($s in $m.items){
 $r=$registrations|Where-Object{$_.id -eq $s.id};$a=$anchors|Where-Object{$_.storage_path -eq $s.sprite_sheet_path}
 if(!$r -or !$a -or $a.frames.Count -ne 8){throw ('Missing registration: '+$s.id)}
 $cell=[int]$r.cell;$source=[Drawing.Bitmap]::new([IO.Path]::GetFullPath($Root+'/'+$s.sprite_sheet_path))
 $output=[Drawing.Bitmap]::new($cell*2,$cell*2,[Drawing.Imaging.PixelFormat]::Format32bppArgb)
 $g=[Drawing.Graphics]::FromImage($output);$g.Clear([Drawing.Color]::Transparent)
 $g.InterpolationMode=[Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
 for($j=0;$j -lt 4;$j++){
  $f=$indices[$j];$reg=$a.frames[$f]
  $g.SetClip([Drawing.Rectangle]::new(($j%2)*$cell,[Math]::Floor($j/2)*$cell,$cell,$cell))
  $src=[Drawing.RectangleF]::new(($f%4)*$cell,[Math]::Floor($f/4)*$cell,$cell,$cell)
  $dst=[Drawing.RectangleF]::new(($j%2)*$cell-$reg.dx,[Math]::Floor($j/2)*$cell-$reg.dy,$cell,$cell)
  $g.DrawImage($source,$dst,$src,[Drawing.GraphicsUnit]::Pixel);$g.ResetClip()
 }
 $g.Dispose();$source.Dispose();$output.Save([IO.Path]::GetFullPath($Root+'/'+$s.catalog_sprite_sheet_path),[Drawing.Imaging.ImageFormat]::Png);$output.Dispose()
}
Write-Output 'Prepared aligned four-frame compatibility sheets from poses 0,2,5,7.'
