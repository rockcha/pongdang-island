Add-Type -AssemblyName System.Drawing
$source=Get-Content -Raw artifacts/register-mythic-body.ps1
$code=[regex]::Match($source,"(?s)-TypeDefinition @'\r?\n(.*?)\r?\n'@").Groups[1].Value
Add-Type -ReferencedAssemblies System.Drawing -TypeDefinition $code
$root='assets/storage-upload/new/20261017-153200'
$plan=Get-Content -Raw -Encoding UTF8 artifacts/whitenight-expansion-plan.json|ConvertFrom-Json
$reports=@()
foreach($s in $plan){
 if($s.kind -eq 'decoration'){continue}
 $folder=if($s.rarity -eq 'common'){'normal'}else{$s.rarity}
 $path="$root/fish/$folder/$($s.id)_sprite.png"
 if(!(Test-Path -LiteralPath $path)){continue}
 $cols=if($s.rarity -eq 'mythic'){4}else{2}
 $px=-1;$py=-1
 if($s.movement -eq 'fixed'){
  $b=[Drawing.Bitmap]::FromFile((Resolve-Path -LiteralPath $path));$lx=$b.Width;$ly=$b.Height;$rx=0;$ry=0
  for($y=0;$y -lt $b.Height/2;$y+=3){for($x=0;$x -lt $b.Width/$cols;$x+=3){if($b.GetPixel($x,$y).A -ge 200){$lx=[Math]::Min($lx,$x);$ly=[Math]::Min($ly,$y);$rx=[Math]::Max($rx,$x);$ry=[Math]::Max($ry,$y)}}}
  $px=[int]($lx+($rx-$lx)*.5)-16;$py=[int]($ly+($ry-$ly)*.9)-16;$b.Dispose()
 }
 $r=[MythicRegistration]::Run((Resolve-Path -LiteralPath $path),$px,$py,32,32,$cols)|ConvertFrom-Json
 $r|Add-Member -NotePropertyName id -NotePropertyValue $s.id
 $r|Add-Member -NotePropertyName columns -NotePropertyValue $cols
 $r|Add-Member -NotePropertyName storage_path -NotePropertyValue "fish/$folder/$($s.id)_sprite.png"
 $reports+=$r
}
[IO.File]::WriteAllText((Join-Path (Get-Location) "$root/body-registration.json"),($reports|ConvertTo-Json -Depth 8))
"Registered $($reports.Count) sheets."
