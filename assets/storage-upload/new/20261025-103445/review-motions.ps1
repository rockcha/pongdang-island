param([string]$Root='assets/storage-upload/new/20261025-103445',[string]$Output='artifacts/previews/pongi-expeditions')
$ErrorActionPreference='Stop';Add-Type -AssemblyName System.Drawing
$m=Get-Content -LiteralPath ($Root+'/manifest.json') -Raw -Encoding UTF8|ConvertFrom-Json
$anchors=Get-Content -LiteralPath ($Root+'/anchor-results-eight.json') -Raw -Encoding UTF8|ConvertFrom-Json
$areas=@{
 'pongi-mobile-treasure-salvager'=@(
  @{name='treasure';box=@(.34,.58,.28,.34)},@{name='steering';box=@(.75,.51,.12,.14)},@{name='lights';box=@(.30,.26,.08,.10)},@{name='propeller';box=@(.18,.42,.16,.17)}
 );
 'pongi-turtle-expedition'=@(
  @{name='rear-far';box=@(.14,.46,.20,.16)},@{name='rear-near';box=@(.15,.57,.20,.20)},@{name='front-near';box=@(.29,.65,.35,.25)},@{name='front-far';box=@(.72,.64,.20,.26)},@{name='flag';box=@(.29,.25,.23,.12)},@{name='telescope';box=@(.57,.32,.24,.15)},@{name='wave';box=@(.20,.34,.17,.18)}
 )
}
[IO.Directory]::CreateDirectory([IO.Path]::GetFullPath($Output))|Out-Null
$reports=@()
foreach($s in $m.items){
 $source=[Drawing.Bitmap]::new([IO.Path]::GetFullPath($Root+'/'+$s.sprite_sheet_path));$cell=[int]($source.Width/4)
 $a=$anchors|Where-Object{$_.storage_path -eq $s.sprite_sheet_path};$poses=@()
 for($f=0;$f -lt 8;$f++){
  $pose=[Drawing.Bitmap]::new($cell,$cell,[Drawing.Imaging.PixelFormat]::Format32bppArgb);$g=[Drawing.Graphics]::FromImage($pose);$g.Clear([Drawing.Color]::Transparent)
  $src=[Drawing.RectangleF]::new(($f%4)*$cell,[Math]::Floor($f/4)*$cell,$cell,$cell);$dst=[Drawing.RectangleF]::new(-$a.frames[$f].dx,-$a.frames[$f].dy,$cell,$cell)
  $g.DrawImage($source,$dst,$src,[Drawing.GraphicsUnit]::Pixel);$g.Dispose();$poses+=,$pose
 }
 $parts=$areas[$s.id];$contact=[Drawing.Bitmap]::new(1024,$parts.Count*128)
 $g=[Drawing.Graphics]::FromImage($contact);$g.Clear([Drawing.Color]::FromArgb(245,238,225));$font=[Drawing.Font]::new('Arial',10)
 foreach($part in $parts){
  $row=[array]::IndexOf($parts,$part);$b=$part.box
  $rect=[Drawing.Rectangle]::new([int]($b[0]*$cell),[int]($b[1]*$cell),[int]($b[2]*$cell),[int]($b[3]*$cell));$changes=@()
  for($f=0;$f -lt 8;$f++){
   $factor=[Math]::Min(120.0/$rect.Width,98.0/$rect.Height);$w=$rect.Width*$factor;$h=$rect.Height*$factor
   $dst=[Drawing.RectangleF]::new($f*128+(128-$w)/2,$row*128+24+(98-$h)/2,$w,$h)
   $g.DrawImage($poses[$f],$dst,$rect,[Drawing.GraphicsUnit]::Pixel);$g.DrawString(($part.name+' '+$f),$font,[Drawing.Brushes]::Black,[single]($f*128+3),[single]($row*128+4))
   $sum=0.0;$count=0
   for($y=$rect.Y;$y -lt $rect.Bottom;$y+=2){for($x=$rect.X;$x -lt $rect.Right;$x+=2){$a0=$poses[0].GetPixel($x,$y);$af=$poses[$f].GetPixel($x,$y);$sum+=[Math]::Pow($a0.R-$af.R,2)+[Math]::Pow($a0.G-$af.G,2)+[Math]::Pow($a0.B-$af.B,2)+[Math]::Pow($a0.A-$af.A,2);$count+=4}}
   $changes+=[Math]::Sqrt($sum/$count)
  }
  $reports+=[ordered]@{id=$s.id;part=$part.name;normalizedBox=$part.box;rmsAgainstFrame0=$changes}
 }
 $g.Dispose();$font.Dispose();$contact.Save([IO.Path]::GetFullPath($Output+'/motions-'+$s.id+'.png'),[Drawing.Imaging.ImageFormat]::Png);$contact.Dispose();$source.Dispose();foreach($pose in $poses){$pose.Dispose()}
}
$reports|ConvertTo-Json -Depth 7|Set-Content -LiteralPath ($Root+'/motion-regions.json') -Encoding UTF8
Write-Output 'Rendered registered component contact sheets; pixel differences require visual interpretation.'
