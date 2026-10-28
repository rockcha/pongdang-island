import type { VoyageState } from '@/features/voyage-bets/api'
import { voyageTestSteps, type VoyageTestSample } from '@/features/voyage-bets/voyage-test-api'
import companies from '../../supabase/voyage-bets/companies.json'
export function makeVoyageTestSample(): VoyageTestSample {
  const departure = Date.parse('2026-10-30T00:00:00Z'),
    times = [
      departure - 3601000,
      departure - 3599000,
      departure,
      departure + 3600000,
      departure + 7200000,
      departure + 10800000,
    ]
  const sample = {} as VoyageTestSample
  voyageTestSteps.forEach((step, i) => {
    const stage = Math.max(0, i - 2),
      phase = i === 0 ? 'scheduled' : i === 1 ? 'open' : i === 5 ? 'settled' : 'sailing'
    const data: VoyageState = {
      serverNow: new Date(times[i]).toISOString(),
      companies,
      roundLimit: 500,
      firstMultiplier: 3,
      secondMultiplier: 1.2,
      pendingPayout: 0,
      rounds: [
        {
          id: 'sample-round',
          opensAt: new Date(departure - 3600000).toISOString(),
          departsAt: new Date(departure).toISOString(),
          resultsAt: new Date(departure + 10800000).toISOString(),
          phase,
          completedRegions: stage,
          nextRevealAt:
            stage < 3 ? new Date(departure + (stage + 1) * 3600000).toISOString() : null,
          refunded: false,
          myStake: 0,
          myBet: null,
          plans: companies.map((c, j) => {
            const regions = Array.from({ length: stage }, (_, n) => ({
                regionId: 'region-' + n,
                regionName: '공개 해역 ' + n,
                sales: 2000 - j * 100,
                catches: [],
              })),
              sales = regions.reduce((n, r) => n + r.sales, 0)
            return {
              id: 'plan-' + j,
              companyId: c.id,
              bait: i > 0 ? { id: 'bait', name: '테스트 미끼', price: 50 } : null,
              countPerRegion: i > 0 ? 30 : null,
              publicRegion: i > 0 ? { id: 'region-0', name: '공개 해역 0' } : null,
              targetSales: i > 0 ? 5000 : null,
              totalCost: i > 0 ? 4600 : null,
              progress:
                stage > 0
                  ? {
                      sales,
                      target: 1500 * stage,
                      achievement: (sales / (1500 * stage)) * 100,
                      rank: j + 1,
                      tied: false,
                      regions,
                    }
                  : null,
              result:
                stage === 3
                  ? { sales, profit: sales - 4600, rank: j + 1, tied: false, regions }
                  : null,
            }
          }),
        },
      ],
    }
    sample[step.id] = data
  })
  return sample
}
