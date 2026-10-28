import fs from 'node:fs'
import assert from 'node:assert/strict'
import { createHash } from 'node:crypto'
const models = JSON.parse(fs.readFileSync('supabase/voyage-bets/generated/models.json', 'utf8'))
const hash = (s) => createHash('sha256').update(s).digest('hex')
function random(seed) {
  let a = parseInt(hash(seed).slice(0, 8), 16)
  return () => {
    a = (a + 0x6d2b79f5) >>> 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t ^= t + Math.imul(t ^ (t >>> 7), 61 | t)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}
const pick = (a, r) => a[Math.floor(r() * a.length)]
function cdf(values, v) {
  let lo = 0,
    hi = values.length
  while (lo < hi) {
    const mid = (lo + hi) >>> 1
    if (values[mid] <= v) lo = mid + 1
    else hi = mid
  }
  return lo / values.length
}
const calibrations = [],
  reports = []
for (const model of models) {
  const m = model.data,
    regions = Object.keys(m.regions),
    groups = m.companies.map((c) => ({
      id: c.id,
      options: m.options.filter((o) => o.companyId === c.id),
      plans: [],
    })),
    pools = {}
  // Precomputed weighted sale pools keep calibration fast without changing server draws.
  for (const bid of Object.keys(m.baits))
    for (const region of regions) {
      const b = m.baits[bid],
        outcomes = []
      for (const grade of ['common', 'rare', 'epic', 'mythic']) {
        if (!b[grade]) continue
        const g = m.pools[bid][grade],
          sets = [
            g.shared,
            g.home[region],
            g.native.filter((id) => m.species[id].region !== region),
          ],
          weights = [80, 25, 5],
          mass = sets.reduce((n, a, i) => n + (a.length ? weights[i] : 0), 0)
        sets.forEach((a, i) =>
          a.forEach((id) =>
            outcomes.push({
              price: m.species[id].price,
              p: ((b[grade] / 10000) * weights[i]) / mass / a.length,
            }),
          ),
        )
      }
      let sum = 0
      const values = outcomes.map((o) => ({ price: o.price, cdf: (sum += o.p) }))
      values.at(-1).cdf = 1
      pools[bid + ':' + region] = values
    }
  function fastDraw(bid, region, r) {
    const a = pools[bid + ':' + region],
      v = r()
    let lo = 0,
      hi = a.length - 1
    while (lo < hi) {
      const mid = (lo + hi) >>> 1
      if (v < a[mid].cdf) hi = mid
      else lo = mid + 1
    }
    return a[lo].price
  }
  for (const group of groups)
    for (const option of group.options)
      for (const n of option.counts) {
        const bid = option.baitId,
          banks = regions.map((region) => {
            const r = random(model.id + bid + n + region + '/rank-bank'),
              bank = []
            for (let k = 0; k < 4096; k++) {
              let sale = 0
              for (let j = 0; j < n; j++) sale += fastDraw(bid, region, r)
              bank.push(sale)
            }
            return bank
          })
        for (let i = 0; i < regions.length; i++) {
          const key = bid + ':' + n + ':' + regions[i],
            r = random(model.id + key + '/rank-train'),
            totals = [],
            second = [],
            first = [...banks[i]].sort((a, b) => a - b)
          for (let k = 0; k < 2048; k++) {
            const other = regions.map((_, j) => j).filter((j) => j !== i),
              h1 = other.splice(Math.floor(r() * other.length), 1)[0],
              h2 = pick(other, r),
              a = pick(banks[i], r),
              b = pick(banks[h1], r),
              c = pick(banks[h2], r)
            totals.push(a + b + c)
            second.push(a + b)
          }
          second.sort((a, b) => a - b)
          const radius = (option.counts.length - 1) / 2,
            weight =
              (radius + 1 - Math.abs(n - option.base)) /
              (radius + 1) ** 2 /
              group.options.length /
              regions.length
          group.plans.push({
            key,
            bid,
            n,
            region: regions[i],
            base: m.targets[key],
            first: first[2048],
            second: second[1024],
            totals,
            factor: 1,
            weight,
          })
        }
      }
  const choose = (g, r) => {
    let u = r()
    for (const p of g.plans) {
      u -= p.weight
      if (u <= 0) return p
    }
    return g.plans.at(-1)
  }
  // Equalize expected 3x/1.2x reward, rather than pretending that differing
  // company variances make first and second place independently uniform.
  for (let iteration = 0; iteration < 7; iteration++) {
    const mixtures = groups.map((g) => {
      const r = random(model.id + g.id + '/mixture/' + iteration),
        a = []
      for (let k = 0; k < 65536; k++) {
        const p = choose(g, r)
        a.push(pick(p.totals, r) / (p.base * p.factor))
      }
      return a.sort((a, b) => a - b)
    })
    const curves = groups.map((_, i) =>
      Array.from({ length: 4097 }, (_, k) => {
        const f = mixtures.filter((_, j) => i !== j).map((a) => cdf(a, (k * 4) / 4096)),
          first = f[0] * f[1] * f[2],
          second = f.reduce(
            (s, v, j) => s + (1 - v) * f.filter((_, q) => q !== j).reduce((a, b) => a * b, 1),
            0,
          )
        return 3 * first + 1.2 * second
      }),
    )
    for (let i = 0; i < groups.length; i++)
      for (const p of groups[i].plans) {
        const payoff = (factor) => {
          let sum = 0
          for (let k = 0; k < p.totals.length; k += 2) {
            const x = Math.min(4096, (p.totals[k] / (p.base * factor)) * 1024),
              a = Math.floor(x),
              fraction = x - a
            sum += curves[i][a] * (1 - fraction) + curves[i][Math.min(4096, a + 1)] * fraction
          }
          return sum / (p.totals.length / 2)
        }
        let low = 0.1,
          high = 5
        for (let k = 0; k < 20; k++) {
          const mid = (low + high) / 2
          if (payoff(mid) > 1.05) low = mid
          else high = mid
        }
        p.next = Math.sqrt((p.factor * (low + high)) / 2)
      }
    for (const g of groups) for (const p of g.plans) p.factor = p.next
  }
  const targets = {}
  for (const g of groups)
    for (const p of g.plans) {
      const t3 = Math.max(3, Math.round(p.base * p.factor)),
        t1 = Math.max(1, Math.min(t3 - 2, Math.round(p.first * p.factor))),
        t2 = Math.max(t1 + 1, Math.min(t3 - 1, Math.round(p.second * p.factor)))
      targets[p.key] = [t1, t2, t3]
    }
  const stats = groups.map((g) => ({ companyId: g.id, ranks: [0, 0, 0, 0], payout: 0, ties: 0 })),
    r = random(model.id + '/independent-full-draw-races')
  const samples = 32768
  for (let k = 0; k < samples; k++) {
    const race = groups.map((g) => {
      const p = choose(g, r),
        other = regions.filter((x) => x !== p.region),
        a = other.splice(Math.floor(r() * other.length), 1)[0],
        b = pick(other, r)
      let sale = 0
      for (const region of [p.region, a, b])
        for (let j = 0; j < p.n; j++) sale += fastDraw(p.bid, region, r)
      return { sale, target: targets[p.key][2] }
    })
    const ranks = race.map(
        (p) => 1 + race.filter((q) => q.sale * p.target > p.sale * q.target).length,
      ),
      tie = race.some(
        (p, i) =>
          ranks[i] <= 2 && race.some((q, j) => i !== j && q.sale * p.target === p.sale * q.target),
      )
    for (let i = 0; i < 4; i++) {
      stats[i].ranks[ranks[i] - 1]++
      stats[i].payout += tie ? 1 : ranks[i] === 1 ? 3 : ranks[i] === 2 ? 1.2 : 0
      if (tie) stats[i].ties++
    }
  }
  const report = {
    modelId: model.id,
    samples,
    companies: stats.map((s) => ({
      companyId: s.companyId,
      rankProbabilities: s.ranks.map((n) => n / samples),
      expectedPayout: s.payout / samples,
      tieRate: s.ties / samples,
    })),
  }
  assert.ok(
    report.companies.every((s) => s.expectedPayout > 0.96 && s.expectedPayout < 1.14),
    'Review ranking payout imbalance: ' + JSON.stringify(report),
  )
  const data = {
    version: 1,
    targets,
    firstMultiplier: 3,
    secondMultiplier: 1.2,
    method:
      'Public-information conditional stage medians, calibrated for equal expected ranking reward; no hidden region or actual outcome conditioning',
  }
  calibrations.push({ modelId: model.id, id: hash(JSON.stringify(data)), data })
  reports.push(report)
  console.log(JSON.stringify(report))
}
fs.writeFileSync(
  'supabase/voyage-bets/generated/rank-calibrations.json',
  JSON.stringify(calibrations) + '\n',
)
fs.writeFileSync(
  'artifacts/voyage-bets/rank-balance-validation.json',
  JSON.stringify(reports, null, 2) + '\n',
)
