param([Parameter(Mandatory=$true)][string]$Thumbnail,[Parameter(Mandatory=$true)][string]$Output,[ValidateSet(4,8)][int]$Frames=4,[double]$Occupancy=.56)
$ErrorActionPreference='Stop'
Add-Type -AssemblyName System.Drawing
$columns=if($Frames -eq 8){4}else{2}
$source=[Drawing.Bitmap]::new((Resolve-Path -LiteralPath $Thumbnail).Path)
$guide=[Drawing.Bitmap]::new($columns*512,1024,[Drawing.Imaging.PixelFormat]::Format32bppArgb)
$graphics=[Drawing.Graphics]::FromImage($guide)
$graphics.Clear([Drawing.Color]::Transparent)
for($frame=0;$frame -lt $Frames;$frame++){
 $margin=[int](512*(1-$Occupancy)/2);$side=[int](512*$Occupancy)
 $rect=[Drawing.Rectangle]::new(($frame%$columns)*512+$margin,[Math]::Floor($frame/$columns)*512+$margin,$side,$side)
 $graphics.DrawImage($source,$rect)
}
$graphics.Dispose();$source.Dispose()
$target=[IO.Path]::GetFullPath((Join-Path (Get-Location) $Output))
[IO.Directory]::CreateDirectory([IO.Path]::GetDirectoryName($target)) | Out-Null
$guide.Save($target,[Drawing.Imaging.ImageFormat]::Png);$guide.Dispose()
Write-Output $target
