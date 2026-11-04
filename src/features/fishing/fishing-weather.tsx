import type {WeatherKind, WeatherPeriod} from './weather'
import {weatherNames, weatherTime} from './weather'
import './fishing-weather.css'
import {weatherIconPaths} from './weather-icon-art'

export function WeatherIcon({kind, className = ''}: {kind: WeatherKind; className?: string}) {
  return <svg viewBox="0 0 32 32" fill="none" aria-hidden="true" className={className} dangerouslySetInnerHTML={{__html:weatherIconPaths[kind]}}/>
}
export function WeatherBadge({period}: {period: WeatherPeriod}) {
  return <span aria-label={`${weatherNames[period.kind]} ${weatherTime(period)}`} className="inline-flex shrink-0 items-center gap-1 rounded-lg bg-slate-950/30 px-1.5 py-1 text-white backdrop-blur-sm">
    <WeatherIcon kind={period.kind} className="size-6 shrink-0 drop-shadow"/>
    <span className="flex flex-col items-start whitespace-nowrap leading-tight"><span className="text-[11px]">{weatherNames[period.kind]}</span><span className="text-[10px] tabular-nums text-white/85">{weatherTime(period)}</span></span>
  </span>
}
export function FishingWeatherEffect({kind}: {kind?: WeatherKind}) {
  if (!kind) return null
  return <div aria-hidden="true" data-fishing-weather={kind} className={`fishing-weather fishing-weather--${kind}`}>
    {kind === 'rain' && <div className="fishing-weather-rain"/>}
    {kind === 'snow' && <><div className="fishing-weather-snow"/><div className="fishing-weather-snow fishing-weather-snow--back"/></>}
    {kind === 'dust' && <><div className="fishing-weather-dust"/><div className="fishing-weather-dust fishing-weather-dust--grains"/></>}
    {kind === 'meteor' && <div className="fishing-weather-meteors">{[0,1,2].map(index=><span key={index} style={{left:`${65+index*12}%`,top:`${8+index*13}%`,animationDuration:`${11+index*5}s`,animationDelay:`${index*2.7}s`}}/>)}</div>}
    {kind === 'blossom' && <div className="fishing-weather-blossom">{Array.from({length:12},(_,index)=><span key={index} style={{left:`${(index*37+5)%100}%`,animationDuration:`${12+index%4*2}s`,animationDelay:`${-index*1.9}s`}}/>)}</div>}
  </div>
}
