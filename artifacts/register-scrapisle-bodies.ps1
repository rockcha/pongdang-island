Add-Type -AssemblyName System.Drawing
$source=Get-Content -Raw artifacts/register-mythic-body.ps1
$code=[regex]::Match($source,"(?s)-TypeDefinition @'\r?\n(.*?)\r?\n'@").Groups[1].Value
$code=$code.Replace('if(n>0&&sum/n<best){best=sum/n;','if(n>0&&sum/n+(dx*dx+dy*dy)*0.002<best){best=sum/n+(dx*dx+dy*dy)*0.002;')
Add-Type -ReferencedAssemblies System.Drawing -TypeDefinition $code
$root='assets/storage-upload/new/20261017-183433'
$plan=(Get-Content -Raw -Encoding UTF8 artifacts/scrapisle-plan.json|ConvertFrom-Json).species
$reports=@()
foreach($s in $plan){
 if($s.kind -ne 'fish'){continue}
 $folder=if($s.rarity -eq 'common'){'normal'}else{$s.rarity}
 $path="$root/fish/$folder/$($s.id)_sprite.png"
 if(!(Test-Path -LiteralPath $path)){continue}
 $cols=if($s.rarity -eq 'mythic'){4}else{2}
 $px=-1;$py=-1
 if($s.movement -eq 'fixed' -and $s.id -ne 'cloud-lantern-no-face'){
  $b=[Drawing.Bitmap]::FromFile((Resolve-Path -LiteralPath $path));$lx=$b.Width;$ly=$b.Height;$rx=0;$ry=0
  for($y=0;$y -lt $b.Height/2;$y+=3){for($x=0;$x -lt $b.Width/$cols;$x+=3){if($b.GetPixel($x,$y).A -ge 200){$lx=[Math]::Min($lx,$x);$ly=[Math]::Min($ly,$y);$rx=[Math]::Max($rx,$x);$ry=[Math]::Max($ry,$y)}}}
  $px=[int]($lx+($rx-$lx)*.5)-16;$py=[int]($ly+($ry-$ly)*.9)-16;$b.Dispose()
 }
 $pw=32;$ph=32
 if($s.id -eq 'scrap-tin-home-hermit-crab'){$px=180;$py=285;$pw=64;$ph=64}
 if($s.id -eq 'scrap-bulb-home-octopus'){$px=130;$py=320;$pw=48;$ph=64}
 if($s.id -eq 'scrap-scrap-armored-sturgeon'){$px=390;$py=325;$pw=96;$ph=64}
 $r=[MythicRegistration]::Run((Resolve-Path -LiteralPath $path),$px,$py,$pw,$ph,$cols)|ConvertFrom-Json
 $r|Add-Member -NotePropertyName id -NotePropertyValue $s.id
 $r|Add-Member -NotePropertyName columns -NotePropertyValue $cols
 $r|Add-Member -NotePropertyName storage_path -NotePropertyValue "fish/$folder/$($s.id)_sprite.png"
 $reports+=$r
}
[IO.File]::WriteAllText((Join-Path (Get-Location) "$root/body-registration.json"),($reports|ConvertTo-Json -Depth 8))
"Registered $($reports.Count) sheets."
