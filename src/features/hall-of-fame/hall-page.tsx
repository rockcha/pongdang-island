import {useRef,useState} from 'react'
import {PlayerIdentityLink} from '@/features/profile/player-identity-link'
import {HallCategoryIcon,HallTabIcon} from './hall-category-icon'
import {Crown,RefreshCw} from 'lucide-react'
import { useAuth } from '@/components/auth-provider'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { PlayerAvatar } from '@/features/profile/player-avatar'
import {hallError,readHall,type HallPlayer,type PersonalHallRank} from './api'
import {useAccountResource} from '@/lib/account-query'
import {Dialog,DialogContent,DialogHeader,DialogTitle,DialogDescription} from '@/components/ui/dialog'
import { formatHallValue, funCategories, hallCategories, type HallCategory } from './categories'

function RankingCard({category,players}:{category:HallCategory;players:HallPlayer[]}) {
  const {session}=useAuth()
  return (
    <section className="rounded-2xl border border-border/70 bg-card px-4 pb-4 pt-4">
      <div className="mb-4 flex items-start gap-2.5">
        <HallCategoryIcon category={category}/>
        <div className="min-w-0">
          <h3 className="text-sm font-medium">{category.label}</h3>
          <p className="mt-1 text-xs leading-5 text-muted-foreground">{category.title}</p>
        </div>
      </div>
      {players.length ? (
        <ol className="grid grid-cols-5 gap-1 pt-3">
          {players.map((player) => (
            <li key={player.id} className="min-w-0">
              <PlayerIdentityLink
                to={player.id === session?.user.id ? '/aquarium' : `/friends/${player.id}/aquarium`}
                title={`${player.nickname} 아쿠아리움 방문`}
                className="flex min-h-24 w-full min-w-0 flex-col items-center rounded-xl py-1 transition-colors hover:bg-secondary/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                label={`${player.rank}위 ${player.nickname}, ${formatHallValue(player.value, category.unit)}`}
              >
                <span className="relative">
                  {player.rank === 1 && (
                    <Crown
                      aria-label="1등 왕관"
                      className="pointer-events-none absolute -top-4 left-1/2 z-10 size-6 -translate-x-1/2 -rotate-6 fill-amber-300 text-amber-600 drop-shadow-sm"
                      strokeWidth={1.5}
                    />
                  )}
                  <PlayerAvatar level={player.level} levelProgress={player.levelProgress} userId={player.id}
                    nickname={player.nickname}
                    path={player.avatar_path}
                    className={`size-10 ring-2 ${player.rank === 1 ? 'ring-amber-300/80' : 'ring-secondary'}`}
                  />
                  <span
                    className={`absolute -bottom-1 -right-1 flex size-4 items-center justify-center rounded-full border-2 border-card text-[9px] tabular-nums ${player.rank === 1 ? 'bg-amber-200 text-amber-950' : 'bg-secondary text-muted-foreground'}`}
                  >
                    {player.rank}
                  </span>
                </span>
                <span className="mt-1 flex w-full min-w-0 items-center justify-center gap-0.5 text-[10px]"><span className="truncate">
                  {player.nickname}
                </span></span>
                <span
                  className="mt-0.5 w-full truncate text-center text-[10px] tabular-nums text-primary"
                  title={formatHallValue(player.value, category.unit)}
                >
                  {formatHallValue(player.value, category.unit)}
                </span>
              </PlayerIdentityLink>
            </li>
          ))}
        </ol>
      ) : (
        <p className="py-5 text-center text-xs text-muted-foreground">
          첫 기록의 주인공을 기다리고 있어요.
        </p>
      )}
      <details className="mt-2 text-[10px] leading-relaxed text-muted-foreground">
        <summary className="min-h-6 cursor-pointer">집계 기준</summary>
        <p className="pt-1">{category.description}</p>
      </details>
    </section>
  )
}

export function HallPage() {
  const query = useAccountResource('hall',readHall)
  const feed=query.data, error=query.error?hallError(query.error):'', loading=query.isFetching
  const [tab,setTab]=useState('honor')
  const [categoryId,setCategoryId]=useState<string>(hallCategories[0].id)
  const categories=tab==='honor'?hallCategories:funCategories
  const category=categories.find(item=>item.id===categoryId)??categories[0]
  const list = useRef<HTMLDivElement>(null)
  function refresh() {
    void query.refetch()
  }
  return (
    <Tabs
      defaultValue="honor"
      onValueChange={(value) => {
        setTab(value)
        setCategoryId((value==='honor'?hallCategories:funCategories)[0].id)
        if (list.current) list.current.scrollTop = 0
      }}
      className="flex min-h-0 flex-1 flex-col overflow-hidden"
    >
      <div className="shrink-0 border-b border-border/60 bg-background px-4 pt-4 pb-2">
        <TabsList aria-label="기록 분류" className="mb-3 gap-1 rounded-xl p-1.5">
          <TabsTrigger value="honor" className="min-h-14 gap-2 rounded-lg px-2 text-sm font-medium">
            <HallTabIcon kind="honor"/>
            명예로운 기록
          </TabsTrigger>
          <TabsTrigger value="fun" className="min-h-14 gap-2 rounded-lg px-2 text-sm font-medium">
            <HallTabIcon kind="fun"/>
            별별 기록
          </TabsTrigger>
        </TabsList>
        <div className="flex items-center gap-3">
          <div className="min-w-0 flex-1">
            <p className="text-[11px] leading-relaxed text-muted-foreground">
              각 부문의 TOP 5 기록을 확인해요.
            </p>
          </div>
          <Button
            variant="ghost"
            size="icon"
            aria-label="순위 새로고침"
            disabled={loading}
            onClick={refresh}
          >
            <RefreshCw
              className={`size-4 text-muted-foreground ${loading ? 'motion-safe:animate-spin' : ''}`}
            />
          </Button>
        </div>
      </div>
      <div className="shrink-0 border-b border-border/60 px-4 py-3">
        <PersonalRank key={category.id} category={category} categories={categories} onCategory={setCategoryId} record={feed?.personal?.[category.id]} loading={!feed&&loading} failed={!feed&&!!error}/>
      </div>
      <div
        ref={list}
        className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 pt-4 pb-8"
        aria-label="기록 목록"
      >
        {error && (
          <div
            role="alert"
            className="mb-4 rounded-xl border border-border p-4 text-center text-xs"
          >
            <p>{error}</p>
            <Button variant="ghost" disabled={loading} onClick={refresh}>
              다시 불러오기
            </Button>
          </div>
        )}
        {!feed && loading ? (
          <div role="status" aria-label="순위를 불러오는 중" className="space-y-3">
            {Array.from({ length: 3 }, (_, i) => (
              <div key={i} className="h-44 rounded-2xl bg-secondary/60 motion-safe:animate-pulse" />
            ))}
          </div>
        ) : (
          feed && (
            <>
              <TabsContent value="honor" className="mt-0 space-y-3">
                {hallCategories.map((category) => (
                  <RankingCard
                    key={category.id}
                    category={category}
                    players={feed.rankings[category.id] ?? []}
                  />
                ))}
              </TabsContent>
              <TabsContent value="fun" className="mt-0 space-y-3">
                {funCategories.map((category) => (
                  <RankingCard
                    key={category.id}
                    category={category}
                    players={feed.rankings[category.id] ?? []}
                  />
                ))}
              </TabsContent>
              <p className="mt-5 text-center text-[10px] leading-relaxed text-muted-foreground">
                누적 기록 기준 · 같은 기록은 먼저 가입한 퐁이 순<br />
                {new Date(feed.generatedAt).toLocaleTimeString('ko-KR', {
                  timeZone: 'Asia/Seoul',
                  hour: '2-digit',
                  minute: '2-digit',
                })}{' '}
                기준
              </p>
            </>
          )
        )}
      </div>
    </Tabs>
  )
}

function PersonalRank({category,categories,onCategory,record,loading,failed}:{category:HallCategory;categories:readonly HallCategory[];onCategory:(id:string)=>void;record?:PersonalHallRank;loading:boolean;failed:boolean}) {
  const {session}=useAuth()
  const [open,setOpen]=useState(false)
  const hasRecord=(record?.value??0)>0
  return <section aria-label="내 순위" className="rounded-2xl border border-primary/20 bg-primary/5 p-3">
    <div className="flex items-center justify-between gap-2">
      <label className="min-w-0 flex-1 text-xs text-muted-foreground">내 순위 · 누적
        <select aria-label="내 순위 종목" value={category.id} onChange={event=>onCategory(event.target.value)} className="mt-1 block min-h-10 w-full rounded-lg border border-border bg-background px-2 text-sm text-foreground">
          {categories.map(item=><option key={item.id} value={item.id}>{item.label}</option>)}
        </select>
      </label>
      <Button variant="outline" size="sm" className="mt-4 shrink-0" disabled={!record?.rank||!record.neighbors.length} onClick={()=>setOpen(true)}>내 주변 보기</Button>
    </div>
    <p className="mt-2 text-sm font-medium" aria-live="polite">{loading?'내 순위를 불러오는 중…':failed?'내 순위를 불러오지 못했어요':!hasRecord?'아직 기록이 없어요':record?.rank?`내 순위 ${record.rank.toLocaleString('ko-KR')}위 · 내 기록 ${formatHallValue(record.value!,category.unit)}`:`집계 범위 밖 · 내 기록 ${formatHallValue(record!.value!,category.unit)}`}</p>
    <Dialog open={open} onOpenChange={setOpen}><DialogContent className="max-h-[80dvh] overflow-y-auto sm:max-w-md">
      <DialogHeader><DialogTitle>내 주변 순위</DialogTitle><DialogDescription>{category.label} · 누적 기록 기준</DialogDescription></DialogHeader>
      <ol className="space-y-2">{record?.neighbors.map(player=><li key={player.id} aria-current={player.id===session?.user.id?'true':undefined} className={`rounded-xl p-3 ${player.id===session?.user.id?'bg-primary/10 ring-1 ring-primary/30':'bg-secondary/30'}`}>
        <PlayerIdentityLink to={player.id===session?.user.id?'/aquarium':`/friends/${player.id}/aquarium`} title={`${player.nickname} 어항 방문`} label={`${player.rank}위 ${player.nickname}, ${formatHallValue(player.value,category.unit)}`} className="flex items-center gap-3">
          <span className="w-10 shrink-0 text-xs tabular-nums">{player.rank}위</span><PlayerAvatar userId={player.id} nickname={player.nickname} path={player.avatar_path} level={player.level} levelProgress={player.levelProgress} className="size-9"/>
          <span className="min-w-0 flex-1 truncate text-sm">{player.nickname}{player.id===session?.user.id?' · 나':''}</span><span className="shrink-0 text-xs tabular-nums text-primary">{formatHallValue(player.value,category.unit)}</span>
        </PlayerIdentityLink>
      </li>)}</ol>
    </DialogContent></Dialog>
  </section>
}
