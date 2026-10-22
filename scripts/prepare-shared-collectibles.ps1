param([string]$Root='assets/storage-upload/new/20261022-041530',[switch]$SkipMissing)
Add-Type -AssemblyName System.Drawing
# Reuse the existing read-only patch registration implementation. It measures a
# stationary body/head patch; it never rescales frames independently.
$helper=[IO.File]::ReadAllText((Join-Path (Get-Location) 'assets/siren/register-sprites.ps1'))
$code=[regex]::Match($helper,"(?s)-TypeDefinition @'\r?\n(.*?)\r?\n'@").Groups[1].Value
if(!$code){throw 'Registration helper not found'}
Add-Type -ReferencedAssemblies System.Drawing -TypeDefinition $code
$manifest=Get-Content -LiteralPath (Join-Path $Root 'manifest.json') -Raw -Encoding UTF8 | ConvertFrom-Json
$results=@();$layouts=@{}
foreach($entry in $manifest.entries){
 $path=Join-Path (Get-Location) (Join-Path $Root $entry.storage_path)
 if(!(Test-Path -LiteralPath $path)){if($SkipMissing){continue};throw "Missing $($entry.id)"}
 if($entry.frames -gt 1){
  $originalFolder=Join-Path (Get-Location) 'assets/references/shared-ocean-20261022'
  New-Item -ItemType Directory -Force -Path $originalFolder | Out-Null
  $original=Join-Path $originalFolder "$($entry.id)_source.png"
  if(!(Test-Path -LiteralPath $original)){Copy-Item -LiteralPath $path -Destination $original}
  $cutout=Join-Path $originalFolder "$($entry.id)_cutout.png"
  if($entry.rarity -eq 'mythic' -and !(Test-Path -LiteralPath $cutout)){
   if($SkipMissing){continue};throw "Missing reviewed transparent cutout: $($entry.id)"
  }
  if(Test-Path -LiteralPath $cutout){$original=$cutout}
  $before=[SirenRegistration]::Inspect($original,[int]$entry.columns,.5,.5)
  # All frames receive exactly the SAME scale about the SAME cell center.
  # Preserve the originals; never fit each moving silhouette independently.
  $factor=[Math]::Min(1,.84/$before.extent)
  if($factor -lt .999){
   $source=[Drawing.Bitmap]::new($original)
   $padded=[Drawing.Bitmap]::new($source.Width,$source.Height,[Drawing.Imaging.PixelFormat]::Format32bppArgb)
   $g=[Drawing.Graphics]::FromImage($padded)
   try{
    $g.Clear([Drawing.Color]::Transparent)
    $g.InterpolationMode=[Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
    $w=$source.Width/[double]$entry.columns;$h=$source.Height/2.0
    for($frame=0;$frame -lt $entry.frames;$frame++){
     $x=($frame%$entry.columns)*$w;$y=[Math]::Floor($frame/$entry.columns)*$h
     $dest=[Drawing.RectangleF]::new($x+$w*(1-$factor)/2,$y+$h*(1-$factor)/2,$w*$factor,$h*$factor)
     $rect=[Drawing.RectangleF]::new($x,$y,$w,$h)
     $g.DrawImage($source,$dest,$rect,[Drawing.GraphicsUnit]::Pixel)
    }
    $padded.Save($path,[Drawing.Imaging.ImageFormat]::Png)
   }finally{$g.Dispose();$padded.Dispose();$source.Dispose()}
  }
 }
 $bitmap=[Drawing.Bitmap]::new($path)
 try{
  if($bitmap.GetPixel(0,0).A -gt 8){throw "Nontransparent corner: $($entry.id)"}
  if($entry.frames -gt 1){
   $width=[int][Math]::Floor($bitmap.Width/$entry.columns);$height=[int][Math]::Floor($bitmap.Height/2)
   if([Math]::Abs($width-$height) -gt 3){throw "Non-square cells: $($entry.id)"}
   $thumb=$bitmap.Clone([Drawing.Rectangle]::new(0,0,$width,$height),[Drawing.Imaging.PixelFormat]::Format32bppArgb)
   try{$thumb.Save((Join-Path (Get-Location) (Join-Path $Root $entry.thumbnail_path)),[Drawing.Imaging.ImageFormat]::Png)}finally{$thumb.Dispose()}
   if($entry.frames -eq 6){
    # Existing deployed clients understand only 2x2 sheets. Keep a compatible
    # basic swim fallback; the new runtime selects the full six-pose sheet.
    $compat=[Drawing.Bitmap]::new($width*2,$height*2,[Drawing.Imaging.PixelFormat]::Format32bppArgb)
    $cg=[Drawing.Graphics]::FromImage($compat)
    try{
     $cg.Clear([Drawing.Color]::Transparent)
     $poses=@(0,1,2,1)
     for($f=0;$f -lt 4;$f++){
      $src=[Drawing.Rectangle]::new(($poses[$f]%3)*$width,[Math]::Floor($poses[$f]/3)*$height,$width,$height)
      $dst=[Drawing.Rectangle]::new(($f%2)*$width,[Math]::Floor($f/2)*$height,$width,$height)
      $cg.DrawImage($bitmap,$dst,$src,[Drawing.GraphicsUnit]::Pixel)
     }
     $compat.Save($path.Replace('_sprite.png','_compat_sprite.png'),[Drawing.Imaging.ImageFormat]::Png)
    }finally{$cg.Dispose();$compat.Dispose()}
   }
  }
 }finally{$bitmap.Dispose()}
 if($entry.frames -gt 1){
  $ax=.75;$ay=.42
  if($entry.movement_type -eq 'pulse'){$ax=.5;$ay=.3}
  if($entry.id -match 'vampire-squid'){$ax=.84;$ay=.43}
  if($entry.id -match 'leaf-sheep|sea-pig|tongue-snail'){$ax=.72;$ay=.45}
  if($entry.id -match 'colony'){$ax=.72;$ay=.4}
  if($entry.id -match 'forgotten-star|charybdis'){$ax=.5;$ay=.5}
  if($entry.id -match 'eclion|jormungandr'){$ax=.8;$ay=.35}
  $audit=[SirenRegistration]::Inspect($path,[int]$entry.columns,$ax,$ay)
  $results+=@{id=$entry.id;storage_path=$entry.storage_path;audit=$audit}
  $layouts[$entry.storage_path]=@{cell=$audit.cell;scale=1;shifts=$audit.shifts}
 }
 Write-Output "Prepared $($entry.id)"
}
$results | ConvertTo-Json -Depth 14 | Set-Content -LiteralPath (Join-Path $Root 'registration.json') -Encoding UTF8
$layouts | ConvertTo-Json -Depth 12 | Set-Content -LiteralPath 'src/features/aquarium/shared-expansion-frame-layouts.json' -Encoding UTF8
