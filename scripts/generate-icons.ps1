# Regenerate favicon and PWA sizes from the Pongi mascot artwork.
Add-Type -AssemblyName System.Drawing
$assetDirectory = [System.IO.Path]::GetFullPath((Join-Path $PSScriptRoot '../public'))
$source = [System.Drawing.Image]::FromFile((Join-Path $assetDirectory 'branding/pongi.png'))
try {
  foreach ($icon in @(
    @{ Name = 'favicon-32.png'; Size = 32; Maskable = $false },
    @{ Name = 'favicon-64.png'; Size = 64; Maskable = $false },
    @{ Name = 'pwa-192x192.png'; Size = 192; Maskable = $false },
    @{ Name = 'pwa-512x512.png'; Size = 512; Maskable = $false },
    @{ Name = 'pwa-maskable-512x512.png'; Size = 512; Maskable = $true },
    @{ Name = 'apple-touch-icon.png'; Size = 180; Maskable = $true }
  )) {
    $size = $icon.Size
    $bitmap = [System.Drawing.Bitmap]::new($size, $size)
    $graphics = [System.Drawing.Graphics]::FromImage($bitmap)
    try {
      $graphics.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
      $graphics.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality
      $graphics.Clear([System.Drawing.Color]::Transparent)
      $inset = 0
      if ($icon.Maskable) {
        $graphics.Clear([System.Drawing.ColorTranslator]::FromHtml('#eff6ff'))
        $inset = [int]($size * .14)
      }
      $graphics.DrawImage($source, $inset, $inset, $size - 2 * $inset, $size - 2 * $inset)
      $bitmap.Save((Join-Path $assetDirectory $icon.Name), [System.Drawing.Imaging.ImageFormat]::Png)
    } finally {
      $graphics.Dispose()
      $bitmap.Dispose()
    }
  }
} finally {
  $source.Dispose()
}
