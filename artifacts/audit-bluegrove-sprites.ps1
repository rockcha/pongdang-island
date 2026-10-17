Add-Type -AssemblyName System.Drawing
$script=Get-Content -Raw artifacts/register-mythic-body.ps1
$code=[regex]::Match($script,'(?s)-TypeDefinition @''\r?\n(.*?)\r?\n''@').Groups[1].Value
Add-Type -ReferencedAssemblies System.Drawing -TypeDefinition $code
$root='assets/storage-upload/new/20261017-095349'
$plan=Get-Content -Raw -Encoding UTF8 artifacts/bluegrove-expansion-plan.json|ConvertFrom-Json
$reports=@()
foreach($s in $plan){
 if($s.kind -eq 'decoration'){continue}
 $folder=if($s.rarity -eq 'common'){'normal'}else{$s.rarity}
 $path="$root/fish/$folder/$($s.id)_sprite.png"
 if(!(Test-Path -LiteralPath $path)){continue}
 $columns=if($s.rarity -eq 'mythic'){4}else{2}
 $report=[MythicRegistration]::Run((Resolve-Path -LiteralPath $path),-1,-1,38,38,$columns)|ConvertFrom-Json
 $report|Add-Member -NotePropertyName id -NotePropertyValue $s.id
 $report|Add-Member -NotePropertyName columns -NotePropertyValue $columns
 $reports+=$report
}
[IO.File]::WriteAllText((Join-Path (Get-Location) "$root/body-registration.json"),($reports|ConvertTo-Json -Depth 8))
$reports|ForEach-Object{"$($_.id): max patch error $(($_.frames|Measure-Object -Property error -Maximum).Maximum)"}
