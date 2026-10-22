Add-Type -AssemblyName System.Drawing
Add-Type -ReferencedAssemblies System.Drawing -TypeDefinition @'
using System;using System.Drawing;using System.Drawing.Imaging;
public static class StatusSprites {
 public static void Build(string input,string output){
  using(var src=new Bitmap(input)){
   if(src.GetPixel(0,0).A>0)throw new Exception("Expected transparent source");
   var cells=new Rectangle[8];var anchors=new PointF[8];float extentX=0,extentTop=0,extentBottom=0;
   for(int i=0;i<8;i++){
    int x=(int)Math.Round((i%4)*src.Width/4.0),y=(int)Math.Round((i/4)*src.Height/2.0);
    int right=(int)Math.Round((i%4+1)*src.Width/4.0),bottom=(int)Math.Round((i/4+1)*src.Height/2.0);
    cells[i]=new Rectangle(x,y,right-x,bottom-y);
    int l=right,t=bottom,r=x,b=y,coreL=right,coreR=x;
    for(int py=y;py<bottom;py++)for(int px=x;px<right;px++)if(src.GetPixel(px,py).A>16){
     l=Math.Min(l,px);r=Math.Max(r,px);t=Math.Min(t,py);b=Math.Max(b,py);
     if(py>y+cells[i].Height*.76){coreL=Math.Min(coreL,px);coreR=Math.Max(coreR,px);}
    }
    if(r<=l||b<=t)throw new Exception("Empty frame");
    float ax=(coreL+coreR)/2f,ay=b;
    anchors[i]=new PointF(ax,ay);extentX=Math.Max(extentX,Math.Max(ax-l,r-ax));extentTop=Math.Max(extentTop,ay-t);extentBottom=Math.Max(extentBottom,b-ay);
   }
   // One scale for the whole sequence. Align each rigid base without scaling
   // moving flames/smoke independently, and retain an eight-pixel safety margin.
   float scale=Math.Min(39f/extentX,78f/extentTop);
   using(var target=new Bitmap(768,96,PixelFormat.Format32bppArgb))using(var g=Graphics.FromImage(target)){
    g.Clear(Color.Transparent);g.InterpolationMode=System.Drawing.Drawing2D.InterpolationMode.HighQualityBicubic;
    for(int i=0;i<8;i++){
     var c=cells[i];var a=anchors[i];var state=g.Save();g.SetClip(new Rectangle(i*96,0,96,96));
     g.DrawImage(src,new RectangleF(i*96+48+(c.X-a.X)*scale,86+(c.Y-a.Y)*scale,c.Width*scale,c.Height*scale),c,GraphicsUnit.Pixel);g.Restore(state);
    }
    target.Save(output,ImageFormat.Png);
   }
  }
 }
}
'@
$root=Get-Location
foreach($id in @('idle','working','ready','expired')){
 [StatusSprites]::Build((Join-Path $root "assets/references/production-status/sources/$id.source"),(Join-Path $root "public/production/status/$id-v1.png"))
 Write-Output "Prepared $id : 8 frames, 96px"
}
