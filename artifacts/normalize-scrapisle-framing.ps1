# Uniform framing only: one union box and one scale/translation for ALL frames of each sheet.
# Never individually center, crop to a pose, or change a frame's body scale.
Add-Type -AssemblyName System.Drawing
Add-Type -ReferencedAssemblies System.Drawing -TypeDefinition @'
using System;using System.Drawing;using System.Drawing.Imaging;using System.Drawing.Drawing2D;using System.Runtime.InteropServices;using System.Globalization;
public static class CloudFraming {
 public static string Run(string path,int cols,int rows){
  Bitmap source;using(var file=new Bitmap(path)){source=new Bitmap(file.Width,file.Height,PixelFormat.Format32bppArgb);using(var g=Graphics.FromImage(source))g.DrawImageUnscaled(file,0,0);}
  using(source){double cw=source.Width/(double)cols,ch=source.Height/(double)rows;
   var bits=source.LockBits(new Rectangle(0,0,source.Width,source.Height),ImageLockMode.ReadOnly,PixelFormat.Format32bppArgb);
   int stride=bits.Stride;var pixels=new byte[stride*source.Height];Marshal.Copy(bits.Scan0,pixels,0,pixels.Length);source.UnlockBits(bits);
   double lx=cw,ly=ch,rx=-1,ry=-1;int edges=0;
   for(int f=0;f<cols*rows;f++){double ox=f%cols*cw,oy=f/cols*ch;
    for(int y=(int)Math.Ceiling(oy);y<oy+ch;y++)for(int x=(int)Math.Ceiling(ox);x<ox+cw;x++){
     if(pixels[y*stride+x*4+3]<16)continue;double px=x-ox,py=y-oy;
     lx=Math.Min(lx,px);rx=Math.Max(rx,px);ly=Math.Min(ly,py);ry=Math.Max(ry,py);
     if(px<1||py<1||px>=cw-1||py>=ch-1)edges++;
    }
   }
   if(edges>0)throw new Exception("Clipped source requires regeneration: "+path+" edges="+edges);
   if(rx<0)throw new Exception("Empty source: "+path);
   int cell=(int)Math.Ceiling(Math.Max(cw,ch));double scale=.84*cell/Math.Max(rx-lx+1,ry-ly+1);
   double dx=cell/2.0-(lx+rx+1)/2*scale,dy=cell/2.0-(ly+ry+1)/2*scale;
   using(var output=new Bitmap(cell*cols,cell*rows,PixelFormat.Format32bppArgb)){
    using(var g=Graphics.FromImage(output)){g.InterpolationMode=InterpolationMode.HighQualityBicubic;g.CompositingQuality=CompositingQuality.HighQuality;g.PixelOffsetMode=PixelOffsetMode.HighQuality;
     for(int f=0;f<cols*rows;f++)g.DrawImage(source,new RectangleF((float)(f%cols*cell+dx),(float)(f/cols*cell+dy),(float)(cw*scale),(float)(ch*scale)),new RectangleF((float)(f%cols*cw),(float)(f/cols*ch),(float)cw,(float)ch),GraphicsUnit.Pixel);
    }
    output.Save(path,ImageFormat.Png);
   }
   Func<double,string> n=x=>x.ToString("F5",CultureInfo.InvariantCulture);
   return "{\"sourceWidth\":"+source.Width+",\"sourceHeight\":"+source.Height+",\"cell\":"+cell+",\"columns\":"+cols+",\"rows\":"+rows+",\"uniformScale\":"+n(scale)+",\"translation\":["+n(dx)+","+n(dy)+"],\"union\":["+n(lx)+","+n(ly)+","+n(rx)+","+n(ry)+"]}";
  }
 }
}
'@
$plan=Get-Content -Raw -Encoding utf8 artifacts/scrapisle-plan.json|ConvertFrom-Json
$reports=@()
foreach($s in $plan.species){foreach($path in @($s.thumbnail,$s.sprite)){
 if(!$path){continue};$sprite=$path -eq $s.sprite;$cols=if(!$sprite){1}elseif($s.frames -eq 8){4}else{2};$rows=if($sprite){2}else{1}
 $record=[CloudFraming]::Run((Join-Path $PWD ($plan.batch+'/'+$path)),$cols,$rows)|ConvertFrom-Json
 $record|Add-Member -NotePropertyName storage_path -NotePropertyValue $path;$reports+=$record
}}
[IO.File]::WriteAllText((Join-Path $PWD ($plan.batch+'/uniform-framing.json')),($reports|ConvertTo-Json -Depth 8),[Text.UTF8Encoding]::new($false))
Write-Output "Uniformly framed $($reports.Count) PNGs; no per-frame scale or alignment changes."
