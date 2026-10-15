// Frame registration measured from each sheet's rigid head/body (or nautilus shell).
// Coordinates are in a 96x96 sampling grid, relative to each frame's center.
const layouts:Record<string,readonly (readonly [number,number,number])[]>={
 'fish/normal/mistbread-sponge_sprite.png':[[0,0,1],[-5,0,1],[0,-8,1],[-3,-8,1]],
 'fish/normal/whisper-pipefish_sprite.png':[[0,0,1],[-1,0,1],[0,-8,1],[-1,-8,1]],
 'fish/normal/dream-thread-worm_sprite.png':[[0,0,1],[-1,0,1.02],[0,-8,1],[0,-8,1]],
 'fish/rare/mist-whisker-catfish_sprite.png':[[0,0,1],[-3,0,.98],[0,-12,1],[-4,-12,1]],
 'fish/rare/moonshadow-flounder_sprite.png':[[0,0,1],[-5,0,1],[1,-6,.96],[-5,-7,1]],
 'fish/epic/lunea-knight_sprite.png':[[0,0,1],[-2,0,1],[0,-2,1],[-2,-2,1]],
 'fish/epic/lunea-archivist_sprite.png':[[0,0,1],[1,0,1],[0,-6,1],[1,-6,1]],
 'fish/mythic/lunea-mistmoon-goddess_sprite.png':[[0,0,1],[-1,0,1],[0,-4,1],[1,-4,.94]],
 'fish/epic/sunwave-shark-glide_sprite.png':[[0,0,1],[-2,0,1],[1,-7,.96],[-2,-7,1]],
 'fish/epic/wavefin-whale-glide_sprite.png':[[0,0,1],[-3,0,1],[0,-14,1],[-3,-14,1]],
 'fish/mythic/pongi-explorer-cruise_sprite.png':[[0,0,1],[-3,0,1],[0,-6,.98],[-2,-5,.96]],
 'fish/epic/pongdang-native-shark_sprite.png':[[0,0,1],[-7,0,1],[0,-12,1],[-7,-12,1]],
 'fish/epic/pongdang-native-whale_sprite.png':[[0,0,1],[0,0,1],[0,-12,1],[0,-12,1]],
 'fish/epic/sunwave-shark_sprite.png':[[0,0,1],[-1,0,1],[1,-16,.94],[0,-16,.98]],
 'fish/epic/wavefin-whale_sprite.png':[[0,0,1],[-6,0,.98],[1,-8,.96],[-7,-7,.98]],
 'fish/epic/pongdang-shark_sprite.png':[[0,0,1],[0,0,.96],[2,-5,.94],[1,-5,.96]],
 'fish/epic/pongdang-whale_sprite.png':[[0,0,1],[-1,1,.94],[3,-17,.94],[0,-17,.98]],
 'fish/mythic/pongi-explorer_sprite.png':[[0,0,1],[0,0,1],[0,-4,1],[0,-4,1]],
}

export function swimFrameLayout(path:string,frame:number){
 const [x,y,scale]=layouts[path]?.[frame]??[0,0,1]
 return {originX:.5+x/96,originY:.5+y/96,scale:1/scale}
}
