const fs=require('fs'),sharp=require('sharp'),crypto=require('crypto');
const ids=['butterSteak','chickenSoup','duckPotatoStirFry','meatStew','chickenGratin','duckFriedRice'];
(async()=>{
 const files=[];
 for(const id of ids){
  const source='assets/ui/farm-meat-food-v25/source/'+id+'.png',runtime='public/farm/art/v25/goods/'+id+'.png';
  if(!fs.existsSync(source))continue;
  await sharp(source).trim({threshold:10}).resize(472,472,{fit:'contain',background:'#00000000'}).extend({top:20,bottom:20,left:20,right:20,background:'#00000000'}).png().toFile(runtime);
  files.push({id,source,runtime,width:512,height:512,sha256:crypto.createHash('sha256').update(fs.readFileSync(runtime)).digest('hex')});
 }
 fs.writeFileSync('tmp/farm-meat-food-v25-assets.json',JSON.stringify(files,null,2));
 console.log(files.map(f=>f.id).join(', '));
})();
