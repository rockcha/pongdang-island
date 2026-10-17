param([string]$Sources='artifacts/bluegrove-thumb-sources.json',[string]$Output='.cache/bluegrove-thumbnails.png')
Add-Type -AssemblyName System.Drawing
$sourcesData=Get-Content -Raw $Sources|ConvertFrom-Json
$props=@($sourcesData.PSObject.Properties)
$bitmap=New-Object System.Drawing.Bitmap 1000,([int][Math]::Ceiling($props.Count/4)*230)
$g=[System.Drawing.Graphics]::FromImage($bitmap);$g.Clear([System.Drawing.Color]::Beige)
$font=New-Object System.Drawing.Font 'Arial',10
$base='C:/Users/user/.codex/generated_images/01a14511-dc16-7ff1-862c-ea039076728e/'
for($i=0;$i -lt $props.Count;$i++){
 $img=[System.Drawing.Image]::FromFile($base+$props[$i].Value)
 $x=($i%4)*250;$y=[int][Math]::Floor($i/4)*230
 $g.DrawImage($img,$x+15,$y+5,220,195);$g.DrawString($props[$i].Name,$font,[System.Drawing.Brushes]::Black,$x+5,$y+205);$img.Dispose()
}
$bitmap.Save((Join-Path (Get-Location) $Output));$font.Dispose();$g.Dispose();$bitmap.Dispose()
