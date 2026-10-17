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

const image=new Image();image.src='../public/aquarium/swim/lunea-mistmoon-goddess_swim8_sprite.png';
let manual=null,flipped=false,moving=false;
document.getElementById('reverse').onclick=()=>flipped=!flipped;
document.getElementById('auto').onclick=()=>manual=null;
document.getElementById('move').onclick=()=>moving=!moving;
document.getElementById('phase').oninput=e=>manual=Number(e.target.value);
function tick(ms){const f=manual??mythicSwimFrame(luneaDetailedSwimPath,ms/1000,0),c=document.getElementById('preview').getContext('2d');c.setTransform(2,0,0,2,0,0);c.clearRect(0,0,400,320);const layout=mythicSwimLayout(luneaDetailedSwimPath,f),size=280*layout.scale,x=moving?100+(ms/1000*12)%200:200;c.save();c.translate(x,160);c.scale(flipped?-1:1,1);c.globalAlpha=1;c.drawImage(image,(f%4)*image.width/4,Math.floor(f/4)*image.height/2,image.width/4,image.height/2,-size*layout.originX,-size*layout.originY,size,size);c.restore();document.getElementById('frame-label').textContent=(f+1)+'/8';requestAnimationFrame(tick)}
image.decode().then(()=>{document.getElementById('status').textContent='';requestAnimationFrame(tick)}).catch(()=>document.getElementById('status').textContent='Image load failed');
