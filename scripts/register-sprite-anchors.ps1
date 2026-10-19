param([Parameter(Mandatory=$true)][string]$Config,[Parameter(Mandatory=$true)][string]$Output,[ValidateRange(20,200)][int]$SearchRange=80,[ValidateSet(2,4)][int]$Columns=2)
# Read-only RGB template registration. PNGs remain unchanged.
Add-Type -AssemblyName System.Drawing
Add-Type -ReferencedAssemblies System.Drawing -TypeDefinition @'
using System;
using System.Drawing;
using System.Drawing.Imaging;
using System.Runtime.InteropServices;
public static class SpriteRegistration {
 public static double[][] Measure(string path,int x,int y,int w,int h,int searchRange,int columns) {
  using(var src=new Bitmap(path))
  using(var b=src.Clone(new Rectangle(0,0,src.Width,src.Height),PixelFormat.Format32bppArgb)) {
   int cw=b.Width/columns,ch=b.Height/2;
   var data=b.LockBits(new Rectangle(0,0,b.Width,b.Height),ImageLockMode.ReadOnly,PixelFormat.Format32bppArgb);
   try {
    var p=new byte[data.Stride*b.Height];Marshal.Copy(data.Scan0,p,0,p.Length);
    var result=new double[columns*2][];result[0]=new double[]{0,0,0};
    for(int frame=1;frame<columns*2;frame++) {
     int ox=(int)Math.Round((frame%columns)*(b.Width/(double)columns)),oy=(int)Math.Round((frame/columns)*(b.Height/2.0)),bx=0,by=0;double best=double.MaxValue;
     for(int pass=0;pass<2;pass++) {
      int step=pass==0?3:1,range=pass==0?searchRange:3,cx=pass==0?0:bx,cy=pass==0?0:by;
      for(int dy=cy-range;dy<=cy+range;dy+=step)for(int dx=cx-range;dx<=cx+range;dx+=step) {
       if(x+dx<0||y+dy<0||x+dx+w>=cw||y+dy+h>=ch)continue;
       double sum=0;int count=0;
       for(int py=y;py<y+h;py+=3)for(int px=x;px<x+w;px+=3) {
        int a=py*data.Stride+px*4,c=(py+dy+oy)*data.Stride+(px+dx+ox)*4;
        if(p[a+3]<128)continue;
        for(int k=0;k<4;k++){double diff=p[a+k]-p[c+k];sum+=diff*diff;}count++;
       }
       if(count<20)continue;double error=sum/(count*4);
       if(error<best){best=error;bx=dx;by=dy;}
      }
     }
     result[frame]=new double[]{bx,by,Math.Sqrt(best)};
    }
    return result;
   }finally{b.UnlockBits(data);}
  }
 }
}
'@
$entries=Get-Content -Raw -Encoding utf8 -LiteralPath $Config | ConvertFrom-Json
$results=@(foreach($entry in $entries){
 $p=$entry.patch
 $measured=[SpriteRegistration]::Measure((Resolve-Path -LiteralPath $entry.file).Path,$p[0],$p[1],$p[2],$p[3],$SearchRange,$Columns)
 [ordered]@{file=$entry.file;storage_path=$entry.storage_path;patch=$p;method='Rigid head/foot RGB template translation; no image edits or frame rescaling';frames=@(0..($Columns*2-1) | ForEach-Object {[ordered]@{frame=$_;dx=$measured[$_][0];dy=$measured[$_][1];rmse=$measured[$_][2]}})}
})
$results | ConvertTo-Json -Depth 8 | Set-Content -LiteralPath $Output -Encoding utf8
Write-Output "Registered $($results.Count) sheets. PNGs unchanged."
