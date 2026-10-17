Add-Type -AssemblyName System.Drawing
$script=Get-Content -Raw artifacts/register-mythic-body.ps1
$code=[regex]::Match($script,'(?s)-TypeDefinition @''\r?\n(.*?)\r?\n''@').Groups[1].Value
Add-Type -ReferencedAssemblies System.Drawing -TypeDefinition $code
$root='assets/storage-upload/new/20261017-135100'
$plan=Get-Content -Raw -Encoding UTF8 artifacts/primal-expansion-plan.json|ConvertFrom-Json
$reports=@()
foreach($s in $plan){
 if($s.kind -eq 'decoration' -and !$s.plant){continue}
 $folder=if($s.rarity -eq 'common'){'normal'}else{$s.rarity}
 $kind=if($s.kind -eq 'decoration'){'decorations'}else{'fish'}
 $path="$root/$kind/$folder/$($s.id)_sprite.png"
 if(!(Test-Path -LiteralPath $path)){continue}
 $columns=if($s.rarity -eq 'mythic'){4}else{2}
 $px=-1;$py=-1
 if($s.plant -or $s.id -in @('bronze-spiral-ammonite','whorl-tetragonites')){
  $b=[Drawing.Bitmap]::FromFile((Resolve-Path -LiteralPath $path));$lx=$b.Width;$ly=$b.Height;$rx=0;$ry=0
  for($y=0;$y -lt $b.Height/2;$y+=3){for($x=0;$x -lt $b.Width/$columns;$x+=3){if($b.GetPixel($x,$y).A -ge 200){$lx=[Math]::Min($lx,$x);$ly=[Math]::Min($ly,$y);$rx=[Math]::Max($rx,$x);$ry=[Math]::Max($ry,$y)}}}
  $px=[int]($lx+($rx-$lx)*$(if($s.plant){.5}else{.35}))-16
  $py=[int]($ly+($ry-$ly)*$(if($s.plant){.9}else{.5}))-16
  $b.Dispose()
 }
 $report=[MythicRegistration]::Run((Resolve-Path -LiteralPath $path),$px,$py,32,32,$columns)|ConvertFrom-Json
 $report|Add-Member -NotePropertyName id -NotePropertyValue $s.id
 $report|Add-Member -NotePropertyName columns -NotePropertyValue $columns
 $report|Add-Member -NotePropertyName storage_path -NotePropertyValue "$kind/$folder/$($s.id)_sprite.png"
 $reports+=$report
}
[IO.File]::WriteAllText((Join-Path (Get-Location) "$root/body-registration.json"),($reports|ConvertTo-Json -Depth 8))
$reports|ForEach-Object{"$($_.id): max patch error $(($_.frames|Measure-Object -Property error -Maximum).Maximum)"}
