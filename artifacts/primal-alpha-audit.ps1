Add-Type -AssemblyName System.Drawing
Add-Type -ReferencedAssemblies System.Drawing -TypeDefinition @'
using System;using System.Drawing;
public class PrimalAlphaAudit {
 public static string Run(string path,int cols,int rows){
  using(var b=new Bitmap(path)){
   int cw=b.Width/cols,ch=b.Height/rows;string frames="";
   for(int f=0;f<cols*rows;f++){
    int ox=f%cols*cw,oy=f/cols*ch,lx=cw,ly=ch,rx=-1,ry=-1,edge=0;
    for(int y=0;y<ch;y++)for(int x=0;x<cw;x++){
     if(b.GetPixel(ox+x,oy+y).A<16)continue;
     lx=Math.Min(lx,x);ly=Math.Min(ly,y);rx=Math.Max(rx,x);ry=Math.Max(ry,y);
     if(x==0||y==0||x==cw-1||y==ch-1)edge++;
    }
    if(f>0)frames+=",";
    frames+="{\"frame\":"+f+",\"bounds\":["+lx+","+ly+","+rx+","+ry+"],\"edgePixels\":"+edge+"}";
   }
   return "{\"width\":"+b.Width+",\"height\":"+b.Height+",\"cellWidth\":"+cw+",\"cellHeight\":"+ch+",\"frames\":["+frames+"]}";
  }
 }
}
'@
$root='assets/storage-upload/new/20261017-135100';$reports=@()
foreach($file in Get-ChildItem -LiteralPath $root -Recurse -Filter '*.png'){
 $sprite=$file.BaseName.EndsWith('_sprite');$cols=if(!$sprite){1}elseif($file.FullName.Contains('\mythic\')){4}else{2};$rows=if($sprite){2}else{1}
 $r=[PrimalAlphaAudit]::Run($file.FullName,$cols,$rows)|ConvertFrom-Json
 $r|Add-Member -NotePropertyName file -NotePropertyValue ($file.FullName.Substring((Resolve-Path $root).Path.Length+1).Replace('\','/'))
 $reports+=$r
}
[IO.File]::WriteAllText((Join-Path (Get-Location) "$root/alpha-audit.json"),($reports|ConvertTo-Json -Depth 8))
$reports|ForEach-Object{if(($_.frames|Measure-Object -Property edgePixels -Sum).Sum -gt 0){"EDGE: $($_.file)"}}
"Inspected $($reports.Count) PNGs (alpha >=16)."
