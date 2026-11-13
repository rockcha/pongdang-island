import { afterEach, expect, it } from 'vitest'
import { gameIsCovered } from '@/features/arcade/game-interaction'
afterEach(() => document.body.replaceChildren())
it('keeps an owned live purchase dialog blocking canvas input while allowing its clock to run', () => {
  document.body.innerHTML =
    '<dialog open data-game-active="true"><div id="game"></div><div role="dialog" class="td-catalog"></div></dialog>'
  const host = document.getElementById('game')!
  expect(gameIsCovered(host)).toBe(true)
  expect(gameIsCovered(host, '.td-catalog')).toBe(false)
  const confirm = document.createElement('div')
  confirm.setAttribute('role', 'alertdialog')
  document.body.append(confirm)
  expect(gameIsCovered(host, '.td-catalog')).toBe(true)
  confirm.remove()
  host.closest('dialog')!.dataset.gameActive = 'false'
  expect(gameIsCovered(host, '.td-catalog')).toBe(true)
})
it('blocks a collapsed game and other open dialogs, but ignores its own modal and hidden dialogs', () => {
  document.body.innerHTML = '<dialog open data-game-active="true"><div id="game"></div></dialog>'
  const host = document.getElementById('game')!
  expect(gameIsCovered(host)).toBe(false)
  host.closest('dialog')!.dataset.gameActive = 'false'
  expect(gameIsCovered(host)).toBe(true)
  host.closest('dialog')!.dataset.gameActive = 'true'
  const overlay = document.createElement('div')
  overlay.setAttribute('role', 'alertdialog')
  document.body.append(overlay)
  expect(gameIsCovered(host)).toBe(true)
  overlay.hidden = true
  expect(gameIsCovered(host)).toBe(false)
  overlay.hidden = false
  overlay.setAttribute('data-closed', '')
  expect(gameIsCovered(host)).toBe(false)
})
