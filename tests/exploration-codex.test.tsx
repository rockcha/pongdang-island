import {cleanup,fireEvent,render,screen,within} from '@testing-library/react'
import {afterEach,expect,it,vi} from 'vitest'
import {explorationWeapons,hasWeaponEffect} from '@/features/exploration/weapon-catalog'
import {getPlannedSpells} from '@/features/exploration/spell-catalog'
import {practiceSpells} from '@/features/exploration/practice-state'
import {ExplorationCodex} from '@/features/exploration/codex'
import {armorCatalog,practiceArmor,merchantArmorPrice} from '@/features/exploration/armor-catalog'
import {newPractice,grantPracticeSupplies,merchantGoods} from '@/features/exploration/practice-state'

afterEach(()=>{cleanup();vi.useRealTimers()})
function show(){render(<ExplorationCodex ownedIds={['ember','old-diving-suit']}/>);fireEvent.click(screen.getByRole('button',{name:'도감'}))}
it('combines current weapons, spells and armor entries in one codex',()=>{
 show()
 expect(screen.getByRole('dialog',{name:'도감'})).toBeTruthy()
 expect(screen.getByRole('tab',{name:`무기 ${explorationWeapons.length}`}).getAttribute('aria-selected')).toBe('true')
 fireEvent.click(screen.getByRole('tab',{name:`마법 ${practiceSpells.length+getPlannedSpells({balanceVersion:2}).length}`}))
 const panel=screen.getByRole('tabpanel')
 expect(within(panel).getAllByRole('heading')).toHaveLength(practiceSpells.length+getPlannedSpells({balanceVersion:2}).length)
 const learned=within(panel).getByRole('heading',{name:'작은 불꽃'}).closest('article')!
 expect(within(learned).getByText('불꽃 피해 20')).toBeTruthy()
 expect(within(learned).getByText('습득')).toBeTruthy()
 const planned=within(panel).getByRole('heading',{name:'라의 심판'}).closest('article')!
 expect(within(planned).getByText('현재 탐험에서 사용 가능')).toBeTruthy()
 expect(within(planned).getByText('2,600')).toBeTruthy()
 expect(within(planned).queryByRole('button')).toBeNull()
 const intermediate=getPlannedSpells({balanceVersion:2}).filter(spell=>spell.tier==='advanced').length
 fireEvent.click(screen.getByRole('button',{name:`중급 ${intermediate}`}))
 expect(within(panel).getAllByRole('heading')).toHaveLength(intermediate)
 fireEvent.click(screen.getByRole('tab',{name:'방어구 23'}))
 expect(within(panel).getAllByRole('heading')).toHaveLength(23)
 expect(within(panel).getByRole('heading',{name:'모래바람 망토'})).toBeTruthy()
 expect(within(panel).getByText('+10%p')).toBeTruthy()
 expect(within(panel).getByText('400')).toBeTruthy()
 expect(screen.queryByRole('group',{name:'무기 단계'})).toBeNull()
 fireEvent.click(screen.getByRole('button',{name:'고급 5'}))
 expect(within(panel).getAllByRole('heading')).toHaveLength(5)
 expect(within(panel).getAllByLabelText(/^마법 저항력 /)).toHaveLength(5)
 expect(within(panel).getByRole('img',{name:'불멸자의 왕포'}).getAttribute('src')).toBe('/exploration/armor/immortal-royal-robe.png')
})
it('supports keyboard tabs and preserves weapon filters when returning from another category',()=>{
 show()
 fireEvent.click(screen.getByRole('button',{name:`중급 ${explorationWeapons.filter(item=>item.tier==='advanced').length}`}))
 fireEvent.click(screen.getByRole('button',{name:'기본형'}))
 const weapon=screen.getByRole('tab',{name:`무기 ${explorationWeapons.length}`})
 fireEvent.keyDown(weapon,{key:'ArrowRight'})
 const magic=screen.getByRole('tab',{name:`마법 ${practiceSpells.length+getPlannedSpells({balanceVersion:2}).length}`})
 expect(document.activeElement).toBe(magic)
 expect(magic.getAttribute('aria-selected')).toBe('true')
 fireEvent.keyDown(magic,{key:'ArrowLeft'})
 expect(screen.getAllByRole('img')).toHaveLength(explorationWeapons.filter(item=>item.tier==='advanced'&&!hasWeaponEffect(item)).length)
})
it('opens directly to the corresponding inventory category and reuses actual armor data',()=>{
 render(<ExplorationCodex initialCategory="armor"/>);fireEvent.click(screen.getByRole('button',{name:'도감'}))
 expect(screen.getByRole('tab',{name:'방어구 23'}).getAttribute('aria-selected')).toBe('true')
 expect(newPractice().armor[0]).toBe(armorCatalog[0].gear)
 expect(grantPracticeSupplies(newPractice()).armor).toEqual(practiceArmor)
 expect(merchantGoods.find(item=>item.id==='merchant-armor')?.price).toBe(merchantArmorPrice)
})
