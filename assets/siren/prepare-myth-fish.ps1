Add-Type -AssemblyName System.Drawing
$manifestPath = 'assets/siren/myth-fish-expansion.json'
$manifest = Get-Content -Raw -Encoding UTF8 $manifestPath | ConvertFrom-Json
$generatedRoot = 'C:/Users/user/.codex/generated_images/01a15ee5-02b8-7d22-b644-c51686c54b7c'
$sources = @('exec-f5737b30-0b24-4054-8978-757b70655f35.png', 'exec-92982280-2759-451f-96d9-8c3756d2757f.png', 'exec-71834bc6-b7c6-46d0-b308-4913e004e523.png')
for ($i = 0; $i -lt $manifest.entries.Count; $i++) {
  $entry = $manifest.entries[$i]
  $rarityFolder = if ($entry.rarity -eq 'common') { 'normal' } else { 'rare' }
  $folder = Join-Path $manifest.batch "fish/$rarityFolder"
  New-Item -ItemType Directory -Force -Path $folder | Out-Null
  $sheetPath = Join-Path $folder "$($entry.id)_sprite.png"
  Copy-Item -LiteralPath (Join-Path $generatedRoot $sources[$i]) -Destination $sheetPath
  $bitmap = [System.Drawing.Bitmap]::new((Join-Path (Get-Location) $sheetPath))
  try {
    if ($bitmap.Width -ne $bitmap.Height -or $bitmap.Width % 2 -ne 0) { throw 'Expected square 2x2 atlas' }
    $cell = [int]($bitmap.Width / 2)
    if ($bitmap.GetPixel(0,0).A -ne 0) { throw 'Expected transparent alpha' }
    # Extract the first animation frame as the thumbnail without redrawing the artwork.
    $thumbnail = $bitmap.Clone([System.Drawing.Rectangle]::new(0,0,$cell,$cell), [System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
    try { $thumbnail.Save((Join-Path (Get-Location) (Join-Path $folder "$($entry.id)_thumbnail.png")), [System.Drawing.Imaging.ImageFormat]::Png) } finally { $thumbnail.Dispose() }
    Write-Output "$($entry.id): $($bitmap.Width)x$($bitmap.Height), transparent, four frames"
  } finally { $bitmap.Dispose() }
}
