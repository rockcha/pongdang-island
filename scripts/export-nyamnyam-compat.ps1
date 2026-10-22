param([string]$Root='assets/storage-upload/new/20261023-034400')
$ErrorActionPreference='Stop'
Add-Type -AssemblyName System.Drawing
$manifest=Get-Content -LiteralPath (Join-Path $Root 'manifest.json') -Raw -Encoding UTF8 | ConvertFrom-Json
foreach($p in $manifest.items | Where-Object {$_.frames -eq 8}){
 $source=[Drawing.Bitmap]::new((Resolve-Path -LiteralPath (Join-Path $Root $p.sprite_sheet_path)).Path)
 $cell=$source.Width/4
 if($cell -ne [Math]::Floor($cell) -or $source.Height -ne $cell*2){throw 'Normalize the eight-frame grid before compatibility export.'}
 $output=[Drawing.Bitmap]::new($cell*2,$cell*2,[Drawing.Imaging.PixelFormat]::Format32bppArgb)
 $g=[Drawing.Graphics]::FromImage($output);$g.Clear([Drawing.Color]::Transparent)
 for($f=0;$f -lt 4;$f++){
  $src=[Drawing.Rectangle]::new($f*$cell,0,$cell,$cell)
  $dst=[Drawing.Rectangle]::new(($f%2)*$cell,[Math]::Floor($f/2)*$cell,$cell,$cell)
  $g.DrawImage($source,$dst,$src,[Drawing.GraphicsUnit]::Pixel)
 }
 $g.Dispose();$source.Dispose()
 $compat=if($p.catalog_sprite_sheet_path){$p.catalog_sprite_sheet_path}else{$p.sprite_sheet_path -replace '_swim8_(v[0-9]+)_sprite\.png$','_$1_sprite.png'}
 $path=Join-Path $Root $compat
 $output.Save([IO.Path]::GetFullPath($path),[Drawing.Imaging.ImageFormat]::Png);$output.Dispose()
 Write-Output $path
}
