import {existsSync,readFileSync} from 'node:fs'
import {cleanup,fireEvent,render,screen} from '@testing-library/react'
import {afterEach,expect,it} from 'vitest'
import {bossCombatBackgrounds,combatBackgrounds,combatBackgroundUrl,drawCombatBackground,resolveCombatBackground} from '@/features/exploration/combat-backgrounds'
import {getAdventureRoom} from '@/features/exploration/adventure-rooms'
import {explorationMonsters} from '@/features/exploration/monster-catalog'
import {airborneMonsters,monsterGrounding} from '@/features/exploration/monster-grounding'
import {ScorpionRoom} from '@/features/exploration/scorpion-room'
import {newPractice} from '@/features/exploration/practice-state'
import {startMonsterCombat} from '@/features/exploration/combat-state'

afterEach(cleanup)
it('gives every boss a unique fixed arena outside the ordinary random pool, from room entry to combat',()=>{
 const manifest=JSON.parse(readFileSync('assets/exploration/boss-backgrounds/manifest.json','utf8'))
 const bosses=explorationMonsters.filter(monster=>monster.tier==='boss')
 expect(Object.keys(bossCombatBackgrounds).sort()).toEqual(bosses.map(monster=>monster.id).sort())
 expect(new Set(Object.values(bossCombatBackgrounds)).size).toBe(bosses.length)
 expect(manifest.images).toHaveLength(bosses.length)
 for(const image of manifest.images){expect(existsSync(image.original)).toBe(true);expect(existsSync(image.public)).toBe(true);expect(combatBackgrounds).not.toContain(image.id)}
 for(const [monsterId,roomId] of [['obsidian-anubis','boss-anubis'],['nameless-royal-warden','nameless-guardian'],['golden-pharaoh','boss-pharaoh']] as const){
  const arena=resolveCombatBackground(monsterId)
  expect(getAdventureRoom(roomId)!.background).toBe(combatBackgroundUrl(arena))
  const props={state:startMonsterCombat(newPractice(()=>0),monsterId),busy:false,feedback:null,latestLog:'',speaker:'탐험',onAction:()=>{},onDescend:()=>{},onReturnToMain:()=>{}}
  const view=render(<ScorpionRoom {...props} background="sunken-sandstone"/>)
  expect(document.querySelector('[data-combat-background]')?.getAttribute('data-combat-background')).toBe(arena)
  view.rerender(<ScorpionRoom {...props} state={{...props.state,combat:{...props.state.combat!,turn:4}}} background="emerald-sanctuary"/>)
  expect(document.querySelector('[data-combat-background]')?.getAttribute('data-combat-background')).toBe(arena)
  cleanup()
 }
})
it('ships eight optimized arenas and their original generation records',()=>{
 const manifest=JSON.parse(readFileSync('assets/exploration/combat-backgrounds/manifest.json','utf8'))
 expect(combatBackgrounds).toHaveLength(8)
 expect(manifest.images.map((image:{id:string})=>image.id)).toEqual([...combatBackgrounds])
 for(const image of manifest.images){expect(existsSync(image.original)).toBe(true);expect(existsSync(image.public)).toBe(true)}
 // Every arena remains selectable, while the previous arena cannot repeat.
 expect(new Set(combatBackgrounds.map((_,i)=>drawCombatBackground(undefined,()=>i/8)))).toEqual(new Set(combatBackgrounds))
 for(const previous of combatBackgrounds)for(let i=0;i<70;i++)expect(drawCombatBackground(previous,()=>i/70)).not.toBe(previous)
})
it('keeps the arena through turns and skill dialogs and anchors ground and flying sprites separately',()=>{
 const state=startMonsterCombat(newPractice(()=>0),'night-eyed-desert-fox')
 const props={state,busy:false,feedback:null,latestLog:'',speaker:'탐험',onAction:()=>{},onDescend:()=>{},onReturnToMain:()=>{}}
 const view=render(<ScorpionRoom {...props} background="lapis-star-vault"/>)
 const stage=()=>document.querySelector<HTMLElement>('[data-combat-background]')!
 expect(stage().closest<HTMLElement>('.exploration-combat')!.style.getPropertyValue('--combat-backdrop')).toContain(combatBackgroundUrl('lapis-star-vault'))
 fireEvent.click(screen.getByRole('button',{name:'마법 · 별빛 구슬 설명'}))
 expect(stage().dataset.combatBackground).toBe('lapis-star-vault')
 view.rerender(<ScorpionRoom {...props} state={{...state,combat:{...state.combat!,turn:3,enemyHp:20}}} background="lapis-star-vault"/>)
 expect(stage().dataset.combatBackground).toBe('lapis-star-vault')
 expect(document.querySelector('.exploration-enemy-art')?.getAttribute('data-airborne')).toBe('false')
 view.rerender(<ScorpionRoom {...props} state={startMonsterCombat(newPractice(()=>0),'sand-wing-bat')} background="emerald-sanctuary"/>)
 expect(stage().dataset.combatBackground).toBe('emerald-sanctuary')
 expect(document.querySelector('.exploration-enemy-art')?.getAttribute('data-airborne')).toBe('true')
 for(const monster of explorationMonsters){expect(monsterGrounding[monster.id].aspect).toBeGreaterThan(0);expect(monsterGrounding[monster.id].bottomGap).toBeLessThan(.25)}
 expect(airborneMonsters.has('tomb-lantern-jellyfish')).toBe(true)
})
