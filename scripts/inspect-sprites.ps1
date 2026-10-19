param(
 [string]$Root = 'assets/storage-upload',
 [string]$Output = 'sprite-audit.json',
 [ValidateSet(2,4)][int]$Columns = 2
)
# Read-only alpha bounds inspection. Does not resize or modify any PNG.
Add-Type -AssemblyName System.Drawing
Add-Type -ReferencedAssemblies System.Drawing -TypeDefinition @'
using System;
using System.Drawing;
using System.Drawing.Imaging;
using System.Runtime.InteropServices;
public static class SpriteBounds {
 public static int[][] Inspect(string path,int columns) {
  using(var source=new Bitmap(path))
  using(var bitmap=source.Clone(new Rectangle(0,0,source.Width,source.Height),PixelFormat.Format32bppArgb)) {
   var data=bitmap.LockBits(new Rectangle(0,0,bitmap.Width,bitmap.Height),ImageLockMode.ReadOnly,PixelFormat.Format32bppArgb);
   try {
    var bytes=new byte[Math.Abs(data.Stride)*data.Height];Marshal.Copy(data.Scan0,bytes,0,bytes.Length);
    var results=new int[columns*2+1][];results[0]=new[]{bitmap.Width,bitmap.Height};
    int w=bitmap.Width/columns,h=bitmap.Height/2;
    for(int frame=0;frame<columns*2;frame++) {
     int minX=w,minY=h,maxX=-1,maxY=-1,count=0;
     for(int y=0;y<h;y++)for(int x=0;x<w;x++) {
      int px=x+(frame%columns)*w,py=y+(frame/columns)*h;
      if(bytes[py*data.Stride+px*4+3]<32)continue;
      minX=Math.Min(minX,x);maxX=Math.Max(maxX,x);minY=Math.Min(minY,y);maxY=Math.Max(maxY,y);count++;
     }
     long leftY=0,rightY=0,leftCount=0,rightCount=0;
     int bw=Math.Max(0,maxX-minX+1);
     for(int y=minY;y<=maxY;y++)for(int x=minX;x<=maxX;x++){
      int alpha=bytes[(y+(frame/columns)*h)*data.Stride+(x+(frame%columns)*w)*4+3];
      if(alpha<32)continue;
      if(x<minX+bw*.3){leftY+=(long)y*alpha;leftCount+=alpha;}
      if(x>maxX-bw*.3){rightY+=(long)y*alpha;rightCount+=alpha;}
     }
     results[frame+1]=new[]{minX,minY,bw,Math.Max(0,maxY-minY+1),count,leftCount>0?(int)(1000*leftY/leftCount):0,rightCount>0?(int)(1000*rightY/rightCount):0};
    }
    return results;
   }finally{bitmap.UnlockBits(data);}
  }
 }
}
'@
$rootPath = (Resolve-Path -LiteralPath $Root).Path
$results = @(Get-ChildItem -LiteralPath $rootPath -Filter '*_sprite.png' -File -Recurse | ForEach-Object {
 $bounds = [SpriteBounds]::Inspect($_.FullName,$Columns)
 $cellWidth = $bounds[0][0]/$Columns
 $cellHeight = $bounds[0][1]/2
 $frames = @(1..($Columns*2) | ForEach-Object {
  $b=$bounds[$_]
  [ordered]@{frame=$_-1;x=$b[0];y=$b[1];width=$b[2];height=$b[3];widthRatio=[Math]::Round($b[2]/$cellWidth,4);heightRatio=[Math]::Round($b[3]/$cellHeight,4);alphaPixels=$b[4];leftAnchorY=$b[5]/1000;rightAnchorY=$b[6]/1000}
 })
 [ordered]@{file=$_.FullName.Substring((Get-Location).Path.Length+1).Replace('\','/');width=$bounds[0][0];height=$bounds[0][1];cellWidth=$cellWidth;cellHeight=$cellHeight;frames=$frames}
})
[ordered]@{alphaThreshold=32;note='Local files only; alpha bounds measure occupancy, not perceptual sharpness or current Storage contents.';sprites=$results} | ConvertTo-Json -Depth 8 | Set-Content -Encoding utf8 -LiteralPath $Output
Write-Output "Inspected $($results.Count) sheets. Report: $Output"
