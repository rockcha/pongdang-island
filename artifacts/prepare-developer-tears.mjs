import {readFileSync,writeFileSync,mkdirSync,copyFileSync} from 'node:fs'
import {createHash} from 'node:crypto'
const source="C:\\Users\\user\\.codex\\generated_images\\01a16e8e-3f48-7971-b592-5b6efdd9161d\\exec-593bf0e5-b353-49cc-8f0b-126fc65ed085.png"
const prompt="Use case: stylized-concept. Asset: single common-rarity trash collectible thumbnail for a cozy Korean fishing game, named 'a bottle containing the developer's tears'. Reference image is STYLE ONLY: warm cute cartoon proportions, crisp dark-brown outlines, soft warm cel shading and readable small-game-icon silhouette. Do not copy the otter, fishing line, hook, fur or starfish. Draw one small squat worn clear turquoise glass bottle with a simple cork stopper, half filled with pale blue tears. A tiny curled blank paper note is tied at its neck with plain twine; a single blue teardrop pictogram on the paper, NO letters or writing. A few subtle glass scuffs and tiny sediment grains show this is a cheap discarded bottle, not a magical treasure. Clear thick outline and simplified forms, attractive restrained aqua and cream palette. No face, no eyes, no characters, no glow, no jewels, no sparkles, no scenery, no surrounding water, no UI, no text, no labels with words, no shadow backdrop. Center full bottle with safe transparent margins on every side; single static object, not a sprite sheet. True transparent alpha background."
const stamp=new Date(Date.now()+9*3600000).toISOString().slice(0,19).replaceAll('-','').replace('T','-').replaceAll(':','')
const root='assets/storage-upload/new/'+stamp
const local='trash/normal/developer-tears-bottle_thumbnail.png'
mkdirSync(root+'/trash/normal',{recursive:true})
copyFileSync(source,root+'/'+local)
const bytes=readFileSync(root+'/'+local)
writeFileSync(root+'/manifest.json',JSON.stringify({tool:'built-in image_gen',reference_image:'assets/references/collectible-style/common-rare-pongi.png',reference_role:'style only',prompt,generated_source:source,items:[{id:'developer-tears-bottle',kind:'trash',rarity:'common',sell_price:5,movement_type:'fixed',swim_y_min:.84,swim_y_max:.94,travel_direction:'both',flip_with_direction:false,thumbnail:local,sha256:createHash('sha256').update(bytes).digest('hex'),width:bytes.readUInt32BE(16),height:bytes.readUInt32BE(20)}]},null,2)+'\n')
writeFileSync(root+'/README.md','# 개발자의 눈물이 담긴 병\n\n사용자 지정 판매가 5골드인 일반 쓰레기. 기존 일반 유리병과 같은 공용 서식지를 사용하며, 어항에서는 바닥 부근에 정적으로 놓인다. fixed 이동 유형을 명시하고, trash의 기존 DB 제약을 만족하는 양의 speed 값은 실제 이동에 사용하지 않는다.\n\n생성 도구·스타일 참고·최종 프롬프트·파일 경로는 manifest.json에 기록한다. 업로드는 기존 storage:upload 명령으로 수행하고 공개 다운로드 해시를 대조한다. 이미지 업로드 뒤 대상 종만 포함한 CLI migration을 적용한다.\n')
const path='supabase/catalog/catalog.json',catalog=JSON.parse(readFileSync(path,'utf8'))
if(catalog.collectible_species.some(s=>s.id==='developer-tears-bottle'))throw Error('Species already registered')
const bottle=catalog.collectible_species.find(s=>s.id==='glass-bottle')
catalog.collectible_species.push({...bottle,id:'developer-tears-bottle',name:'개발자의 눈물이 담긴 병',description:'밤샘 디버깅 끝에 한 방울씩 모인 개발자의 눈물. 병은 제법 묵직하지만, 감정 노동은 판매가에 포함되지 않았다.',sell_price:5,thumbnail_path:local,movement_type:'fixed',swim_y_min:'0.84',swim_y_max:'0.94',speed:'0.001',size:36})
catalog.collectible_species.sort((a,b)=>a.id.localeCompare(b.id))
for(const h of catalog.collectible_habitats.filter(h=>h.species_id==='glass-bottle'))catalog.collectible_habitats.push({...h,species_id:'developer-tears-bottle'})
catalog.collectible_habitats.sort((a,b)=>a.species_id.localeCompare(b.species_id)||a.region_id.localeCompare(b.region_id))
writeFileSync(path,JSON.stringify(catalog,null,2)+'\n')
writeFileSync('artifacts/developer-tears-batch.json',JSON.stringify({root},null,2)+'\n')
console.log({root,id:'developer-tears-bottle',habitats:catalog.collectible_habitats.filter(h=>h.species_id==='developer-tears-bottle').length})
