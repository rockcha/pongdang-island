param([string]$Image,[string]$Output)
Add-Type -AssemblyName System.Drawing
$b=[System.Drawing.Bitmap]::FromFile((Resolve-Path -LiteralPath $Image))
$result=@()
for($f=0;$f -lt 8;$f++){
 $left=[int][Math]::Round(($f%4)*$b.Width/4);$right=[int][Math]::Round((($f%4)+1)*$b.Width/4)
 $top=[int][Math]::Round([Math]::Floor($f/4)*$b.Height/2);$bottom=[int][Math]::Round(([Math]::Floor($f/4)+1)*$b.Height/2)
 foreach($threshold in @(32,200)){
  $minX=$right;$minY=$bottom;$maxX=-1;$maxY=-1;$edge=0
  for($y=$top;$y -lt $bottom;$y++){for($x=$left;$x -lt $right;$x++){
   if($b.GetPixel($x,$y).A -lt $threshold){continue}
   $minX=[Math]::Min($minX,$x);$minY=[Math]::Min($minY,$y);$maxX=[Math]::Max($maxX,$x);$maxY=[Math]::Max($maxY,$y)
   if($x -eq $left -or $x -eq $right-1 -or $y -eq $top -or $y -eq $bottom-1){$edge++}
  }}
  $result+=[ordered]@{frame=$f;threshold=$threshold;x=$minX-$left;y=$minY-$top;width=$maxX-$minX+1;height=$maxY-$minY+1;edgePixels=$edge}
 }
}
[ordered]@{width=$b.Width;height=$b.Height;columns=4;rows=2;frames=$result}|ConvertTo-Json -Depth 5|Set-Content -Encoding UTF8 -LiteralPath $Output
$b.Dispose()
$result|Where-Object threshold -eq 200|Format-Table
