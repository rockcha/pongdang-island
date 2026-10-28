import type { VoyageRound } from './api'
export function voyagePhase(round: VoyageRound, now: number): VoyageRound['phase'] {
  if (now < Date.parse(round.opensAt)) return 'scheduled'
  if (now < Date.parse(round.departsAt)) return 'open'
  if (now < Date.parse(round.resultsAt)) return 'sailing'
  return round.phase === 'settled' ? 'settled' : 'settling'
}
export function voyageCountdown(target: string, now: number) {
  const seconds = Math.max(0, Math.ceil((Date.parse(target) - now) / 1000))
  const hours = Math.floor(seconds / 3600),
    minutes = Math.floor((seconds % 3600) / 60),
    rest = seconds % 60
  return [hours, minutes, rest].map((v) => String(v).padStart(2, '0')).join(':')
}
export const voyageCompletedRegions = (round: VoyageRound, now: number) =>
  Math.max(0, Math.min(3, Math.floor((now - Date.parse(round.departsAt)) / 3600000)))
export const voyageKoreaTime = (value: string) =>
  new Date(value).toLocaleTimeString('ko-KR', {
    timeZone: 'Asia/Seoul',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  })
export const voyageKoreaDate = (value: string) =>
  new Date(value).toLocaleDateString('ko-KR', {
    timeZone: 'Asia/Seoul',
    month: 'long',
    day: 'numeric',
  })
