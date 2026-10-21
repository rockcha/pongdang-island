import {act, cleanup, fireEvent, render, screen, waitFor} from '@testing-library/react'
import {afterEach, beforeEach, expect, it, vi} from 'vitest'
import {RegionMusic} from '@/features/music/region-music'
import {claimPlayback, playbackEvent} from '@/features/music/playback-ownership'

let players: FakeAudio[] = []
class FakeAudio extends EventTarget {
  loop = false
  preload = ''
  volume = 1
  play = vi.fn(() => Promise.resolve())
  pause = vi.fn()
  load = vi.fn()
  removeAttribute = vi.fn()
  constructor(public src: string) { super(); players.push(this) }
}
beforeEach(() => {
  localStorage.clear()
  players = []
  vi.stubGlobal('Audio', FakeAudio)
})
afterEach(() => { cleanup(); vi.unstubAllGlobals() })
it('starts only the supported map, loops, and stops on leaving', async () => {
  const view = render(<RegionMusic regionId="coral"/>)
  expect(players).toHaveLength(0)
  view.rerender(<RegionMusic regionId="pongdang"/>)
  await screen.findByText('퐁당섬의 선율')
  expect(players[0].src).toBe('/music/pongdang-journey.mp3')
  expect(players[0].loop).toBe(true)
  expect(players[0].volume).toBe(.3)
  view.rerender(<RegionMusic regionId="coral"/>)
  expect(players[0].pause).toHaveBeenCalled()
  expect(players[0].removeAttribute).toHaveBeenCalledWith('src')
})
it('remembers off and volume without restarting playback', async () => {
  const view = render(<RegionMusic regionId="pongdang"/>)
  await screen.findByText('퐁당섬의 선율')
  fireEvent.click(screen.getByLabelText('배경음악 볼륨 조절'))
  fireEvent.change(screen.getByRole('slider'), {target: {value: '55'}})
  expect(players[0].volume).toBe(.55)
  expect(players[0].play).toHaveBeenCalledTimes(1)
  fireEvent.click(screen.getByLabelText('배경음악 끄기'))
  view.unmount()
  render(<RegionMusic regionId="pongdang"/>)
  expect(players[1].play).not.toHaveBeenCalled()
  expect(players[1].volume).toBe(.55)
})
it('yields to library music and can reclaim playback explicitly', async () => {
  const announce = vi.fn()
  window.addEventListener(playbackEvent, announce)
  render(<RegionMusic regionId="pongdang"/>)
  await screen.findByText('퐁당섬의 선율')
  act(() => claimPlayback('library'))
  expect(players[0].pause).toHaveBeenCalled()
  expect(screen.getByText('배경음악 꺼짐')).toBeTruthy()
  fireEvent.click(screen.getByLabelText('배경음악 켜기'))
  await screen.findByText('퐁당섬의 선율')
  expect((announce.mock.calls.at(-1)?.[0] as CustomEvent).detail).toBe('region')
  window.removeEventListener(playbackEvent, announce)
})
it('offers a retry when autoplay is blocked', async () => {
  localStorage.setItem('pongdang:region-music-enabled', 'false')
  render(<RegionMusic regionId="pongdang"/>)
  players[0].play.mockRejectedValueOnce(new DOMException('blocked', 'NotAllowedError'))
  fireEvent.click(screen.getByLabelText('배경음악 켜기'))
  await screen.findByText('눌러서 음악 시작')
  fireEvent.click(screen.getByLabelText('배경음악 켜기'))
  await waitFor(() => expect(screen.getByLabelText('배경음악 끄기').getAttribute('aria-pressed')).toBe('true'))
})
