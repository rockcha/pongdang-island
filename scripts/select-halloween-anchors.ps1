param([string]$Root='assets/storage-upload/new/20261023-212823',[string]$PreviewDirectory='artifacts/previews/halloween')
$ErrorActionPreference='Stop';Add-Type -AssemblyName System.Drawing
Add-Type -ReferencedAssemblies System.Drawing -TypeDefinition @'
using System;
using System.Drawing;
public static class HalloweenPatch {
 public static int[] Find(string path,int columns){
  using(var b=new Bitmap(path)){
   int cw=b.Width/columns,ch=b.Height/2,size=Math.Max(24,(int)(cw*.075));
   double best=-1;int bx=0,by=0;
   for(int y=(int)(ch*.18);y<ch*.68-size;y+=5)for(int x=(int)(cw*.58);x<cw*.9-size;x+=5){
    double sum=0,sum2=0;int n=0,opaque=0,dark=0;
    for(int dy=0;dy<size;dy+=3)for(int dx=0;dx<size;dx+=3){var c=b.GetPixel(x+dx,y+dy);n++;if(c.A<160)continue;opaque++;double v=(c.R+c.G+c.B)/3.0;sum+=v;sum2+=v*v;if(v<100)dark++;}
    if(opaque<n*.85||dark<n*.08||dark>n*.85)continue;
    double variance=sum2/opaque-Math.Pow(sum/opaque,2);
    if(variance>best){best=variance;bx=x;by=y;}
   }
   if(best<300)throw new Exception("No stable opaque contrast patch; choose manually: "+path);
   return new[]{bx,by,size,size};
  }
 }
}
'@
$m=Get-Content -LiteralPath ($Root+'/manifest.json') -Raw -Encoding UTF8|ConvertFrom-Json
$overrides=@{}
if(Test-Path -LiteralPath ($Root+'/anchor-overrides.json')){(Get-Content -LiteralPath ($Root+'/anchor-overrides.json') -Raw -Encoding UTF8|ConvertFrom-Json).PSObject.Properties|ForEach-Object{$overrides[$_.Name]=$_.Value}}
$four=@();$eight=@();$entries=@($m.items|Where-Object{$_.frames -gt 1 -and $_.spriteSource})
$rows=[int][Math]::Ceiling($entries.Count/4.0)
$contact=[Drawing.Bitmap]::new(1000,[Math]::Max(1,$rows)*280)
$g=[Drawing.Graphics]::FromImage($contact);$g.Clear([Drawing.Color]::FromArgb(242,233,220))
$font=[Drawing.Font]::new('Arial',10);$pen=[Drawing.Pen]::new([Drawing.Color]::Red,2)
for($i=0;$i -lt $entries.Count;$i++){
 $e=$entries[$i];$path=$Root+'/'+$e.sprite_sheet_path;$columns=if($e.frames -eq 8){4}else{2}
 $patch=if($overrides.ContainsKey($e.id)){[int[]]$overrides[$e.id]}else{[HalloweenPatch]::Find([IO.Path]::GetFullPath($path),$columns)}
 $entry=[ordered]@{file=$path;storage_path=$e.sprite_sheet_path;patch=$patch}
 if($e.frames -eq 8){$eight+=$entry}else{$four+=$entry}
 $bmp=[Drawing.Bitmap]::new([IO.Path]::GetFullPath($path));$cw=$bmp.Width/[double]$columns;$ch=$bmp.Height/2.0
 $x=($i%4)*250;$y=[Math]::Floor($i/4)*280;$factor=230/$cw
 $dst=[Drawing.RectangleF]::new($x+10,$y+10,230,230);$src=[Drawing.RectangleF]::new(0,0,$cw,$ch)
 $g.DrawImage($bmp,$dst,$src,[Drawing.GraphicsUnit]::Pixel);$bmp.Dispose()
 $g.DrawRectangle($pen,[single]($x+10+$patch[0]*$factor),[single]($y+10+$patch[1]*$factor),[single]($patch[2]*$factor),[single]($patch[3]*$factor))
 $g.DrawString(($e.id -replace '^halloween-',''),$font,[Drawing.Brushes]::Black,[single]($x+5),[single]($y+245))
}
$g.Dispose();$font.Dispose();$pen.Dispose()
[IO.Directory]::CreateDirectory([IO.Path]::GetFullPath($PreviewDirectory))|Out-Null
$target=[IO.Path]::GetFullPath($PreviewDirectory+'/anchor-patches.png')
$contact.Save($target,[Drawing.Imaging.ImageFormat]::Png);$contact.Dispose()
ConvertTo-Json -InputObject $four -Depth 6|Set-Content -LiteralPath ($Root+'/anchors-four.json') -Encoding UTF8
ConvertTo-Json -InputObject $eight -Depth 6|Set-Content -LiteralPath ($Root+'/anchors-eight.json') -Encoding UTF8
Write-Output ('Selected '+$entries.Count+' candidate patches. Inspect anchor-patches.png before accepting registration.')
