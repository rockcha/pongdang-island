param([string]$Image,[int]$X=-1,[int]$Y=-1,[int]$Width=40,[int]$Height=50,[string]$Output,[int]$Columns=4)
Add-Type -AssemblyName System.Drawing
Add-Type -ReferencedAssemblies System.Drawing -TypeDefinition @'
using System;using System.Drawing;using System.Globalization;
public class MythicRegistration {
 public static string Run(string path,int px,int py,int pw,int ph,int columns){
  using(var b=new Bitmap(path)){
   if(px<0||py<0){
    int lx=b.Width,ly=b.Height,rx=0,ry=0;
    for(int y=0;y<b.Height/2;y+=2)for(int x=0;x<b.Width/columns;x+=2)if(b.GetPixel(x,y).A>=200){lx=Math.Min(lx,x);ly=Math.Min(ly,y);rx=Math.Max(rx,x);ry=Math.Max(ry,y);}
    double score=double.MinValue;
    for(int sy=ly+(ry-ly)/5;sy<ly+(ry-ly)*4/5;sy+=6)for(int sx=lx+(rx-lx)*55/100;sx<lx+(rx-lx)*85/100;sx+=6){
     double coverage=0;
     for(int y=sy-ph/2;y<sy+ph/2;y+=3)for(int x=sx-pw/2;x<sx+pw/2;x+=3)if(x>=0&&y>=0&&x<b.Width/columns&&y<b.Height/2&&b.GetPixel(x,y).A>=220)coverage++;
     coverage-=Math.Abs(sx-(lx+(rx-lx)*.75))*.03;
     if(coverage>score){score=coverage;px=sx-pw/2;py=sy-ph/2;}
    }
   }
   string rows="";
   for(int f=0;f<columns*2;f++){
    double fx=f%columns*b.Width/(double)columns,fy=f/columns*b.Height/2.0;
    int ox=(int)Math.Round(fx),oy=(int)Math.Round(fy);
    double best=double.MaxValue;int bx=0,by=0;
    for(int pass=0;pass<2;pass++){
    int cx=pass==0?0:bx,cy=pass==0?0:by,rx=pass==0?100:4,ry=pass==0?180:4,step=pass==0?4:1;
    for(int dy=cy-ry;dy<=cy+ry;dy+=step)for(int dx=cx-rx;dx<=cx+rx;dx+=step){
     double sum=0;int n=0;
     for(int y=py;y<py+ph;y+=3)for(int x=px;x<px+pw;x+=3){
      int tx=ox+x+dx,ty=oy+y+dy;
      if(tx<0||ty<0||tx>=b.Width||ty>=b.Height)continue;
      var a=b.GetPixel(x,y);if(a.A<220)continue;
      var c=b.GetPixel(tx,ty);
      sum+=Math.Abs(a.R-c.R)+Math.Abs(a.G-c.G)+Math.Abs(a.B-c.B)+Math.Abs(a.A-c.A);n++;
     }
     if(n>0&&sum/n<best){best=sum/n;bx=dx;by=dy;}
    }
    }
    if(f>0)rows+=",";
    rows+="{\"frame\":"+f+",\"dx\":"+(bx+ox-fx).ToString(CultureInfo.InvariantCulture)+",\"dy\":"+(by+oy-fy).ToString(CultureInfo.InvariantCulture)+",\"error\":"+best.ToString("F2",CultureInfo.InvariantCulture)+"}";
   }
   return "{\"width\":"+b.Width+",\"height\":"+b.Height+",\"patch\":["+px+","+py+","+pw+","+ph+"],\"frames\":["+rows+"]}";
  }
 }
}
'@
$result=[MythicRegistration]::Run((Resolve-Path -LiteralPath $Image),$X,$Y,$Width,$Height,$Columns)
[IO.File]::WriteAllText((Join-Path (Get-Location) $Output),$result)
$result
