Add-Type -AssemblyName System.Drawing
$root='assets/storage-upload/new/20261017-153200'
Add-Type -ReferencedAssemblies System.Drawing -TypeDefinition @'
using System;using System.Drawing;using System.Drawing.Imaging;using System.Runtime.InteropServices;
public class IceAlphaAudit {
 public static string Run(string path,int cols,int rows){using(var source=new Bitmap(path))using(var b=new Bitmap(source.Width,source.Height,PixelFormat.Format32bppArgb)){
  using(var g=Graphics.FromImage(b)){g.DrawImageUnscaled(source,0,0);}
  var bits=b.LockBits(new Rectangle(0,0,b.Width,b.Height),ImageLockMode.ReadOnly,PixelFormat.Format32bppArgb);
  byte[] pixels=new byte[bits.Stride*b.Height];Marshal.Copy(bits.Scan0,pixels,0,pixels.Length);b.UnlockBits(bits);
  int cw=b.Width/cols,ch=b.Height/rows;string frames="";
  for(int f=0;f<cols*rows;f++){int ox=f%cols*cw,oy=f/cols*ch,lx=cw,ly=ch,rx=-1,ry=-1,edge=0;
   for(int y=0;y<ch;y++)for(int x=0;x<cw;x++){if(pixels[(oy+y)*bits.Stride+(ox+x)*4+3]<16)continue;
    lx=Math.Min(lx,x);ly=Math.Min(ly,y);rx=Math.Max(rx,x);ry=Math.Max(ry,y);if(x==0||y==0||x==cw-1||y==ch-1)edge++;}
   if(f>0)frames+=",";frames+="{\"frame\":"+f+",\"bounds\":["+lx+","+ly+","+rx+","+ry+"],\"edgePixels\":"+edge+"}";}
  return "{\"width\":"+b.Width+",\"height\":"+b.Height+",\"cellWidth\":"+cw+",\"cellHeight\":"+ch+",\"frames\":["+frames+"]}";
 }}
}
'@
$reports=@()
foreach($file in Get-ChildItem -LiteralPath $root -Recurse -Filter '*.png'){
 $sprite=$file.BaseName.EndsWith('_sprite');$cols=if(!$sprite){1}elseif($file.FullName.Contains('\mythic\')){4}else{2};$rows=if($sprite){2}else{1}
 $r=[IceAlphaAudit]::Run($file.FullName,$cols,$rows)|ConvertFrom-Json
 $r|Add-Member -NotePropertyName file -NotePropertyValue ($file.FullName.Substring((Resolve-Path $root).Path.Length+1).Replace('\','/'))
 $reports+=$r
}
[IO.File]::WriteAllText((Join-Path (Get-Location) "$root/alpha-audit.json"),($reports|ConvertTo-Json -Depth 8))
foreach($r in $reports){
 $edges=($r.frames|Measure-Object -Property edgePixels -Sum).Sum
 if($edges -gt 0 -or ($r.file.EndsWith('_sprite.png') -and $r.cellWidth -ne $r.cellHeight)){"CHECK $($r.file) dimensions=$($r.width)x$($r.height) edge=$edges"}
}
"Inspected $($reports.Count) images."
