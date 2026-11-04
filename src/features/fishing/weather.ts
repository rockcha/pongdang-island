export const weatherKinds = ['rain', 'snow', 'dust', 'meteor', 'blossom'] as const
export type WeatherKind = typeof weatherKinds[number]
export type WeatherPeriod = {kind: WeatherKind; startsAt: string; endsAt: string}
export type FishingWeather = {day: string; serverNow: string; periods: WeatherPeriod[]}
export const weatherNames: Record<WeatherKind, string> = {rain: '비', snow: '눈', dust: '황사', meteor: '유성우', blossom: '꽃비'}
export function activeWeather(schedule: FishingWeather | undefined, now: number) {
  return schedule?.periods.find(period => Date.parse(period.startsAt) <= now && now < Date.parse(period.endsAt))
}
export function weatherTime(period: WeatherPeriod) {
  const format = (date: string) => new Intl.DateTimeFormat('ko-KR', {timeZone: 'Asia/Seoul', hour: '2-digit', minute: '2-digit', hourCycle: 'h23'}).format(new Date(date))
  return `${format(period.startsAt)} ~ ${format(period.endsAt)}`
}
export function koreaDay(now: number) {
  return new Date(now + 9 * 60 * 60 * 1000).toISOString().slice(0, 10)
}
