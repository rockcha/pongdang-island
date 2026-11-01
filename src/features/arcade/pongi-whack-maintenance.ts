export type WhackMaintenance = { startsAt: string; releasedAt: string | null; active: boolean }

// Also covers guests and clients waiting for the first server snapshot.
export const whackReworkSchedule: WhackMaintenance = {
  startsAt: '2026-11-02T00:00:00+09:00',
  releasedAt: null,
  active: false,
}
export const whackReworkMessage = '퐁이 잡기 개편 준비로 새 게임 시작이 중단됐어요. 기존 기록에 따른 보상을 집계한 뒤 개편할 예정이에요.'

export function whackMaintenanceActive(schedule: WhackMaintenance, now: number) {
  return now >= Date.parse(schedule.startsAt) &&
    (!schedule.releasedAt || now < Date.parse(schedule.releasedAt))
}
