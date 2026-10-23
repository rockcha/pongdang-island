param([Parameter(Mandatory=$true)][string]$Id,[ValidateRange(.2,.7)][double]$Fill=.58,[string]$Root='assets/storage-upload/new/20261023-212823',[string]$OutputDirectory='artifacts/halloween-guides')
$ErrorActionPreference='Stop'
Add-Type -AssemblyName System.Drawing
$m=Get-Content -LiteralPath ($root+'/manifest.json') -Raw -Encoding UTF8 | ConvertFrom-Json
$e=$m.items | Where-Object {$_.id -eq $Id}
if(!$e -or $e.frames -le 1){throw 'Unknown animated subject'}
$columns=if($e.frames -eq 8){4}else{2}
$cell=512
$src=[Drawing.Bitmap]::new([IO.Path]::GetFullPath($root+'/'+$e.thumbnail_path))
$out=[Drawing.Bitmap]::new($cell*$columns,$cell*2,[Drawing.Imaging.PixelFormat]::Format32bppArgb)
$g=[Drawing.Graphics]::FromImage($out);$g.Clear([Drawing.Color]::Transparent)
$g.InterpolationMode=[Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
$factor=$Fill*[Math]::Min($cell/$src.Width,$cell/$src.Height)
$w=$src.Width*$factor;$h=$src.Height*$factor
for($i=0;$i -lt $e.frames;$i++){
 $dst=[Drawing.RectangleF]::new(($i%$columns)*$cell+($cell-$w)/2,[Math]::Floor($i/$columns)*$cell+($cell-$h)/2,$w,$h)
 $g.DrawImage($src,$dst)
}
$g.Dispose();$src.Dispose()
$dir=[IO.Path]::GetFullPath($OutputDirectory);[IO.Directory]::CreateDirectory($dir)|Out-Null
$target=Join-Path $dir ($Id+'.png')
$out.Save($target,[Drawing.Imaging.ImageFormat]::Png);$out.Dispose()
Write-Output $target
