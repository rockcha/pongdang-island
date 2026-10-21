param([Parameter(Mandatory=$true)][string]$Batch)
$ErrorActionPreference='Stop'
# Normalize generated canvases without independently scaling animation frames.
# Always read the immutable generation source recorded in the batch manifest.
Add-Type -AssemblyName System.Drawing
Add-Type -ReferencedAssemblies System.Drawing -TypeDefinition @'
using System;
using System.Drawing;
using System.Drawing.Imaging;
using System.Runtime.InteropServices;
public static class CollectibleCanvas {
 public static void Prepare(string source,string output,int columns,int rows,int cell) {
  using(var original=new Bitmap(source))
  // Generated grids can use fractional cell edges (e.g. 1774/4). Align the
  // entire canvas once before slicing, keeping the same transform in all cells.
  using(var image=new Bitmap(original,new Size((int)Math.Ceiling(original.Width/(double)columns)*columns,(int)Math.Ceiling(original.Height/(double)rows)*rows))) {
   int cw=image.Width/columns,ch=image.Height/rows;
   var pixels=image.LockBits(new Rectangle(0,0,image.Width,image.Height),ImageLockMode.ReadOnly,PixelFormat.Format32bppArgb);
   int left=cw,top=ch,right=-1,bottom=-1;
   try {
    var bytes=new byte[pixels.Stride*image.Height];Marshal.Copy(pixels.Scan0,bytes,0,bytes.Length);
    for(int frame=0;frame<columns*rows;frame++)for(int y=0;y<ch;y++)for(int x=0;x<cw;x++){
     int offset=(y+frame/columns*ch)*pixels.Stride+(x+frame%columns*cw)*4;
     if(bytes[offset+3]<32)continue;
     left=Math.Min(left,x);top=Math.Min(top,y);right=Math.Max(right,x);bottom=Math.Max(bottom,y);
    }
   } finally {image.UnlockBits(pixels);}
   if(right<left)throw new Exception("Empty alpha silhouette: "+source);
   float scale=cell*.84f/Math.Max(right-left+1,bottom-top+1);
   float centerX=(left+right+1)/2f,centerY=(top+bottom+1)/2f;
   using(var result=new Bitmap(columns*cell,rows*cell,PixelFormat.Format32bppArgb))
   using(var g=Graphics.FromImage(result)) {
    g.Clear(Color.Transparent);
    g.InterpolationMode=System.Drawing.Drawing2D.InterpolationMode.HighQualityBicubic;
    g.CompositingQuality=System.Drawing.Drawing2D.CompositingQuality.HighQuality;
    for(int frame=0;frame<columns*rows;frame++) {
     int col=frame%columns,row=frame/columns;
     g.SetClip(new Rectangle(col*cell,row*cell,cell,cell));
     g.DrawImage(image,new RectangleF(col*cell+cell/2f-centerX*scale,row*cell+cell/2f-centerY*scale,cw*scale,ch*scale),new RectangleF(col*cw,row*ch,cw,ch),GraphicsUnit.Pixel);
     g.ResetClip();
    }
    result.Save(output,ImageFormat.Png);
   }
  }
 }
}
'@
$root=(Resolve-Path -LiteralPath $Batch).Path
$manifest=Get-Content -LiteralPath (Join-Path $root 'manifest.json') -Raw -Encoding utf8 | ConvertFrom-Json
foreach($entry in $manifest.entries){
 $destination=Join-Path $root $entry.storage_path
 $columns=if($entry.type -eq 'thumbnail'){1}elseif($entry.rarity -eq 'mythic'){4}else{2}
 $rows=if($entry.type -eq 'thumbnail'){1}else{2}
 $cell=if($entry.type -eq 'thumbnail'){1024}else{512}
 [CollectibleCanvas]::Prepare($entry.source,$destination,$columns,$rows,$cell)
 Write-Output "Prepared $($entry.storage_path)"
}
