import fs from 'node:fs'
import {batch,items} from './prepare-hangang-refinement.mjs'
const read=p=>JSON.parse(fs.readFileSync(p,'utf8').replace(/^\uFEFF/,'')),manifest={status:'ready-for-verification',region_id:'hangang',tool:'built-in image_gen',items,assets:[],entries:[]}
for(const i of items){
 const record=read(`${batch}/sources/${i.id}-sprite.json`)
 manifest.assets.push({...record,id:i.id,path:i.sprite_sheet_path,type:'sprite',original:`sources/${i.id}-sprite.source`})
 if(i.frames===8)manifest.entries.push({id:i.id,kind:'fish',rarity:'mythic',frames:8,columns:4,storage_path:i.sprite_sheet_path,source:`sources/${i.id}-sprite.source`,prompt:record.prompt,referenceRoles:record.referenceRoles??{identity:i.thumbnail_path,placement:`sources/${i.id}-placement-guide.png`},facing_direction:'right'})
 if(i.compatibility_path)manifest.assets.push({id:i.id,path:i.compatibility_path,type:'compatibility-sprite',derivedFrom:i.sprite_sheet_path,method:'Lossless RGBA repack of the first four final poses'})
}
manifest.assets.push({id:'hangang-mago-creator',path:items[0].thumbnail_path,type:'thumbnail',derivedFrom:'assets/storage-upload/new/20261102-033000/fish/epic/hangang-mago-creator_v1_thumbnail.png',method:'Unchanged approved identity, copied into the mythic asset namespace'})
fs.writeFileSync(batch+'/manifest.json',JSON.stringify(manifest,null,2)+'\n')
fs.writeFileSync(batch+'/README.md',`# 한강 신화·유영 수정 배치\n\n마고와 붉은악마는 8동작, 해태·구미호·불가사리는 수평 유영 4동작으로 제작한다. 그림과 별개로 손·몸체에 붙는 벡터 효과를 사용한다. 원본과 실제 입력 역할·프롬프트는 sources와 manifest에 보존한다.\n\n마고는 각 동작을 개별 image_gen으로 생성하고 각 원본의 8% 여백을 먼저 검사한다. 모든 원본에 공통 캔버스와 단일 축소 배율을 적용해 4×2로 구성하며 개별 실루엣 크롭이나 동작별 확대는 하지 않는다. 나머지 시트도 원본 여백 검사를 통과한 뒤 불투명 얼굴 패치로 정렬한다. 알파를 포함한 RGBA를 유지한 정수 평행 이동만 PNG에 반영한다.\n\n정렬은 scripts/align-hangang-sprites.mjs --refinement, 독립 검사는 scripts/register-sprite-anchors.ps1의 -Exact -SearchRange 20으로 수행한다. 잔여 정렬은 scripts/refine-hangang-anchors.mjs --refinement를 사용하고 재측정한다. scripts/build-hangang-effect-layouts.mjs는 실제 최종 실루엣과 마고의 손 위치를 측정한다. scripts/preview-hangang-assets.mjs --refinement와 scripts/check-hangang-preview.mjs --refinement로 앞뒤 효과, 재생·반복·동작 줄이기와 모바일/데스크톱 표시를 검수한다.\n\n게시 후 경로는 불변이다. scripts/publish-hangang-refinement.mjs는 새 버전 파일만 기존 업로드 도구로 무손실 압축·업로드하고 공개 바이트를 SHA-256으로 대조한다. 업로드 후 PNG를 다시 생성하려면 새 버전 경로를 사용한다. DB 적용과 프런트엔드 배포는 업로드와 별도로 확인한다.\n`)
console.log(JSON.stringify({assets:manifest.assets.length,mythics:manifest.entries.length}))
