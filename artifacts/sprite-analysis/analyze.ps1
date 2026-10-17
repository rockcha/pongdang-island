Add-Type -AssemblyName System.Drawing
Add-Type -ReferencedAssemblies System.Drawing -TypeDefinition @'
using System;
using System.Drawing;
using System.Drawing.Imaging;
using System.Runtime.InteropServices;
public static class QualityProbe {
 public static object[] Inspect(string path) {
  using(var src=new Bitmap(path))
  using(var bmp=src.Clone(new Rectangle(0,0,src.Width,src.Height),PixelFormat.Format32bppArgb)){
   var d=bmp.LockBits(new Rectangle(0,0,bmp.Width,bmp.Height),ImageLockMode.ReadOnly,PixelFormat.Format32bppArgb);
   try{
    var p=new byte[Math.Abs(d.Stride)*d.Height];Marshal.Copy(d.Scan0,p,0,p.Length);
    int w=bmp.Width/2,h=bmp.Height/2;var result=new object[12];int k=0;
    for(int f=0;f<4;f++)foreach(int t in new int[]{32,128,240}){
     int x0=w,y0=h,x1=-1,y1=-1,n=0,semi=0;
     for(int y=0;y<h;y++)for(int x=0;x<w;x++){
      int a=p[(y+(f/2)*h)*d.Stride+(x+(f%2)*w)*4+3];
      if(a>=t){n++;x0=Math.Min(x0,x);y0=Math.Min(y0,y);x1=Math.Max(x1,x);y1=Math.Max(y1,y);}
      if(a>0&&a<240)semi++;
     }
     result[k++]=new int[]{f,t,x0,y0,x1-x0+1,y1-y0+1,n,semi,w,h};
    }return result;
   }finally{bmp.UnlockBits(d);}
  }
 }
}
'@
$root=Join-Path (Get-Location) 'artifacts/sprite-analysis'
$catalog=Get-Content -Raw -Encoding UTF8 (Join-Path $root 'catalog.json')|ConvertFrom-Json
$data=@()
$board=New-Object System.Drawing.Bitmap(1440,1200)
$g=[System.Drawing.Graphics]::FromImage($board)
$g.Clear([System.Drawing.Color]::FromArgb(22,72,83))
$font=New-Object System.Drawing.Font('Arial',11)
$small=New-Object System.Drawing.Font('Arial',9)
$i=0
foreach($s in $catalog.species){
 $path=Join-Path $root ('remote/'+$s.id+'-sprite.png')
 $img=[System.Drawing.Bitmap]::FromFile($path)
 $frames=@([QualityProbe]::Inspect($path)|ForEach-Object{[ordered]@{frame=$_[0];alphaThreshold=$_[1];x=$_[2];y=$_[3];width=$_[4];height=$_[5];alphaPixels=$_[6];semiTransparentPixels=$_[7];cellWidth=$_[8];cellHeight=$_[9];visibleWidthCss=[Math]::Round($_[4]/$_[8]*$s.size,2);visibleHeightCss=[Math]::Round($_[5]/$_[9]*$s.size,2)}})
 $data+=[ordered]@{id=$s.id;size=$s.size;sheetWidth=$img.Width;sheetHeight=$img.Height;bytes=(Get-Item $path).Length;sha256=(Get-FileHash -Algorithm SHA256 $path).Hash;frames=$frames}
 $x=$i*360
 $g.DrawString($s.id,$font,[System.Drawing.Brushes]::White,$x+8,10)
 $g.DrawString('Source frame - scaled uniformly for overview',$small,[System.Drawing.Brushes]::White,$x+8,35)
 $g.InterpolationMode=[System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
 $g.DrawImage($img,[System.Drawing.Rectangle]::new($x+10,65,340,340),0,0,$img.Width/2,$img.Height/2,[System.Drawing.GraphicsUnit]::Pixel)
 $g.DrawString(('Current canvas: '+$s.size+' CSS pixels'),$small,[System.Drawing.Brushes]::White,$x+8,420)
 $native=New-Object System.Drawing.Bitmap($s.size,$s.size)
 $ng=[System.Drawing.Graphics]::FromImage($native);$ng.Clear([System.Drawing.Color]::FromArgb(22,72,83));$ng.InterpolationMode=[System.Drawing.Drawing2D.InterpolationMode]::Bilinear
 $ng.DrawImage($img,[System.Drawing.Rectangle]::new(0,0,$s.size,$s.size),0,0,$img.Width/2,$img.Height/2,[System.Drawing.GraphicsUnit]::Pixel);$ng.Dispose()
 $g.DrawImageUnscaled($native,$x+10,445)
 $g.DrawString('Same low-resolution draw enlarged 2x',$small,[System.Drawing.Brushes]::White,$x+8,590)
 $g.InterpolationMode=[System.Drawing.Drawing2D.InterpolationMode]::NearestNeighbor
 $g.DrawImage($native,[System.Drawing.Rectangle]::new($x+10,615,$s.size*2,$s.size*2),0,0,$s.size,$s.size,[System.Drawing.GraphicsUnit]::Pixel)
 $g.DrawString('2x render target simulation (same source / CSS size)',$small,[System.Drawing.Brushes]::White,$x+8,900)
 $g.InterpolationMode=[System.Drawing.Drawing2D.InterpolationMode]::Bilinear
 $g.DrawImage($img,[System.Drawing.Rectangle]::new($x+10,925,$s.size*2,$s.size*2),0,0,$img.Width/2,$img.Height/2,[System.Drawing.GraphicsUnit]::Pixel)
 $native.Dispose();$img.Dispose();$i++
}
$g.Dispose();$board.Save((Join-Path $root 'comparison.png'),[System.Drawing.Imaging.ImageFormat]::Png);$board.Dispose()
$data|ConvertTo-Json -Depth 8|Set-Content -Encoding UTF8 (Join-Path $root 'measurements.json')
$data|ForEach-Object{$f=$_.frames|Where-Object{ $_.frame -eq 0 -and $_.alphaThreshold -eq 32};[pscustomobject]@{id=$_.id;sheet="$($_.sheetWidth)x$($_.sheetHeight)";size=$_.size;bounds="$($f.width)x$($f.height)";visible="$($f.visibleWidthCss)x$($f.visibleHeightCss)"}}
