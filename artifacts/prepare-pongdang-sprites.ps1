param([Parameter(Mandatory=$true)][string]$Config)
Add-Type -AssemblyName System.Drawing
$entries=Get-Content -Raw -Encoding utf8 -LiteralPath $Config | ConvertFrom-Json
foreach($entry in $entries){
 $source=[System.Drawing.Bitmap]::new($entry.source)
 if($source.Width -ne $source.Height -or $source.Width%2 -ne 0){$source.Dispose();throw 'Expected square 2x2 sprite sheet'}
 $cell=[int]($source.Width/2)
 $result=[System.Drawing.Bitmap]::new($source.Width,$source.Height)
 $g=[System.Drawing.Graphics]::FromImage($result)
 $g.InterpolationMode=[System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
 $factor=if($entry.normalizeScale){[double]$entry.normalizeScale}else{.88}
 $size=[int][math]::Floor($cell*$factor);$pad=[int][math]::Floor(($cell-$size)/2)
 for($i=0;$i -lt 4;$i++){
  $x=($i%2)*$cell;$y=[int][math]::Floor($i/2)*$cell
  $frame=$source.Clone([System.Drawing.Rectangle]::new($x,$y,$cell,$cell),[System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
  $g.DrawImage($frame,[System.Drawing.Rectangle]::new($x+$pad,$y+$pad,$size,$size))
  $frame.Dispose()
 }
 $result.Save($entry.destination,[System.Drawing.Imaging.ImageFormat]::Png)
 $g.Dispose();$result.Dispose();$source.Dispose()
 Write-Output $entry.destination
}
