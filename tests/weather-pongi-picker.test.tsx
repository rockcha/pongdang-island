import {cleanup,render,screen,fireEvent,waitFor} from '@testing-library/react'
import {afterEach,expect,it,vi} from 'vitest'
import {WeatherCreaturePicker} from '@/features/fishing/weather-creature-picker'
vi.mock('@/features/collection/collectible-preview',()=>({CollectiblePreview:({species})=><span role="img" aria-label={species.name}/>}))
afterEach(cleanup)
it('previews only creatures of the selected weather and chooses one for practice',async()=>{
 const select=vi.fn()
 render(<WeatherCreaturePicker kind="meteor" selected="weather-pongi-comet-tail" onSelect={select}/>)
 fireEvent.click(screen.getByRole('button',{name:'개체 선택'}))
 expect(await screen.findByRole('dialog',{name:'유성우 날씨 개체'})).toBeTruthy()
 expect(screen.getByRole('img',{name:'유성 꼬리 퐁이'})).toBeTruthy()
 expect(screen.getByRole('img',{name:'별 줍는 퐁이'})).toBeTruthy()
 expect(screen.getByRole('img',{name:'유성의 정령 루온'})).toBeTruthy()
 expect(screen.getByRole('img',{name:'밤하늘을 감는 태엽'})).toBeTruthy()
 expect(screen.queryByRole('img',{name:'노란 우비 퐁이'})).toBeNull()
 fireEvent.click(screen.getByRole('button',{name:'별 줍는 퐁이 선택'}))
 expect(select).toHaveBeenCalledWith('weather-pongi-star-collector')
 await waitFor(()=>expect(screen.queryByRole('dialog')).toBeNull())
})
