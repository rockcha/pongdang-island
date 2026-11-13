import React from 'react'
import { createRoot } from 'react-dom/client'
import { MemoryRouter } from 'react-router'
import TowerDefenseGame from '/src/features/arcade/tower-defense-game'
import * as engine from '/src/features/arcade/tower-defense-engine'
import { mountTowerDefense } from '/src/features/arcade/tower-defense-scene'
import { campaignStrategy } from '../../tower-defense-campaign-strategy'
import '/src/index.css'
const params = new URLSearchParams(location.search)
const qa = ((window as any).towerDefenseQA = { errors: [], engine, frames: 0, stepTimes: [] })
window.addEventListener('error', (e) => qa.errors.push(e.message))
window.addEventListener('unhandledrejection', (e) => qa.errors.push(String(e.reason)))
document.body.style.cssText = 'margin:0;background:#eaf0e5;font-family:sans-serif;color:#53695d'
document.getElementById('root')!.style.cssText = 'height:100svh;display:flex;flex-direction:column'
if (params.has('stress') || params.has('campaign')) {
  const campaign = Number(params.get('campaign'))
  const s = campaign
    ? campaignStrategy(1, campaign, params.has('expanded')).state
    : engine.createDefense(42)
  if (!campaign) {
    engine.beginDefense(s)
    s.gold = 100000
    for (const [x, y, kind] of [
      [2, 10, 'octopus'],
      [8, 10, 'seahorse'],
      [3, 7, 'mortar'],
      [5, 9, 'flame'],
      [5, 4, 'laser'],
      [7, 7, 'plasma'],
      [5, 11, 'anemone'],
    ] as const) {
      engine.build(s, engine.cellAt(x, y), kind)
      engine.upgrade(s, engine.cellAt(x, y))
      engine.upgrade(s, engine.cellAt(x, y))
    }
    if (params.has('dense'))
      for (let y = 1; y < 13; y++)
        for (const x of [0, 11]) {
          const cell = engine.cellAt(x, y)
          if (!engine.build(s, cell, 'plasma')) throw Error('Dense render setup failed')
          engine.upgrade(s, cell)
          engine.upgrade(s, cell)
        }
    engine.startWave(s)
    s.spawned = s.plan.length
    engine.refreshFlow(s)
    const candidates = Array.from({ length: engine.GRID.columns * 12 }, (_, i) => i).filter(
      (c) => c !== engine.HOME && Number.isFinite(s.flow[c]),
    )
    for (let i = 0; i < 256; i++) {
      engine.spawnEnemy(
        s,
        (
          [
            'crab',
            'swift',
            'armored',
            'healer',
            'swarm',
            'shield',
            'rusher',
            'splitter',
            'mini',
          ] as const
        )[i % 9],
        candidates[i % candidates.length],
      )
      const e = s.enemies.at(-1)!
      e.speed = 0
      e.hp = 100000
      e.maxHp = 100000
    }
  } else {
    // Replay real paid preparation, then advance only until the boss enters.
    while (!s.enemies.some((e) => engine.MONSTERS[e.kind].boss) && s.phase === 'combat')
      engine.stepDefense(s, 0.05)
  }
  const host = document.getElementById('root')!
  qa.state = s
  qa.selected = null
  qa.game = mountTowerDefense(
    host,
    () => s,
    () => qa.selected,
    (cell) => {
      qa.selected = cell
    },
    () => {
      qa.frames++
      qa.ready = true
    },
    () => 'octopus',
  )
  let last = performance.now()
  const intervals: number[] = []
  function measure(now: number) {
    intervals.push(now - last)
    last = now
    if (intervals.length > 600) intervals.shift()
    qa.frameIntervals = intervals
    requestAnimationFrame(measure)
  }
  requestAnimationFrame(measure)
} else
  createRoot(document.getElementById('root')!).render(
    <MemoryRouter>
      <TowerDefenseGame />
    </MemoryRouter>,
  )
