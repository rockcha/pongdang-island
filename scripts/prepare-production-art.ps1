param([string]$Root='assets/references/production-facilities')
Add-Type -AssemblyName System.Drawing
Add-Type -ReferencedAssemblies System.Drawing -TypeDefinition @'
using System;using System.Drawing;using System.Drawing.Imaging;using System.Runtime.InteropServices;
public static class ProductionArtBounds {
 public static Rectangle Measure(Bitmap source){
  using(var bitmap=source.Clone(new Rectangle(0,0,source.Width,source.Height),PixelFormat.Format32bppArgb)){
   var data=bitmap.LockBits(new Rectangle(0,0,bitmap.Width,bitmap.Height),ImageLockMode.ReadOnly,PixelFormat.Format32bppArgb);
   int stride=data.Stride;byte[] bytes=new byte[Math.Abs(stride)*bitmap.Height];Marshal.Copy(data.Scan0,bytes,0,bytes.Length);bitmap.UnlockBits(data);
   int l=bitmap.Width,t=bitmap.Height,r=-1,b=-1;
   for(int y=0;y<bitmap.Height;y++)for(int x=0;x<bitmap.Width;x++)if(bytes[y*stride+x*4+3]>2){l=Math.Min(l,x);t=Math.Min(t,y);r=Math.Max(r,x);b=Math.Max(b,y);}
   if(r<0)throw new Exception("Empty facility image");return new Rectangle(l,t,r-l+1,b-t+1);
  }
 }
}
'@
$entries=Get-ChildItem -LiteralPath (Join-Path $Root 'entries') -Filter '*.json' | ForEach-Object {Get-Content -LiteralPath $_.FullName -Encoding UTF8 -Raw | ConvertFrom-Json}
foreach($entry in $entries){
 $raw=Join-Path (Get-Location) (Join-Path $Root $entry.source)
 if(!(Test-Path -LiteralPath $raw)){continue}
 $source=[Drawing.Bitmap]::new($raw)
 $banner=$entry.id -eq 'banner'
 $w=512;$h=512;if($banner){$w=1536;$h=512}
 $target=[Drawing.Bitmap]::new($w,$h,[Drawing.Imaging.PixelFormat]::Format32bppArgb)
 $g=[Drawing.Graphics]::FromImage($target)
 try{
  $g.Clear([Drawing.Color]::Transparent)
  $g.InterpolationMode=[Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
  if($banner){
   $factor=[Math]::Max($w/[double]$source.Width,$h/[double]$source.Height)
   $dw=$source.Width*$factor;$dh=$source.Height*$factor
   $g.DrawImage($source,[Drawing.RectangleF]::new(($w-$dw)/2,($h-$dh)/2,$dw,$dh))
  }else{
   if($source.GetPixel(0,0).A -gt 0 -or $source.GetPixel($source.Width-1,0).A -gt 0){throw "Opaque facility background: $($entry.id)"}
   # Match visual occupancy and one base line using actual alpha bounds.
   # Preserve aspect ratio, orientation and all painted parts.
   $bounds=[ProductionArtBounds]::Measure($source)
   $factor=420.0/[Math]::Max($bounds.Width,$bounds.Height)
   $dw=$bounds.Width*$factor;$dh=$bounds.Height*$factor
   $g.DrawImage($source,[Drawing.RectangleF]::new((512-$dw)/2,462-$dh,$dw,$dh),[Drawing.RectangleF]$bounds,[Drawing.GraphicsUnit]::Pixel)
  }
  $target.Save((Join-Path (Get-Location) $entry.output),[Drawing.Imaging.ImageFormat]::Png)
 }finally{$g.Dispose();$target.Dispose();$source.Dispose()}
 Write-Output "Prepared $($entry.id)"
}
