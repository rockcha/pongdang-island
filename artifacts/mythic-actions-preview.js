const luneaDetailedSwimPath = 'fish/mythic/lunea-mistmoon-goddess_swim8_sprite.png';
const sheets = [
    { id: 'lunea-mistmoon-goddess', aliases: ['lunea-mistmoon-goddess'], scale: 1.15, cell: 443.5, shifts: [[0, 0], [1, 0], [2, 1], [-7, 1], [-6, -36], [0, -36], [3, -36], [3, -36]] },
    { id: 'atlantean-sentinel', aliases: ['atlantean-sentinel', 'atlantean-sentinel-walk', 'atlantean-sentinel-standing'], scale: 1.04, cell: 443.5, shifts: [[0, 0], [-18.5, 0], [-36, 0], [-36.5, 0], [0, -13.5], [-18.5, -13.5], [-36, -13.5], [-35.5, -13.5]] },
    { id: 'pongi-explorer', aliases: ['pongi-explorer', 'pongi-explorer-cruise'], scale: 1, cell: 443.5, shifts: [[0, 0], [-5.5, 0], [-15, -1], [-21.5, 0], [0, -46.5], [-5.5, -45.5], [-14, -46.5], [-21.5, -45.5]] },
    { id: 'ancient-coral-giant-crab', aliases: ['ancient-coral-giant-crab', 'ancient-coral-giant-crab-walk'], scale: 1, cell: 443.5, shifts: [[0, 0], [-2.5, -1], [-2, 0], [-2.5, 0], [0, -28.5], [-0.5, -28.5], [-1, -28.5], [-2.5, -28.5]] },
    { id: 'dawn-narwhal', aliases: ['dawn-narwhal'], scale: 1, cell: 443.5, shifts: [[0, 0], [0.5, 0], [1, 0], [-0.5, 0], [0, -54.5], [-0.5, -53.5], [1, -52.5], [0.5, -52.5]] },
    { id: 'seila-white-sail-guardian', aliases: ['seila-white-sail-guardian'], scale: 1.2, cell: 443.5, shifts: [[0, 0], [8.5, -1], [-2, 0], [-0.5, 0], [3, -6.5], [11.5, -6.5], [-4, -6.5], [-2.5, -9.5]] },
];
const mythicDetailedPaths = sheets.map(s => `fish/mythic/${s.id}_swim8_sprite.png`);
const sheetFor = (path) => sheets.find(s => path === `fish/mythic/${s.id}_swim8_sprite.png`);
function mythicSwimAsset(path, rarity) {
    if (rarity !== 'mythic')
        return null;
    const sheet = sheets.find(s => s.aliases.some(alias => path === `fish/mythic/${alias}_sprite.png`));
    return sheet ? { path: `fish/mythic/${sheet.id}_swim8_sprite.png`, url: `/aquarium/swim/${sheet.id}_swim8_sprite.png` } : null;
}
function mythicSwimFrame(path, time, seed, reduced = false) {
    if (!sheetFor(path))
        return null;
    // A short glance is part of the swim loop, independent of travel direction.
    if (reduced)
        return 0;
    const phase = ((time + seed / 1000000) % 6 + 6) % 6;
    return phase < 10 / 3 ? Math.floor(phase * 3) % 4 : Math.min(7, Math.floor((phase - 10 / 3) * 3));
}
function mythicSwimLayout(path, frame = 0) {
    const sheet = sheetFor(path);
    if (!sheet)
        return null;
    // Chest patch registration against frame 0, in source-cell pixels.
    // Hair/tail extents and the head glance must not determine the body anchor.
    const [x, y] = sheet.shifts[frame] ?? [0, 0];
    return { originX: .5 + x / sheet.cell, originY: .5 + y / sheet.cell, scale: sheet.scale };
}

let manual=null,flip=false,move=false;
document.getElementById('auto').onclick=()=>manual=null;
document.getElementById('flip').onclick=()=>flip=!flip;
document.getElementById('move').onclick=()=>move=!move;
document.getElementById('frame').oninput=e=>manual=Number(e.target.value);
const names=['Lunea','Atlantean sentinel','Pongi explorer','Ancient coral giant crab','Dawn narwhal','Seila'];
const cards=mythicDetailedPaths.map((path,i)=>{const section=document.createElement('section'),title=document.createElement('p'),canvas=document.createElement('canvas'),image=new Image();title.textContent=names[i];canvas.width=640;canvas.height=480;section.append(title,canvas);document.getElementById('cards').append(section);image.src='../public/aquarium/swim/'+path.split('/').at(-1);return{path,canvas,image}});
function tick(ms){for(const card of cards){const f=manual??mythicSwimFrame(card.path,ms/1000,0),l=mythicSwimLayout(card.path,f),c=card.canvas.getContext('2d'),size=220*l.scale;c.setTransform(2,0,0,2,0,0);c.clearRect(0,0,320,240);c.save();c.translate(move&&!card.path.includes('atlantean-sentinel')?100+((ms/1000*12)%120):160,120);c.scale(flip?-1:1,1);c.globalAlpha=1;c.drawImage(card.image,f%4*card.image.width/4,Math.floor(f/4)*card.image.height/2,card.image.width/4,card.image.height/2,-size*l.originX,-size*l.originY,size,size);c.restore()}document.getElementById('phase').textContent=manual===null?((ms/1000)%6).toFixed(1)+' / 6s':(manual+1)+'/8';requestAnimationFrame(tick)}
Promise.all(cards.map(c=>c.image.decode())).then(()=>{document.getElementById('status').textContent='';requestAnimationFrame(tick)}).catch(()=>document.getElementById('status').textContent='Image load failed');
