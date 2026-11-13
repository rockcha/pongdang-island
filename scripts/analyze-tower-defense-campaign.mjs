import fs from 'node:fs'
import path from 'node:path'
import { createHash } from 'node:crypto'
import { performance } from 'node:perf_hooks'
import { Worker, isMainThread, parentPort } from 'node:worker_threads'
import { AUDIT_STRATEGIES, auditRun } from './tower-defense-strategy-audit.ts'
import { summarize } from './tower-defense-audit-statistics.mjs'

if (!isMainThread) {
  parentPort.on('message', ({ index, seed, policy }) => {
    try {
      parentPort.postMessage({ index, record: auditRun(seed, policy) })
    } catch (error) {
      parentPort.postMessage({ index, error: error.stack ?? String(error) })
    }
  })
} else {
  const args = process.argv.slice(2),
    arg = (name, fallback) => {
      const i = args.indexOf(name)
      return i < 0 ? fallback : args[i + 1]
    }
  const count = Number(arg('--runs', '64')),
    workers = Number(arg('--workers', '3')),
    pilot = args.includes('--pilot'),
    output = arg(
      '--out',
      pilot ? 'artifacts/tower-defense/campaign-pilot' : 'artifacts/tower-defense/campaign-audit',
    )
  if (
    !Number.isInteger(count) ||
    count < 1 ||
    count > 1000 ||
    !Number.isInteger(workers) ||
    workers < 1 ||
    workers > 8
  )
    throw Error('Invalid sample or worker count')
  const ids = arg('--strategies', '').split(',').filter(Boolean),
    policies = AUDIT_STRATEGIES.filter((p) => !ids.length || ids.includes(p.id))
  if (!policies.length) throw Error('No strategies selected')
  const seeds = pilot
    ? [1, 7, 42, 91, 731, 2026].slice(0, count)
    : Array.from({ length: count }, (_, i) => 10001 + i)
  if (seeds.length !== count) throw Error('Pilot supports at most six fixed seeds')
  const files = [
    'src/features/arcade/tower-defense-engine.ts',
    'src/features/arcade/tower-defense-towers.ts',
    'src/features/arcade/tower-defense-waves.ts',
    'src/features/arcade/tower-defense-flight.ts',
    'scripts/tower-defense-mixed-strategy.ts',
    'scripts/tower-defense-strategy-audit.ts',
    'scripts/tower-defense-audit-statistics.mjs',
    'scripts/analyze-tower-defense-campaign.mjs',
  ]
  const hash = () =>
      files.map((file) => ({
        file,
        sha256: createHash('sha256').update(fs.readFileSync(file)).digest('hex'),
      })),
    sources = hash(),
    started = performance.now(),
    generatedAt = new Date().toISOString()
  fs.mkdirSync(output, { recursive: true })
  fs.writeFileSync(`${output}/runs.ndjson`, '')
  const jobs = policies.flatMap((policy) => seeds.map((seed) => ({ seed, policy }))),
    records = new Array(jobs.length)
  let cursor = 0,
    completed = 0
  const pool = []
  try {
    await new Promise((resolve, reject) => {
      for (let i = 0; i < Math.min(workers, jobs.length); i++) {
        const worker = new Worker(new URL(import.meta.url), {
          execArgv: ['--disable-warning=ExperimentalWarning', '--experimental-strip-types'],
        })
        pool.push(worker)
        const next = () => {
          if (cursor < jobs.length) {
            const index = cursor++
            worker.postMessage({ index, ...jobs[index] })
          }
        }
        worker.on('error', reject)
        worker.on('message', ({ index, record, error }) => {
          if (error) {
            reject(Error(error))
            return
          }
          if (record.timedOut) {
            reject(Error('Campaign timed out ' + record.strategy + ' ' + record.seed))
            return
          }
          records[index] = record
          completed++
          fs.appendFileSync(`${output}/runs.ndjson`, JSON.stringify(record) + '\n')
          const progress = {
            completed,
            total: jobs.length,
            seconds: Number(((performance.now() - started) / 1000).toFixed(1)),
            last: {
              strategy: record.strategy,
              seed: record.seed,
              reached: record.reached,
              cleared: record.cleared,
              phase: record.phase,
              gold: record.gold,
            },
          }
          fs.writeFileSync(`${output}/progress.json`, JSON.stringify(progress, null, 2) + '\n')
          if (completed % 8 === 0 || completed === jobs.length)
            console.log(JSON.stringify(progress))
          if (completed === jobs.length) resolve()
          else next()
        })
        next()
      }
    })
  } finally {
    await Promise.allSettled(pool.map((w) => w.terminate()))
  }
  if (JSON.stringify(hash()) !== JSON.stringify(sources))
    throw Error('Sources changed during experiment; results must not be published')
  const summaries = policies.map((policy) => ({
    ...policy,
    ...summarize(records.filter((r) => r.strategy === policy.id)),
  }))
  for (const summary of summaries) {
    let prior = summary.n
    for (const w of summary.waves) {
      if (w.reached !== prior || w.cleared > w.reached) throw Error('Non-conserving stage counts')
      prior = w.cleared
    }
  }
  const report = {
    generatedAt,
    completedAt: new Date().toISOString(),
    seconds: Number(((performance.now() - started) / 1000).toFixed(2)),
    pilot,
    sources,
    seeds,
    configuration: {
      runsPerStrategy: count,
      strategies: policies.length,
      workers,
      fixedStepSeconds: 0.05,
      startingWave: 1,
      startingGold: 180,
      startingCastleHp: 15,
      startingCastleLevel: 0,
      preparation:
        'Between-wave purchases use normal commands and earned income. The optional 20-second wait is skipped using the normal start button.',
      reaction:
        'Only the reactive strategy buys during combat, at most one action per two simulated seconds. No combat rerouting, selling, injected gold, HP overrides or enemy overrides.',
      sampling:
        'Fixed algorithmic policies; seed variation changes enemy ordering, routes, and the random-placement policy. This is not an estimate of human win rates.',
      confidence:
        '95% Wilson intervals; conditional probabilities use only campaigns that reached that stage. No arrivals means unmeasured, not 0%.',
    },
    summaries,
    representatives: summaries.map((summary) => {
      const runs = records
        .filter((r) => r.strategy === summary.id)
        .sort((a, b) => a.reached - b.reached || a.seed - b.seed)
      return runs[Math.floor(runs.length / 2)]
    }),
  }
  fs.writeFileSync(`${output}/report.json`, JSON.stringify(report, null, 2) + '\n')
  const lines = [
    'strategy,wave,reached,cleared,failed,cumulative_rate,conditional_rate,conditional_ci_low,conditional_ci_high,no_leak_successes,no_leak_rate,median_entry_hp,median_exit_hp,median_gold,median_route_tiles',
  ]
  for (const s of summaries)
    for (const w of s.waves)
      lines.push(
        [
          s.id,
          w.wave,
          w.reached,
          w.cleared,
          w.failed,
          w.cumulative.rate,
          w.conditional.rate,
          w.conditional.low,
          w.conditional.high,
          w.noLeak.successes,
          w.noLeak.rate,
          w.medianEntryHp,
          w.medianExitHp,
          w.medianGold,
          w.medianRouteTiles,
        ]
          .map((v) => v ?? '')
          .join(','),
      )
  fs.writeFileSync(`${output}/waves.csv`, lines.join('\n') + '\n')
  console.log(
    JSON.stringify(
      {
        output,
        seconds: report.seconds,
        summaries: summaries.map(
          ({
            id,
            n,
            medianReached,
            medianCleared,
            minReached,
            maxReached,
            win,
            medianGold,
            failureWaves,
          }) => ({
            id,
            n,
            medianReached,
            medianCleared,
            minReached,
            maxReached,
            win,
            medianGold,
            failureWaves,
          }),
        ),
      },
      null,
      2,
    ),
  )
}
