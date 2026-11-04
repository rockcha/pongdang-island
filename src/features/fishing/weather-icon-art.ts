import type {WeatherKind} from './weather'
const cloud='<path d="M8 19a6 6 0 0 1-1-12 8 8 0 0 1 15-1 6.5 6.5 0 0 1 2 13Z" fill="#e4eff3" stroke="#829ba8" stroke-width="1.5"/>'
// Trusted static SVG paths shared by screen icons and the exported showcase canvas.
export const weatherIconPaths:Record<WeatherKind,string>={
 rain:cloud+'<path d="m10 23-2 4m10-4-2 4m10-4-2 4" stroke="#60cfff" stroke-width="2.5" stroke-linecap="round"/>',
 snow:cloud+'<g stroke="#9dddf6" stroke-width="1.6" stroke-linecap="round"><path d="M10 22v8m-3.5-6 7 4m-7 0 7-4M23 21v8m-3.5-6 7 4m-7 0 7-4"/></g>',
 dust:'<circle cx="23" cy="9" r="5" fill="#e8bd78" fill-opacity=".7"/><path d="M3 13h16c6 0 6-7 1-7M7 20h18c6 0 6 7 1 7M3 26h12" stroke="#d5a76c" stroke-width="2.5" stroke-linecap="round"/><circle cx="5" cy="6" r="1.5" fill="#e8c594"/><circle cx="22" cy="17" r="1" fill="#e8c594"/>',
 meteor:'<path d="M27 3 13 17M29 10 19 20M20 2 9 13" stroke="#a8c8ef" stroke-width="2.5" stroke-linecap="round"/><path d="m10 14 2.6 5.3 5.9.8-4.3 4.2 1 5.9-5.2-2.8-5.2 2.8 1-5.9-4.3-4.2 5.9-.8Z" fill="#f5da91" stroke="#c9a565" stroke-linejoin="round"/>',
 blossom:'<g fill="#f8b6c9" stroke="#d789a7" stroke-width=".8"><path d="M16 17C3 12 8 1 16 10c8-9 13 2 0 7Z"/><path d="M16 17c8-11 17-3 5 2 8 8-2 15-5 1-3 14-13 7-5-1-12-5-3-13 5-2Z"/></g><circle cx="16" cy="17" r="2.5" fill="#f4d37f"/>',
}
export function weatherIconDataUrl(kind:WeatherKind){return 'data:image/svg+xml;charset=utf-8,'+encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32" width="32" height="32" fill="none">${weatherIconPaths[kind]}</svg>`)}
