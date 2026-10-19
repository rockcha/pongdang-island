param([string]$Root='assets/storage-upload/new/20261019-121432')
# Inspect pixels and register one stationary head/body patch. Never crop or rescale individual frames.
Add-Type -AssemblyName System.Drawing
Add-Type -ReferencedAssemblies System.Drawing -TypeDefinition @'
using System;
using System.Collections.Generic;
using System.Drawing;
using System.Drawing.Imaging;
using System.Runtime.InteropServices;
public static class SirenRegistration {
 public static object Inspect(string path,int cols,double ax,double ay) {
  using(var source=new Bitmap(path))using(var bitmap=source.Clone(new Rectangle(0,0,source.Width,source.Height),PixelFormat.Format32bppArgb)){
   int w=bitmap.Width/cols,h=bitmap.Height/2;
   var data=bitmap.LockBits(new Rectangle(0,0,bitmap.Width,bitmap.Height),ImageLockMode.ReadOnly,PixelFormat.Format32bppArgb);
   byte[] bytes=new byte[Math.Abs(data.Stride)*bitmap.Height];Marshal.Copy(data.Scan0,bytes,0,bytes.Length);int stride=data.Stride;bitmap.UnlockBits(data);
   var bounds=new int[cols*2][];double extent=0;
   for(int f=0;f<cols*2;f++){
    int l=w,t=h,r=-1,b=-1;
    for(int y=0;y<h;y++)for(int x=0;x<w;x++){int i=(y+(f/cols)*h)*stride+(x+(f%cols)*w)*4;if(bytes[i+3]<32)continue;l=Math.Min(l,x);t=Math.Min(t,y);r=Math.Max(r,x);b=Math.Max(b,y);}
    bounds[f]=new[]{l,t,r-l+1,b-t+1};extent=Math.Max(extent,Math.Max((r-l+1)/(double)w,(b-t+1)/(double)h));
   }
   var first=bounds[0];int cx=(int)(first[0]+ax*first[2]),cy=(int)(first[1]+ay*first[3]);int radius=Math.Max(14,w/15);
   var samples=new List<int[]>();
   for(int y=Math.Max(0,cy-radius);y<Math.Min(h,cy+radius);y+=4)for(int x=Math.Max(0,cx-radius);x<Math.Min(w,cx+radius);x+=4){int i=y*stride+x*4;if(bytes[i+3]>180)samples.Add(new[]{x,y,bytes[i],bytes[i+1],bytes[i+2],bytes[i+3]});}
   var shifts=new double[cols*2][];shifts[0]=new double[]{0,0};var scores=new double[cols*2];
   for(int f=1;f<cols*2;f++){
    long best=long.MaxValue;int bx=0,by=0,range=Math.Max(30,w/6);
    for(int dy=-range;dy<=range;dy+=2)for(int dx=-range;dx<=range;dx+=2){long score=0;foreach(var s in samples){int x=s[0]+dx,y=s[1]+dy;if(x<0||x>=w||y<0||y>=h){score+=1020;continue;}int i=(y+(f/cols)*h)*stride+(x+(f%cols)*w)*4;score+=Math.Abs(bytes[i]-s[2])+Math.Abs(bytes[i+1]-s[3])+Math.Abs(bytes[i+2]-s[4])+2*Math.Abs(bytes[i+3]-s[5]);}if(score<best){best=score;bx=dx;by=dy;}}
    shifts[f]=new double[]{bx,by};scores[f]=samples.Count>0?best/(double)samples.Count:9999;
   }
   return new {width=bitmap.Width,height=bitmap.Height,cell=w,extent=extent,patch=new[]{cx,cy,radius},samples=samples.Count,shifts=shifts,scores=scores,bounds=bounds};
  }
 }
}
'@
$manifest=Get-Content -Raw -Encoding UTF8 'assets/siren/manifest.json' | ConvertFrom-Json
$results=@()
foreach($job in $manifest.sprites){
 if(!(Test-Path -LiteralPath $job.path)){continue}
 $ax=.72;$ay=.3
 if($job.id -match 'hippocampus|golden-seahorse'){$ax=.7;$ay=.12}
 if($job.id -match 'athena-cuttlefish'){$ax=.6;$ay=.25}
 if($job.id -match 'gorgone'){$ax=.6;$ay=.25}
 if($job.id -match 'three-fates'){$ax=.5;$ay=.55}
 if($job.id -match 'poseidon-chariot'){$ax=.35;$ay=.6}
 if($job.id -match 'scylla-tentacle'){$ax=.26;$ay=.78}
 # The flowing wing changes shape; register Siren's face instead.
 if($job.id -match 'last-song'){$ax=.91;$ay=.34}
 if($job.id -match 'six-shadows'){$ax=.45;$ay=.65}
 $audit=[SirenRegistration]::Inspect((Join-Path (Get-Location) $job.path),[int]$job.columns,$ax,$ay)
 if($job.id -eq 'siren-siren-last-song'){
  # Inspect uses integer cells; the actual renderer samples 443.5px cells.
  for($frame=0;$frame -lt 8;$frame++){
   $audit.shifts[$frame][0]-=($frame%4)*.5
   $audit.shifts[$frame][1]-=[Math]::Floor($frame/4)*.5
  }
 }
 $results+=@{id=$job.id;storage_path=$job.storage_path;local_path=$job.path;audit=$audit}
}
$results | ConvertTo-Json -Depth 12 | Set-Content -Encoding UTF8 -LiteralPath (Join-Path $Root 'registration.json')
Write-Output "Registered $($results.Count) sheets without changing image pixels"
