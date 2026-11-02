import type {MonsterId} from './monster-catalog'

// Measured from current sprite alpha bounds (alpha > 50). Keep transparent
// padding while aligning the visible feet to the arena floor at any aspect ratio.
export const monsterGrounding: Record<MonsterId, {aspect: number; bottomGap: number}> = {
  'sandstone-shield-guard':{aspect:1,bottomGap:0.0207},
  'potion-thief':{aspect:1,bottomGap:0.01},
  'black-sun-moth':{aspect:1,bottomGap:0.1471},
  'golden-armored-crocodile':{aspect:1,bottomGap:0.1302},
  'black-sand-devourer':{aspect:1,bottomGap:0.0677},
  'gem-backed-tomb-tortoise':{aspect:1,bottomGap:0.1224},
  'golden-scales-maaken':{aspect:1,bottomGap:0.0169},
  'black-sun-aker':{aspect:1,bottomGap:0.0534},
  "sand-scorpion": {
    "aspect": 1,
    "bottomGap": 0.051
  },
  "bandage-mummy": {
    "aspect": 1,
    "bottomGap": 0.0443
  },
  "lapis-cobra": {
    "aspect": 1,
    "bottomGap": 0.0169
  },
  "sand-wraith": {
    "aspect": 1,
    "bottomGap": 0.0104
  },
  "tomb-lantern-jellyfish": {
    "aspect": 1,
    "bottomGap": 0.0378
  },
  "obsidian-anubis": {
    "aspect": 1,
    "bottomGap": 0.0078
  },
  "jar-wisp": {
    "aspect": 1,
    "bottomGap": 0.0612
  },
  "talisman-lizard": {
    "aspect": 1,
    "bottomGap": 0.082
  },
  "night-eyed-desert-fox": {
    "aspect": 1,
    "bottomGap": 0.124
  },
  "sand-wing-bat": {
    "aspect": 1,
    "bottomGap": 0.1802
  },
  "tomb-hook-guard": {
    "aspect": 1,
    "bottomGap": 0.0195
  },
  "ancient-giant": {
    "aspect": 1,
    "bottomGap": 0.0156
  },
  "treasure-scarab": {
    "aspect": 1.0942,
    "bottomGap": 0.0092
  },
  "golden-pharaoh": {
    "aspect": 1,
    "bottomGap": 0.0104
  },
  "nameless-royal-warden": {
    "aspect": 0.6667,
    "bottomGap": 0.0156
  },
  "cracked-shield-scarab": {
    "aspect": 1,
    "bottomGap": 0.0801
  },
  "cowardly-tomb-rat": {
    "aspect": 1,
    "bottomGap": 0.082
  },
  "hourglass-sentinel": {
    "aspect": 1,
    "bottomGap": 0.0371
  },
  "mirror-mask-mage": {
    "aspect": 1,
    "bottomGap": 0.0078
  }
}

export const airborneMonsters = new Set<MonsterId>(['sand-wing-bat','tomb-lantern-jellyfish','sand-wraith','jar-wisp','black-sun-moth','black-sun-aker'])
