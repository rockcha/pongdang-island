import {cleanup,render,screen} from '@testing-library/react'
import {afterEach,expect,it} from 'vitest'
import {activeWeather,koreaDay,weatherTime,type FishingWeather} from '@/features/fishing/weather'
import {FishingWeatherEffect,WeatherBadge} from '@/features/fishing/fishing-weather'
const period={kind:'rain' as const,startsAt:'2026-11-04T03:00:00Z',endsAt:'2026-11-04T03:30:00Z'}
const schedule:FishingWeather={day:'2026-11-04',serverNow:period.startsAt,periods:[period]}
afterEach(cleanup)
it('shows active weather only within the assigned half-open interval',()=>{
 expect(activeWeather(schedule,Date.parse(period.startsAt)-1)).toBeUndefined()
 expect(activeWeather(schedule,Date.parse(period.startsAt))).toEqual(period)
 expect(activeWeather(schedule,Date.parse(period.endsAt)-1)).toEqual(period)
 expect(activeWeather(schedule,Date.parse(period.endsAt))).toBeUndefined()
 expect(activeWeather(undefined,Date.now())).toBeUndefined()
 expect(koreaDay(Date.parse('2026-11-04T15:00:00Z'))).toBe('2026-11-05')
})
it('labels the icon and time explicitly in Korea time',()=>{
 expect(weatherTime(period)).toBe('12:00 ~ 12:30')
 render(<WeatherBadge period={period}/>)
 expect(screen.getByLabelText('비 12:00 ~ 12:30').querySelector('svg')).toBeTruthy()
})
it.each([['snow','눈'],['dust','황사'],['meteor','유성우'],['blossom','꽃비']] as const)('shows %s with its own icon and label', (kind,label)=>{
 render(<WeatherBadge period={{...period,kind}}/>)
 expect(screen.getByLabelText(`${label} 12:00 ~ 12:30`).querySelector('svg')).toBeTruthy()
})
it('switches subtle map effects and removes them in clear weather',()=>{
 const {container,rerender}=render(<FishingWeatherEffect kind="rain"/>)
 expect(container.querySelector('[data-fishing-weather="rain"]')).toBeTruthy()
 rerender(<FishingWeatherEffect kind="snow"/>)
 expect(container.querySelectorAll('.fishing-weather-snow')).toHaveLength(2)
 expect(container.querySelector('.fishing-weather-rain')).toBeNull()
 rerender(<FishingWeatherEffect kind="dust"/>)
 expect(container.querySelectorAll('.fishing-weather-dust')).toHaveLength(2)
 expect(container.querySelector('.fishing-weather-snow')).toBeNull()
 expect(container.querySelector('.fishing-weather-rain')).toBeNull()
 rerender(<FishingWeatherEffect kind="meteor"/>)
 expect(container.querySelectorAll('.fishing-weather-meteors span')).toHaveLength(3)
 expect(container.querySelector('.fishing-weather-dust')).toBeNull()
 rerender(<FishingWeatherEffect kind="blossom"/>)
 expect(container.querySelectorAll('.fishing-weather-blossom span')).toHaveLength(12)
 expect(container.querySelector('.fishing-weather-meteors')).toBeNull()
 rerender(<FishingWeatherEffect/>)
 expect(container.innerHTML).toBe('')
})
