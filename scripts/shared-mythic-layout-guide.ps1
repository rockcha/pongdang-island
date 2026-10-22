$ErrorActionPreference='Stop'
Add-Type -AssemblyName System.Drawing
$root='assets/storage-upload/new/20261022-090000'
$manifest=Get-Content ($root+'/manifest.json') -Raw -Encoding UTF8 | ConvertFrom-Json
foreach($entry in $manifest.entries){
 $thumb=[Drawing.Bitmap]::new((Join-Path (Get-Location) ('assets/storage-upload/new/20261022-041530/fish/mythic/'+$entry.id+'_thumbnail.png')))
 $guide=[Drawing.Bitmap]::new(2048,1024,[Drawing.Imaging.PixelFormat]::Format32bppArgb)
 $g=[Drawing.Graphics]::FromImage($guide);$g.Clear([Drawing.Color]::Transparent)
 for($f=0;$f -lt 8;$f++){
  $dst=[Drawing.Rectangle]::new(($f%4)*512+112,[Math]::Floor($f/4)*512+112,288,288)
  $g.DrawImage($thumb,$dst)
 }
 $g.Dispose();$thumb.Dispose()
 $guide.Save((Join-Path (Get-Location) ($root+'/generated/'+$entry.id+'.guide')),[Drawing.Imaging.ImageFormat]::Png);$guide.Dispose()
}
