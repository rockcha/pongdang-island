import sharedCreatureLayouts from './shared-creature-frame-layouts.json'
import nyamnyamLayouts from './nyamnyam-frame-layouts.json'
import oceanCreatureLayouts from './ocean-creature-frame-layouts.json'
import sharedExpansionLayouts from './shared-expansion-frame-layouts.json'
import commonFuelLayouts from './common-fuel-frame-layouts.json'
import sharedCollectibleLayouts from './shared-collectible-frame-layouts.json'
import dreamabyssLayouts from './dreamabyss-frame-layouts.json'
import pongdangLayouts from './pongdang-frame-layouts.json'
import scrapisleLayouts from './scrapisle-frame-layouts.json'
import cloudferryLayouts from './cloudferry-frame-layouts.json'
import bluegroveLayouts from './bluegrove-frame-layouts.json'
import primalLayouts from './primal-frame-layouts.json'
import whitenightLayouts from './whitenight-frame-layouts.json'
import mukhyangLayouts from './mukhyang-frame-layouts.json'
import sirenLayouts from './siren-frame-layouts.json'
import reviewedLayouts from './reviewed-frame-layouts.json'
import halloweenLayouts from './halloween-frame-layouts.json'
import plunderLayouts from './plunder-frame-layouts.json'
import sharedWondersLayouts from './shared-wonders-frame-layouts.json'
import mechsanctumLayouts from './mechsanctum-frame-layouts.json'
const registeredLayouts:Record<string,{cell:number;scale?:number;shifts:number[][]}>={...mechsanctumLayouts,...sharedWondersLayouts,...plunderLayouts,...oceanCreatureLayouts,...nyamnyamLayouts,...dreamabyssLayouts,...sharedCreatureLayouts,...sharedCollectibleLayouts,...sharedExpansionLayouts,...commonFuelLayouts,...pongdangLayouts,...bluegroveLayouts,...primalLayouts,...whitenightLayouts,...cloudferryLayouts,...scrapisleLayouts,...mukhyangLayouts,...sirenLayouts,...halloweenLayouts}
// Frame registration measured from each sheet's rigid head/body (or nautilus shell).
// Coordinates are in a 96x96 sampling grid, relative to each frame's center.
const layouts:Record<string,readonly (readonly [number,number,number])[]>={
 "decorations/epic/lunea-record-shelf_sprite.png":[[0,0,1],[-3.981,0,1],[0,-3.981,1],[-3.981,-3.981,1]],
 "decorations/rare/sleeping-mini-shipwreck_sprite.png":[[0,0,1],[-3.981,0.153,1],[0,-5.971,1],[-3.828,-5.971,1]],
 "decorations/rare/first-coral-cradle_sprite.png":[[0,0,1],[-4.134,0,1],[0,-7.043,1],[-3.981,-7.349,1]],
 "decorations/rare/dream-keeping-well_sprite.png":[[0,0,1],[-1.531,0,1],[0,-4.593,1],[-1.225,-4.746,1]],
 "decorations/rare/coral-house_sprite.png":[[0,0,1],[-4.287,0,1],[0.306,-8.268,1],[-3.522,-7.962,1]],
 "decorations/rare/moonlit-jellyfish-lantern_sprite.png":[[0,0,1],[-4.44,0,1],[0.306,-0.612,1],[-4.44,-0.612,1]],
 "decorations/normal/seashell-pinwheel_sprite.png":[[0,0,1],[-11.943,0,1],[0,-3.215,1],[-11.636,-3.215,1]],
 "decorations/rare/tiny-reef-carousel_sprite.png":[[0,0,1],[-0.919,0,1],[0,-1.225,1],[-1.072,-1.225,1]],
 "decorations/normal/pearl-bearing-clam_sprite.png":[[0,0,1],[-5.053,0,1],[-0.153,-11.177,1],[-4.746,-11.33,1]],
 "decorations/rare/coral-covered-treasure-chest_sprite.png":[[0,0,1],[-2.603,1.378,1],[0,-1.837,1],[-1.072,-3.368,1]],
 "fish/normal/rainbow-mantis-shrimp_sprite.png":[[0,0,1],[-2.45,0.459,1],[-0.153,-5.818,1],[-3.981,-5.818,1]],
 "fish/normal/pea-sponge_sprite.png":[[0,0,1],[-5.818,0.153,1],[-0.306,-2.144,1],[-5.512,-2.45,1]],
 "fish/normal/tiny-sardine_sprite.png":[[0,0,1],[-8.421,0,1],[0.306,-21.282,1],[-8.268,-21.589,1]],
 "fish/normal/peeking-conger-eel_sprite.png":[[0,0,1],[-6.431,0.306,1],[-0.153,-4.593,1],[-5.512,-4.9,1]],
 "fish/rare/starflower-feather-duster_sprite.png":[[0,0,1],[-5.053,0.459,1],[-1.684,-4.134,1],[-1.684,-3.675,1]],
 "fish/rare/amethyst-king-shrimp_sprite.png":[[0,0,1],[-4.44,0,1],[-0.459,-7.656,1],[-4.287,-7.809,1]],
 "fish/rare/halfmoon-seal_sprite.png":[[0,0,1],[-0.153,0,1],[0,-9.033,1],[-0.153,-8.421,1]],
 "fish/rare/blue-dolphin_sprite.png":[[0,0,1],[-3.062,0.153,1],[0.306,-9.34,1],[-3.062,-9.033,1]],
 "fish/rare/jetblack-orca_sprite.png":[[0,0,1],[-7.962,1.378,1],[1.99,-19.598,1],[-7.349,-18.526,1]],
 "fish/rare/waterdrop-comb-jelly_sprite.png":[[0,0,1],[1.837,6.278,1],[4.134,-3.215,1],[-2.144,-6.584,1]],
 "fish/rare/sandbutton-ray_sprite.png":[[0,0,1],[-3.522,0.306,1],[-2.756,-11.789,1],[-2.297,-11.177,1]],
 "fish/rare/giant-walrus_sprite.png":[[0,0,1],[-9.34,0.153,1],[0.153,-20.67,1],[-8.115,-20.517,1]],
 "fish/epic/sunken-windmill_sprite.png":[[0,0,1],[-1.99,0.153,1],[-0.612,-2.756,1],[-1.684,-2.756,1]],
 "fish/epic/twilight-striped-dolphin_sprite.png":[[0,0,1],[-2.909,-0.153,1],[0.153,-18.679,1],[-3.062,-18.679,1]],
 "fish/mythic/dawn-narwhal_sprite.png":[[0,0,1],[-4.287,-0.153,1],[0.306,-13.78,1],[-3.522,-13.627,1]],
 "fish/mythic/ancient-coral-giant-crab-walk_sprite.png":[[0,0,1],[-1.225,0,1],[0.153,-4.134,1],[-1.072,-4.134,1]],
 'fish/epic/flowerveil-jellyfish_sprite.png':[[0,0,1],[-2.909,0.306,1],[0.766,-3.522,1],[-2.297,-3.062,1]],
 'fish/mythic/ancient-coral-giant-crab_sprite.png':[[0,0,1],[0,0,1],[0,0.153,1],[0,0.153,1]],
 'fish/epic/rubyeye-moray_sprite.png':[[0,0,1],[0.153,-0.766,1],[1.684,-7.809,1],[0.306,-7.962,1]],
 'fish/epic/flower-maned-sealion_sprite.png':[[0,0,1],[-0.153,0,1],[0,-4.746,1],[0,-4.287,1]],
 'fish/rare/flower-island-crab_sprite.png':[[0,0,1],[0,0,1],[0,0,1],[0,0,1]],
 'fish/rare/pearlback-spider-crab_sprite.png':[[0,0,1],[0,0,1],[0.306,-3.828,1],[0.153,-3.828,1]],
 'fish/rare/coral-hat-octopus_sprite.png':[[0,0,1],[-0.153,0,1],[0.306,-2.45,1],[0.306,-2.756,1]],
 'fish/rare/crimson-fin-seabream_sprite.png':[[0,0,1],[0,0,1],[0,-3.981,1],[0,-3.981,1]],
 'fish/normal/coral-carrier-crab_sprite.png':[[0,0,1],[0.612,0,1],[-0.153,-3.828,1],[0.306,-3.828,1]],
 'fish/rare/flower-coral-seadragon-v2_sprite.png':[[0,0,1],[-1.225,0.153,1],[0,-3.828,1],[-1.225,-3.368,1]],
 'decorations/rare/coral-flower-anemone_sprite.png':[[0,0,1],[0,0,1],[0,0,1],[0,0,1]],
 'fish/rare/sea-crocodile-v2_sprite.png':[[0,0,1],[-1.072,0.162,1],[0,-6.441,1],[-0.766,-6.022,1]],
 'fish/normal/pink-scallop_sprite.png':[[0,0,1],[0,1.854,1],[0,-10.587,1],[0,-10.839,1]],
 'fish/normal/soft-sea-cucumber_sprite.png':[[0,0,1],[0,-0.036,1],[0,-12.371,1],[0,-12.083,1]],
 'fish/rare/sea-crocodile_sprite.png':[[0,0,1],[0,0.263,1],[0,-10.471,1],[0,-9.738,1]],
 'fish/normal/mistbread-sponge_sprite.png':[[0,0,1],[-5,0,1],[0,-8,1],[-3,-8,1]],
 'fish/normal/whisper-pipefish_sprite.png':[[0,0,1],[-1,0,1],[0,-8,1],[-1,-8,1]],
 'fish/normal/dream-thread-worm_sprite.png':[[0,0,1],[-1,0,1.02],[0,-8,1],[0,-8,1]],
 'fish/rare/mist-whisker-catfish_sprite.png':[[0,0,1],[-3,0,.98],[0,-12,1],[-4,-12,1]],
 'fish/rare/moonshadow-flounder_sprite.png':[[0,0,1],[-5,0,1],[1,-6,.96],[-5,-7,1]],
 'fish/epic/lunea-knight_sprite.png':[[0,0,1],[-2,0,1],[0,-2,1],[-2,-2,1]],
 'fish/epic/lunea-archivist_sprite.png':[[0,0,1],[1,0,1],[0,-6,1],[1,-6,1]],
 // The face/torso share the same horizontal anchor in all four source cells.
 'fish/mythic/lunea-mistmoon-goddess_sprite.png':[[0,0,1],[0,0,1],[0,-4,1],[0,-4,1]],
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
 'fish/normal/green-sea-turtle_sprite.png':[[0,0,1],[-3.215,0,1],[0.766,-8.88,1],[-1.378,-9.34,1]],
 'decorations/epic/coral-covered-shipwreck_sprite.png':[[0,0,1],[-0.459,0,1],[0.919,-2.144,1],[0,-1.99,1]],
 'fish/normal/tile-fitting-crab_sprite.png':[[0,0,1],[-2.603,0,1],[0,-2.603,1],[-2.45,-2.45,1]],
 'fish/normal/teacup-nest-blenny_sprite.png':[[0,0,1],[-4.134,0,1],[-0.153,-4.134,1],[-3.522,-3.981,1]],
 'fish/normal/amphora-home-octopus_sprite.png':[[0,0,1],[-2.603,0,1],[0.919,-6.737,1],[-2.297,-6.89,1]],
 'decorations/rare/sunken-kingdom-fountain_sprite.png':[[0,0,1],[-1.837,0.306,1],[0.306,-2.45,1],[-1.684,-2.603,1]],
 'fish/rare/azure-armored-sea-turtle_sprite.png':[[0,0,1],[-1.378,0,1],[1.225,-2.756,1],[0.153,-2.603,1]],
 'fish/rare/templekeeper-moray_sprite.png':[[0,0,1],[-1.684,0,1],[0,-7.043,1],[-1.684,-7.043,1]],
 'fish/rare/mask-changing-octopus_sprite.png':[[0,0,1],[-1.531,0,1],[0,-4.593,1],[-1.531,-4.44,1]],
 'fish/rare/letter-carrier-ray_sprite.png':[[0,0,1],[1.99,0,1],[1.225,-6.124,1],[2.297,-7.043,1]],
 'fish/epic/atlantean-guard-shark_sprite.png':[[0,0,1],[0,0,1],[0.459,-10.411,1],[0.306,-10.411,1]],
 'fish/epic/living-mosaic-ray_sprite.png':[[0,0,1],[-2.603,0.766,1],[5.359,-14.699,1],[-2.45,-9.033,1]],
 'fish/epic/palace-lantern-anglerfish_sprite.png':[[0,0,1],[-3.215,0,1],[0.153,-5.665,1],[-2.909,-5.818,1]],
 'fish/epic/atlantean-giant-squid_sprite.png':[[0,0,1],[-0.459,0.766,1],[1.072,-1.531,1],[1.072,-0.612,1]],
 'fish/mythic/atlantean-sentinel_sprite.png':[[0,0,1],[-2.297,0.766,1],[0.766,-1.684,1],[-1.684,-1.531,1]],
 'fish/mythic/atlantean-sentinel-walk_sprite.png':[[0,0,1],[-1.378,0,1],[0.153,-3.215,1],[-1.378,-3.368,1]],
 'decorations/normal/ribbon-eelgrass-based_sprite.png':[[0,0,1],[-6.278,0,1],[0.459,-3.368,1],[-5.818,-3.215,1]],
 'decorations/normal/pebble-sea-moss-based_sprite.png':[[0,0,1],[0,0,1],[-0.153,-3.368,1],[-0.306,-3.522,1]],
 'decorations/normal/spiral-kelp-based_sprite.png':[[0,0,1],[-5.053,0.153,1],[0,-3.981,1],[-4.746,-3.981,1]],
 'decorations/rare/pearl-sea-grapes-based_sprite.png':[[0,0,1],[-2.909,0,1],[0,-6.124,1],[-2.603,-6.278,1]],
 'decorations/rare/rose-fan-seaweed-based_sprite.png':[[0,0,1],[-2.144,0.153,1],[-1.531,-1.225,1],[-2.45,-1.378,1]],
}

export function swimFrameLayout(path:string,frame:number){
 const reviewed:Record<string,{cell:number;scale?:number;shifts:number[][]}>=reviewedLayouts
 const correction=reviewed[path]
 if(correction){const [x,y]=correction.shifts[frame]??[0,0];return {originX:.5+x/correction.cell,originY:.5+y/correction.cell,scale:correction.scale??1}}
 const extra=registeredLayouts[path]
 if(extra){const [x,y]=extra.shifts[frame]??[0,0];return {originX:.5+x/extra.cell,originY:.5+y/extra.cell,scale:extra.scale??1}}
 const [x,y,scale]=layouts[path]?.[frame]??[0,0,1]
 return {originX:.5+x/96,originY:.5+y/96,scale:1/scale}
}
