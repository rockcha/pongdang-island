param([string]$Root='assets/storage-upload/new/20261023-212823',[switch]$RequireComplete)
$ErrorActionPreference='Stop'
Add-Type -AssemblyName System.Drawing
$helper=[IO.File]::ReadAllText((Join-Path (Get-Location) 'scripts/inspect-sprites.ps1'))
$code=[regex]::Match($helper,"(?s)-TypeDefinition @'\r?\n(.*?)\r?\n'@").Groups[1].Value
Add-Type -ReferencedAssemblies System.Drawing -TypeDefinition $code
Add-Type -ReferencedAssemblies System.Drawing -TypeDefinition 'using System.Drawing; public static class HalloweenThumbnailEdge { public static int Count(string path){using(var b=new Bitmap(path)){int n=0;for(int x=0;x<b.Width;x++){if(b.GetPixel(x,0).A>=32)n++;if(b.GetPixel(x,b.Height-1).A>=32)n++;}for(int y=1;y<b.Height-1;y++){if(b.GetPixel(0,y).A>=32)n++;if(b.GetPixel(b.Width-1,y).A>=32)n++;}return n;}}}'
$m=Get-Content -LiteralPath ($Root+'/manifest.json') -Raw -Encoding UTF8 | ConvertFrom-Json
$missing=@();$sprites=@();$thumbs=@()
foreach($e in $m.items){
 $thumb=Join-Path $Root $e.thumbnail_path
 if(!(Test-Path -LiteralPath $thumb)){$missing+=($e.id+':thumbnail');continue}
 $bmp=[Drawing.Bitmap]::new([IO.Path]::GetFullPath($thumb))
 $thumbs+=[ordered]@{id=$e.id;width=$bmp.Width;height=$bmp.Height;edgePixels=[HalloweenThumbnailEdge]::Count([IO.Path]::GetFullPath($thumb))};$bmp.Dispose()
 if($e.frames -le 1){continue}
 $file=Join-Path $Root $e.sprite_sheet_path
 if(!(Test-Path -LiteralPath $file)){$missing+=($e.id+':sprite');continue}
 $columns=if($e.frames -eq 8){4}else{2}
 $raw=[SpriteBounds]::Inspect([IO.Path]::GetFullPath($file),$columns)
 $cw=$raw[0][0]/[double]$columns;$ch=$raw[0][1]/2.0
 $frames=@();$safe=[Math]::Abs($cw-$ch) -lt 1
 for($f=0;$f -lt $e.frames;$f++){
  $b=$raw[$f+1];$margin=[Math]::Min([Math]::Min($b[0],$b[1]),[Math]::Min($cw-$b[0]-$b[2],$ch-$b[1]-$b[3]))
  $minimum=if($e.frames -eq 8){$cw*.08}else{2}
  $ok=$margin -ge $minimum -and $b[4] -gt 100
  if(!$ok){$safe=$false}
  $frames+=[ordered]@{frame=$f;x=$b[0];y=$b[1];width=$b[2];height=$b[3];alphaPixels=$b[4];margin=$margin;safe=$ok}
 }
 $sprites+=[ordered]@{id=$e.id;file=$e.sprite_sheet_path;width=$raw[0][0];height=$raw[0][1];cell=$cw;safe=$safe;frames=$frames}
}
$report=[ordered]@{missing=$missing;thumbnails=$thumbs;sprites=$sprites}
$report|ConvertTo-Json -Depth 9|Set-Content -LiteralPath ($Root+'/sprite-audit.json') -Encoding UTF8
$unsafe=@($sprites|Where-Object{!$_.safe})
$clipped=@($thumbs|Where-Object{$_.edgePixels -gt 0})
Write-Output ([ordered]@{thumbnails=$thumbs.Count;sheets=$sprites.Count;missing=$missing.Count;unsafe=@($unsafe|ForEach-Object{$_.id});clippedThumbnails=@($clipped|ForEach-Object{$_.id})}|ConvertTo-Json -Compress)
if($RequireComplete -and ($missing.Count -or $unsafe.Count -or $clipped.Count)){throw 'Incomplete or unsafe art; do not register catalog.'}
