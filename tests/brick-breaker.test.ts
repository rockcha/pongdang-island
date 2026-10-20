import {expect,it} from 'vitest'
import {BOARD,BRICK,BrickPractice,brickDrop,pufferRadius,pufferFrame,itemDrop,hazardTouches,HAZARD_KINDS} from '@/features/arcade/brick-breaker-model'
import type {DropKind} from '@/features/arcade/brick-breaker-model'

function weakenBrick(game:BrickPractice,hp:number){const brick=game.bricks[0];brick.hp=hp;return brick}
function torpedoGame(side:'left'|'right'){
 const rolls=[0.9,0.1,0.86],game=new BrickPractice(()=>rolls.shift()??0.9)
 game.launch();game.ball={x:20,y:240,vx:0,vy:0}
 game.bricks=[{id:1,x:side==='left'?50:270,y:60,hp:1,maxHp:4},{id:2,x:150,y:100,hp:4,maxHp:4}]
 game.hitBrick(1)
 return game
}
function collect(game:BrickPractice,kind:DropKind){game.drops.push({id:900+game.drops.length,kind,x:game.paddleX,y:game.paddleY,warning:0});game.step(1/120)}
function advance(game:BrickPractice,seconds:number){for(let i=0;i<Math.ceil(seconds*100);i++)game.step(0.01)}
function catchLabDrop(game:BrickPractice,kind:DropKind){game.previewSkill(kind);advance(game,3)}
function stillGame(){const game=new BrickPractice(()=>0.9);game.launch();game.ball={x:20,y:240,vx:0,vy:0};return game}
function splitAtPaddle(game:BrickPractice){
 collect(game,'split')
 game.ball={x:game.paddleX,y:game.paddleY-12,vx:0,vy:300}
 game.step(1/120)
}

it('keeps the laboratory free of gameplay balls even after launch and skill previews',()=>{
 const game=new BrickPractice(()=>0.9);game.enterLaboratory()
 for(const kind of ['split','magnet','seaweed','wide','heart','wave','shark','urchin'] as const){
  game.previewSkill(kind);game.launch();advance(game,2)
  expect(game.balls).toHaveLength(0)
  expect(game.lives).toBe(3)

 }
 expect(game.phase).toBe('playing')
})

it('only activates laboratory skills after catching their drops and never ends a laboratory round',()=>{
 const game=new BrickPractice(()=>0.9);game.enterLaboratory();game.previewSkill('item')
 expect(game.shots).toHaveLength(0);expect(game.drops[0].y).toBe(48)
 advance(game,1);expect(game.shots).toHaveLength(0)
 advance(game,2)
 expect(game.shots).toHaveLength(2)
 catchLabDrop(game,'wave');expect(game.waveShots).toHaveLength(1)
 game.bricks=[{id:1,x:159,y:200,hp:1,maxHp:1}]
 advance(game,1)
 expect(game.bricks).toHaveLength(0);expect(game.phase).toBe('playing')
 expect(game.score()).toMatchObject({lives:3,held:false})
})

it('does not activate a missed laboratory item or start its preview animation early',()=>{
 const game=new BrickPractice();game.enterLaboratory();game.move(260);game.previewSkill('wide')
 expect(game.drops[0]).toMatchObject({kind:'wide',x:260,y:48})
 expect(game.previewKind).toBeNull();expect(game.wideSeconds).toBe(0)
 game.move(80);advance(game,4)
 expect(game.drops).toHaveLength(0);expect(game.wideSeconds).toBe(0);expect(game.previewKind).toBeNull()
 expect(game.balls).toHaveLength(0)
 game.previewSkill('split');expect(game.splitArmed).toBe(false)
 advance(game,3);expect(game.splitArmed).toBe(true);expect(game.previewKind).toBe('split')
 expect(game.previewSeconds).toBeGreaterThan(1);expect(game.balls).toHaveLength(0)
})

it('starts round one at two durability and does not award gold for individual bricks',()=>{
 const game=new BrickPractice(()=>0.9);game.launch()
 expect(new Set(game.bricks.map(b=>b.hp))).toEqual(new Set([2]))
 const brick=game.bricks[0]
 game.hitBrick(brick.id)
 expect(brick.hp).toBe(1)
 game.hitBrick(brick.id);expect(game.bricks).not.toContain(brick);expect(game.reward).toBe(0)
})

it('progresses through five balanced rounds, grants fixed clear rewards and ends at round five',()=>{
 const game=new BrickPractice(()=>0.9)
 const expected=[{2:24},{2:12,3:12},{3:24},{3:12,4:12},{4:24}]
 let reward=0
 for(let round=1;round<=5;round++){
  const counts:Record<number,number>={}
  for(const brick of game.bricks)counts[brick.hp]=(counts[brick.hp]??0)+1
  expect(counts).toEqual(expected[round-1]);expect(game.round).toBe(round)
  game.launch()
  for(const brick of [...game.bricks])for(let i=0;i<brick.maxHp;i++)game.hitBrick(brick.id)
  reward+=[30,50,70,100,150][round-1]
  expect(game.score()).toMatchObject({phase:'round-clear',reward,roundReward:[30,50,70,100,150][round-1]})
  game.nextRound()
 }
 expect(game.phase).toBe('banked');expect(game.round).toBe(5);expect(game.reward).toBe(400)
 game.nextRound();expect(game.round).toBe(5)
})

it('reports active buff and debuff icons with rounded remaining times and removes expired effects',()=>{
 const game=stillGame();collect(game,'wide');collect(game,'sticky');collect(game,'shield')
 expect(game.score().effects).toEqual(expect.arrayContaining([{kind:'wide',label:'긴 널판지',seconds:8},{kind:'sticky',label:'끈끈이',seconds:6},{kind:'shield',label:'보호막 1회'}]))
 advance(game,6.1)
 expect(game.score().effects?.some(effect=>effect.kind==='sticky')).toBe(false)
 expect(game.score().effects?.some(effect=>effect.kind==='wide')).toBe(true)
})
it('gives exclusive 15 percent hazard and 15 percent item categories',()=>{
 const drops=Array.from({length:100},(_,i)=>brickDrop(i/100))
 expect(drops.filter(d=>d==='shark')).toHaveLength(15)
 expect(drops.filter(d=>d==='item')).toHaveLength(15)
 expect(drops.filter(d=>d===null)).toHaveLength(70)
})
it('retains cleared round gold after losing all lives in the next round',()=>{
 const game=new BrickPractice(()=>0.9);game.launch()
 for(const brick of [...game.bricks])for(let i=0;i<brick.maxHp;i++)game.hitBrick(brick.id)
 expect(game.score()).toMatchObject({phase:'round-clear',reward:30})
 game.nextRound();game.launch();expect(game.round).toBe(2)
 const brick=game.bricks[0];for(let i=0;i<brick.maxHp;i++)game.hitBrick(brick.id)

 for(let i=0;i<3;i++){game.invulnerable=0;game.damage();if(i<2){game.launch()}}
 expect(game.score()).toMatchObject({phase:'over',lives:0,reward:30})
})
it('warns before a shark rush and removes one life on contact',()=>{
 const game=new BrickPractice(()=>0.9);game.launch()
 game.drops.push({id:1,kind:'shark',x:game.paddleX,y:BOARD.paddleY-25,warning:0.45})
 game.step(0.1);expect(game.lives).toBe(3)
 for(let i=0;i<5;i++)game.step(0.1)
 expect(game.lives).toBe(2);expect(game.phase).toBe('ready')
 expect(game.drainFeedback()).toEqual([{kind:'hazard',message:'상어에게 물렸어요 ㅠ'}])
 game.damage();expect(game.lives).toBe(2)
})

it('locks a shark warning onto the paddle at spawn and charges along that fixed line',()=>{
 // Force a shark drop through the normal destroyed-brick selection path.
 const normal=new BrickPractice(()=>0);normal.launch();normal.move(260)
 const target=weakenBrick(normal,1)
 normal.hitBrick(target.id)
 const shark=normal.drops.find(d=>d.kind==='shark')!
 expect(shark.targetX).toBe(260);expect(shark.targetY).toBe(normal.paddleY)
 const start={x:shark.x,y:shark.y},velocity={x:shark.vx!,y:shark.vy!}
 expect(Math.hypot(velocity.x,velocity.y)).toBeCloseTo(440)
 expect(velocity.x/velocity.y).toBeCloseTo((260-start.x)/(normal.paddleY-start.y))
 normal.move(80);normal.step(0.1)
 expect([shark.x,shark.y]).toEqual([start.x,start.y]);expect(shark.targetX).toBe(260)
 advance(normal,0.4)
 const before={x:shark.x,y:shark.y};normal.step(0.05)
 expect(shark.x-before.x).toBeCloseTo(velocity.x*0.05)
 expect(shark.y-before.y).toBeCloseTo(velocity.y*0.05)
 expect(shark.vx).toBe(velocity.x);expect(shark.targetX).toBe(260)
})
it('collecting an item fires two upward torpedoes from paddle edges',()=>{
 const game=new BrickPractice(()=>0.9);game.launch()
 game.drops.push({id:1,kind:'item',x:game.paddleX,y:BOARD.paddleY-18,warning:0})
 game.step(0.01)
 expect(game.shots).toHaveLength(2)
 expect(game.drainFeedback()).toEqual([{kind:'item',message:'수중 미사일 발사!'}])
 expect(game.shots.map(s=>s.x)).toEqual([game.paddleX-32,game.paddleX+32])
 const y=game.shots[0].y;game.step(0.01);expect(game.shots[0].y).toBeLessThan(y)
})
it('reflects a descending ball at the plank and prevents tunnelling at low FPS',()=>{
 const game=new BrickPractice(()=>0.9);game.launch()
 game.ball={x:game.paddleX,y:BOARD.paddleY-26,vx:0,vy:320};game.step(0.1)
 expect(game.ball.vy).toBeLessThan(0);expect(game.lives).toBe(3)
 const brick=weakenBrick(game,1)
 game.bricks=[brick,{id:999,x:300,y:250,hp:4,maxHp:4}]
 game.ball={x:brick.x+25,y:brick.y+40,vx:0,vy:-330};game.step(0.1)

})
it('ends voluntarily only after a round is secured and clamps paddle movement',()=>{
 const game=new BrickPractice(()=>0.9);game.bank();expect(game.phase).toBe('ready')
 game.move(-1000);expect(game.paddleX).toBe(49)
 game.move(1000);expect(game.paddleX).toBe(311)
 game.launch();for(const brick of [...game.bricks])for(let i=0;i<brick.maxHp;i++)game.hitBrick(brick.id)
 game.bank();game.nextRound();expect(game.phase).toBe('banked');
})
it('leaves side lanes wide enough to reach the space above every brick',()=>{
 const game=new BrickPractice(()=>0.9);game.launch()
 const left=Math.min(...game.bricks.map(b=>b.x)),right=Math.max(...game.bricks.map(b=>b.x+BRICK.width))
 expect(left-14).toBeGreaterThan(BOARD.ballRadius*3)
 expect(346-right).toBeGreaterThan(BOARD.ballRadius*3)
 game.ball={x:25,y:220,vx:0,vy:-225}
 for(let i=0;i<8;i++)game.step(0.1)
 expect(game.ball.y).toBeLessThan(Math.min(...game.bricks.map(b=>b.y))-BOARD.ballRadius)
 game.ball.vx=225;game.ball.vy=0
 for(let i=0;i<13;i++)game.step(0.1)
 expect(game.ball.x).toBeGreaterThan(300);expect(game.bricks).toHaveLength(24)
})
it('resizes the playfield without losing durability or round scores',()=>{
 const game=new BrickPractice(()=>0.9);game.launch();game.hitBrick(weakenBrick(game,1).id)
 const hp=game.bricks.map(b=>b.hp);game.resize(380)
 expect(game.height).toBe(380);expect(game.paddleY).toBe(319);
 expect(game.bricks.map(b=>b.hp)).toEqual(hp)
 game.damage();expect(game.ball.y).toBe(game.paddleY-16)
})
it('emits separate impact and destruction events for ball and torpedo effects',()=>{
 const game=new BrickPractice(()=>0.9);game.launch();const brick=weakenBrick(game,2)
 game.hitBrick(brick.id);expect(game.drainImpacts()).toMatchObject([{brickId:brick.id,hp:1,destroyed:false}])
 expect(game.drainImpacts()).toEqual([])
 game.hitBrick(brick.id);expect(game.drainImpacts()).toMatchObject([{brickId:brick.id,hp:0,destroyed:true}])
})
it('marks a real torpedo collision for explosion effects while dealing one damage',()=>{
 const game=new BrickPractice(()=>0.9);game.launch();const brick=weakenBrick(game,2)
 game.shots.push({id:1,x:brick.x+BRICK.width/2,y:brick.y+BRICK.height+4})
 game.step(1/120)
 expect(game.shots).toHaveLength(0)
 expect(brick.hp).toBe(1);
 expect(game.drainImpacts()).toMatchObject([{brickId:brick.id,source:'torpedo',destroyed:false}])
})
it('spawns practice test drops in front of the paddle without changing score or lives',()=>{
 const game=new BrickPractice(()=>0.9)
 game.spawnTestDrop('item');game.spawnTestDrop('shark')
 expect(game.phase).toBe('playing')
 expect(game.drops.map(d=>d.kind)).toEqual(['item','shark'])
 expect(game.drops.every(d=>d.x===game.paddleX&&d.y<game.paddleY)).toBe(true)
 expect(game.drops[1].warning).toBeGreaterThan(0)
 expect(game.score()).toMatchObject({lives:3,})
 game.phase='over';game.spawnTestDrop('item');expect(game.drops).toHaveLength(2)
})
it('does not announce a missed drop or an invulnerable shark collision',()=>{
 const game=new BrickPractice(()=>0.9);game.launch()
 game.drops.push({id:1,kind:'item',x:10,y:game.paddleY,warning:0})
 game.step(0.01);expect(game.drainFeedback()).toEqual([])
 game.invulnerable=1
 game.drops.push({id:2,kind:'shark',x:game.paddleX,y:game.paddleY-5,warning:0})
 game.step(0.01);expect(game.lives).toBe(3);expect(game.drainFeedback()).toEqual([])
})

it('extends the actual collision surface for eight seconds and refreshes without stacking',()=>{
 const game=stillGame();collect(game,'wide');expect(game.paddleWidth).toBe(124)
 game.ball={x:game.paddleX+54,y:game.paddleY-23,vx:0,vy:300};game.step(0.06)
 expect(game.ball.vy).toBeLessThan(0)
 game.ball={x:20,y:240,vx:0,vy:0};advance(game,4);collect(game,'wide')
 advance(game,7.8);expect(game.paddleWidth).toBe(124)
 game.move(1000);expect(game.paddleX).toBe(290)
 advance(game,0.3);expect(game.paddleWidth).toBe(82)
})

it('blocks one hazard with a shield, then loses a life without losing gold',()=>{
 const game=stillGame();game.reward=70
 collect(game,'shield');collect(game,'shield');collect(game,'urchin')
 expect(game.shield).toBe(false);expect(game.lives).toBe(3)
 advance(game,0.7);collect(game,'urchin')
 expect(game.lives).toBe(2);expect(game.phase).toBe('ready');expect(game.reward).toBe(70)
})

it('shields prevent shark damage, ink and speed effects but do not save a missed ball',()=>{
 for(const kind of ['shark','ink','seaweed'] as const){
  const game=stillGame();collect(game,'shield');collect(game,kind)
  expect(game.lives).toBe(3);expect(game.shield).toBe(false)
  expect(game.inkSeconds).toBe(0);expect(game.fastSeconds).toBe(0)
 }
 const game=stillGame();collect(game,'shield');game.ball.y=game.height+10;game.step(0.01)
 expect(game.lives).toBe(2);expect(game.shield).toBe(false)
})

it('splits into two independently colliding balls and loses a life only after the last ball falls',()=>{
 const game=stillGame();game.ball.vx=100;game.ball.vy=-200
 const speed=(225+35)*1.2;collect(game,'split');collect(game,'split')
 expect(game.balls).toHaveLength(1);expect(game.splitArmed).toBe(true)
 game.hitBrick(weakenBrick(game,4).id,'torpedo')
 expect(game.balls).toHaveLength(1);expect(game.splitArmed).toBe(true)
 splitAtPaddle(game)
 expect(game.balls).toHaveLength(2);expect(Math.hypot(game.balls[1].vx,game.balls[1].vy)).toBeCloseTo(speed)
 expect(game.splitArmed).toBe(false)
 expect([game.balls[1].x,game.balls[1].y]).toEqual([game.ball.x,game.ball.y])
 expect(game.balls[1].vy).toBeLessThan(0)
 collect(game,'split');expect(game.splitArmed).toBe(false);expect(game.balls).toHaveLength(2)
 game.balls[0].y=game.height+10;game.balls[0].vy=200;game.step(0.01)
 expect(game.balls).toHaveLength(1);expect(game.lives).toBe(3)
 game.ball.y=game.height+10;game.ball.vy=200;game.step(0.01)
 expect(game.lives).toBe(2);expect(game.phase).toBe('ready');expect(game.balls).toHaveLength(1)
})

it('both split balls damage bricks and resize with the board',()=>{
 const game=stillGame();splitAtPaddle(game)
 const brick=weakenBrick(game,2)
 game.balls[1]={x:brick.x+BRICK.width/2,y:brick.y+BRICK.height+8,vx:0,vy:-300}
 game.step(0.02);expect(brick.hp).toBe(1)
 const ys=game.balls.map(b=>b.y);game.resize(400)
 game.balls.forEach((b,i)=>expect(b.y).toBeCloseTo(ys[i]*400/BOARD.height))
})

it('throws three rotating urchins along randomized ballistic paths',()=>{
 const game=stillGame();game.spawnTestDrop('urchin')
 expect(game.drops).toHaveLength(3)
 const before=game.drops.map(d=>({...d}));game.step(0.1)
 for(let i=0;i<3;i++){
  expect(game.drops[i].y).toBeLessThan(before[i].y)
  expect(game.drops[i].vy).toBeGreaterThan(before[i].vy!)
  expect(game.drops[i].rotation).toBeGreaterThan(before[i].rotation!)
 }
 expect(new Set(game.drops.map(d=>d.x)).size).toBe(3)
})

it('keeps localized ink patches for six seconds and then restores visibility',()=>{
 const game=stillGame();collect(game,'ink')
 expect(game.inkSeconds).toBeCloseTo(6);expect(game.inkPatches).toHaveLength(2)
 expect(game.inkPatches.every(p=>p.radius<=50&&p.y<game.paddleY)).toBe(true)
 advance(game,5.8);expect(game.inkSeconds).toBeGreaterThan(0)
 advance(game,0.3);expect(game.inkSeconds).toBe(0)
})

it('boosts both balls by 1.5 for six seconds, refreshes without compounding and restores speed',()=>{
 const game=stillGame();game.ball.vx=100;splitAtPaddle(game)
 const speeds=game.balls.map(b=>Math.hypot(b.vx,b.vy))
 collect(game,'seaweed')
 game.balls.forEach((b,i)=>expect(Math.hypot(b.vx,b.vy)).toBeCloseTo(speeds[i]*1.5))
 collect(game,'seaweed');game.balls.forEach((b,i)=>expect(Math.hypot(b.vx,b.vy)).toBeCloseTo(speeds[i]*1.5))
 // Isolate timer expiry from paddle and brick bounces.
 game.balls.forEach(b=>{b.y=250;b.vx=150;b.vy=0})
 advance(game,6.1);expect(game.fastSeconds).toBe(0)
 game.balls.forEach(b=>expect(Math.abs(b.vx)).toBeCloseTo(100))
})

it('clears pending splits on life loss and a final brick without creating a ball after round clear',()=>{
 const game=stillGame();collect(game,'split');game.damage();expect(game.splitArmed).toBe(false)
 game.launch();collect(game,'split');expect(game.splitArmed).toBe(true)
 const brick=weakenBrick(game,1)
 game.bricks=[brick];game.ball={x:brick.x+BRICK.width/2,y:brick.y+BRICK.height+6.5,vx:0,vy:-200}
 game.step(1/120)
 expect(game.phase).toBe('round-clear');expect(game.splitArmed).toBe(false);expect(game.balls).toHaveLength(1)
})

it('maintains the speed boost after paddle bounce and clears effects on life loss and round change',()=>{
 const game=stillGame();collect(game,'seaweed');collect(game,'wide');collect(game,'ink');collect(game,'shield')
 game.ball={x:game.paddleX,y:game.paddleY-23,vx:0,vy:400};game.step(0.05)
 expect(Math.hypot(game.ball.vx,game.ball.vy)).toBeCloseTo((225+35)*1.2*1.5)
 game.invulnerable=0;game.damage()
 expect([game.fastSeconds,game.wideSeconds,game.inkSeconds]).toEqual([0,0,0]);expect(game.shield).toBe(false)
 game.launch();collect(game,'wide');collect(game,'shield')
 for(const brick of [...game.bricks])for(let i=0;i<brick.maxHp;i++)game.hitBrick(brick.id)
 game.nextRound();expect(game.wideSeconds).toBe(0);expect(game.shield).toBe(false);expect(game.balls).toHaveLength(1)
})

it('selects the new drop types within the original exclusive category rates',()=>{
 for(const [roll,expected] of [[0.1,'poison'],[0.2,'heart']] as const){
  const values=[0.9,roll,0.99];const game=new BrickPractice(()=>values.shift()??0.9);game.launch()
  game.hitBrick(weakenBrick(game,1).id)
  expect(game.drops[0]?.kind).toBe(expected)
 }
})

it('fires a pair of puffers along two diverging downward paths and periodically inflates them',()=>{
 const game=stillGame();game.spawnTestDrop('puffer')
 expect(game.drops).toHaveLength(2)
 expect(game.drops.map(d=>d.vx)).toEqual([-12,12])
 const y=game.drops[0].y;game.step(0.1)
 expect(game.drops[0].x).toBeLessThan(game.paddleX);expect(game.drops[1].x).toBeGreaterThan(game.paddleX)
 expect(game.drops.every(d=>d.y>y)).toBe(true)
 expect(game.drops.every(d=>d.y-y<5)).toBe(true)
 expect(pufferRadius(0)).toBe(12);expect(pufferRadius(0.6)).toBe(18);expect(pufferRadius(1.2)).toBe(12)
 expect([0,0.3,0.6,0.9,1.2].map(pufferFrame)).toEqual([0,1,2,3,0])
})

it('only enables infinite lives in item and hazard testing and relaunches every missed ball',()=>{
 const game=stillGame();expect(game.testMode).toBe(false)
 game.spawnTestDrop('item');expect(game.score().testMode).toBe(true);game.drops=[]

 for(let i=0;i<10;i++){
  game.invulnerable=0;collect(game,'shark')
  game.ball={x:20,y:game.height+10,vx:0,vy:200};game.step(0.01)
  expect(game.lives).toBe(3);expect(game.phase).toBe('playing');expect(game.ball.y).toBeLessThan(game.paddleY)
 }

 game.phase='round-clear';game.nextRound();expect(game.testMode).toBe(true)
 expect(new BrickPractice().testMode).toBe(false)
})

it('gives every item, including hearts, the same probability',()=>{
 const drops=Array.from({length:1200},(_,i)=>itemDrop((i+0.5)/1200))
 for(const kind of new Set(drops))expect(drops.filter(d=>d===kind)).toHaveLength(100)
 expect(new Set(drops).size).toBe(12)
})

it('a countdown torpedo chooses the edge from its spawn and sinks there over ten seconds',()=>{
 for(const side of ['left','right'] as const){
  const game=torpedoGame(side),torpedo=game.drops[0],start={x:torpedo.x,y:torpedo.y}
  const target=side==='left'?24:336
  expect(torpedo.kind).toBe('torpedo');expect(torpedo.targetX).toBe(target)
  game.move(side==='left'?280:80);advance(game,5)
  expect(torpedo.x).toBeCloseTo((start.x+target)/2)
  expect(torpedo.y).toBeCloseTo((start.y+game.paddleY)/2)
  expect(game.lives).toBe(3);expect(game.drainTorpedoBlasts()).toHaveLength(0)
 }
})

it('only damages the two-brick radius at zero seconds, for either edge',()=>{
 for(const side of ['left','right'] as const)for(const inside of [true,false]){
  const game=torpedoGame(side),distance=inside?91:93
  game.move(side==='left'?24+distance:336-distance)
  advance(game,9.9);expect(game.lives).toBe(3)
  advance(game,0.2);expect(game.lives).toBe(inside?2:3)
  expect(game.drops.some(d=>d.kind==='torpedo')).toBe(false)
  expect(game.drainTorpedoBlasts()).toHaveLength(1)
  advance(game,1);expect(game.drainTorpedoBlasts()).toHaveLength(0)
 }
})

it('shields block the timed explosion and laboratory countdowns never create a ball',()=>{
 const game=torpedoGame('left');game.move(70);collect(game,'shield');advance(game,10.1)
 expect(game.lives).toBe(3);expect(game.shield).toBe(false)
 const lab=new BrickPractice();lab.enterLaboratory();lab.move(280);lab.previewSkill('torpedo');advance(lab,10.1)
 expect(lab.drainTorpedoBlasts()).toHaveLength(1);expect(lab.lives).toBe(3);expect(lab.balls).toHaveLength(0)
})



it('starts the anchor slowly, accelerates, and slams the floor without homing',()=>{
 const game=new BrickPractice();game.enterLaboratory();game.previewSkill('anchor')
 const anchor=game.drops[0],y=anchor.y,x=anchor.x
 game.move(80);game.step(0.1)
 const first=anchor.y-y,speed=anchor.vy!
 expect(first).toBeLessThan(2)
 advance(game,0.5);expect(anchor.vy!).toBeGreaterThan(speed*4)
 expect(anchor.x).toBe(x)
 advance(game,2);expect(game.drops.some(d=>d.kind==='anchor')).toBe(false)
 expect(game.drainAnchorSlams()).toEqual([{x,y:game.height-12}])
})

it('anchor contact removes one life and can be blocked by a shield',()=>{
 const game=stillGame();collect(game,'anchor')
 expect(game.lives).toBe(2);expect(game.phase).toBe('ready')
 expect(game.drainAnchorSlams()).toHaveLength(1)
 const shielded=stillGame();collect(shielded,'shield');collect(shielded,'anchor')
 expect(shielded.lives).toBe(3);expect(shielded.shield).toBe(false)
})

it('jellyfish sway in both directions while descending slowly and lose one life',()=>{
 const game=new BrickPractice();game.enterLaboratory();game.previewSkill('jelly');game.move(80)
 const jelly=game.drops[0],start={x:jelly.x,y:jelly.y}
 advance(game,0.7);expect(jelly.x).toBeGreaterThan(start.x)
 advance(game,0.8);expect(jelly.x).toBeLessThan(start.x)
 expect(jelly.y-start.y).toBeGreaterThan(35);expect(jelly.y-start.y).toBeLessThan(50)
 const normal=stillGame();normal.reward=50;collect(normal,'jelly')
 expect(normal.reward).toBe(50);expect(normal.lives).toBe(2)
})

it('adds pickup gold immediately and preserves it through death and game over',()=>{
 const game=stillGame();collect(game,'pirate');expect(game.reward).toBe(20)
 collect(game,'treasure');expect(game.reward).toBe(70)
 game.hitBrick(weakenBrick(game,1).id);expect(game.reward).toBe(70)
 for(let i=0;i<3;i++){game.invulnerable=0;game.damage();if(i<2)game.launch()}
 expect(game.phase).toBe('over');expect(game.reward).toBe(70)
 expect(game.score()).not.toHaveProperty('pending');expect(game.score()).not.toHaveProperty('secured')
})

it('adds the clear reward exactly once to pickup gold and carries it to the next round',()=>{
 const game=stillGame();collect(game,'pirate');collect(game,'treasure')
 for(const brick of [...game.bricks])for(let i=0;i<brick.maxHp;i++)game.hitBrick(brick.id)
 expect(game.phase).toBe('round-clear');expect(game.reward).toBe(100)
 game.hitBrick(0);expect(game.reward).toBe(100)
 game.nextRound();expect(game.reward).toBe(100);expect(game.score().roundReward).toBe(50)
})

it('whale song damages every remaining brick in the lowest row exactly once',()=>{
 const game=stillGame(),bottomY=Math.max(...game.bricks.map(b=>b.y))
 game.bricks=game.bricks.filter(b=>b.y!==bottomY||b.id%2===0)
 collect(game,'whale')
 expect(game.bricks.filter(b=>b.y===bottomY).map(b=>b.hp)).toEqual([1,1,1])
 expect(game.bricks.filter(b=>b.y!==bottomY).every(b=>b.hp===2)).toBe(true)
 expect(game.drainImpacts()).toHaveLength(3)
 expect(game.drainSongs()).toEqual([{y:bottomY+BRICK.height/2}])
})

it('retargets the next lowest row and clears the lowest row after collecting a pirate coin',()=>{
 const game=stillGame(),bottomY=Math.max(...game.bricks.map(b=>b.y))
 for(const brick of game.bricks)if(brick.y===bottomY)brick.hp=1
 collect(game,'pirate');collect(game,'whale')
 expect(game.bricks).toHaveLength(18)
 collect(game,'whale')
 const nextY=Math.max(...game.bricks.map(b=>b.y))
 expect(game.bricks.filter(b=>b.y===nextY).every(b=>b.hp===1)).toBe(true)
 expect(game.bricks.filter(b=>b.y<nextY).every(b=>b.hp===2)).toBe(true)
})

it('previews coin and whale song without awarding laboratory scores',()=>{
 const game=new BrickPractice();game.enterLaboratory()
 catchLabDrop(game,'pirate');game.bricks.forEach(b=>b.hp=1);catchLabDrop(game,'whale')
 expect(game.bricks).toHaveLength(18);
 expect(game.balls).toHaveLength(0);expect(game.phase).toBe('playing')
})

it('throws exactly five starfish in a staggered upward fan',()=>{
 const game=stillGame();collect(game,'star')
 expect(game.starShots).toHaveLength(5)
 expect(game.starShots.filter(shot=>shot.delay===0)).toHaveLength(1)
 expect(game.starShots.every(shot=>shot.x===game.paddleX&&shot.vy<0)).toBe(true)
 expect(game.starShots.map(shot=>Math.sign(shot.vx))).toEqual([-1,-1,0,1,1])
 advance(game,0.08);expect(game.starShots.filter(shot=>shot.age>0)).toHaveLength(2)
 advance(game,0.24);expect(game.starShots.filter(shot=>shot.age>0)).toHaveLength(5)
 expect(game.starShots[0].y).toBeLessThan(game.starShots[4].y)
})

it('each starfish deals one damage to its first brick and stops without piercing',()=>{
 const game=stillGame()
 game.bricks=[{id:1,x:159,y:240,hp:4,maxHp:4},{id:2,x:159,y:100,hp:4,maxHp:4}]
 collect(game,'star');game.starShots=[{...game.starShots[0],vx:0,vy:-500}]
 advance(game,0.8)
 expect(game.bricks.map(brick=>brick.hp)).toEqual([3,4]);expect(game.starShots).toHaveLength(0)
 expect(game.drainImpacts()).toMatchObject([{brickId:1,source:'star',hp:3,destroyed:false}])
})

it('cancels unfired starfish on life loss and previews five throws without lab balls',()=>{
 const game=stillGame();collect(game,'star');game.damage();advance(game,1)
 expect(game.starShots).toHaveLength(0)
 const lab=new BrickPractice();lab.enterLaboratory();catchLabDrop(lab,'star')
 expect(lab.starShots).toHaveLength(5);advance(lab,1.5)
 expect(lab.starShots).toHaveLength(0);expect(lab.balls).toHaveLength(0)
 expect(lab.score()).toMatchObject({lives:3,})
})

it('launches Pongi from the paddle and breaks only the first brick, including four durability',()=>{
 const game=stillGame()
 game.bricks=[{id:1,x:159,y:240,hp:4,maxHp:4},{id:2,x:159,y:100,hp:4,maxHp:4},{id:3,x:250,y:240,hp:4,maxHp:4}]
 collect(game,'dash')
 expect(game.dashShots).toHaveLength(1);expect(game.dashShots[0].x).toBe(game.paddleX)
 advance(game,1.6)
 expect(game.bricks.map(b=>b.id)).toEqual([2,3]);expect(game.bricks.every(b=>b.hp===4)).toBe(true)
 expect(game.dashShots).toHaveLength(0)
 expect(game.drainImpacts()).toMatchObject([{brickId:1,hp:0,destroyed:true,source:'dash'}])
})

it('finishes a round with a dash and clears active dashes when a life is lost',()=>{
 const game=stillGame();game.bricks=[{id:1,x:159,y:200,hp:4,maxHp:4}]
 collect(game,'dash');advance(game,2.4)
 expect(game.phase).toBe('round-clear');expect(game.dashShots).toHaveLength(0)
 game.nextRound();game.launch();collect(game,'dash');game.damage()
 expect(game.dashShots).toHaveLength(0)
})

it('previews Pongi dash without gameplay balls or scores and removes a missed dash at the top',()=>{
 const game=new BrickPractice();game.enterLaboratory();catchLabDrop(game,'dash');advance(game,2)
 expect(game.balls).toHaveLength(0);expect(game.lives).toBe(3)
 expect(game.bricks).toHaveLength(23);expect(game.dashShots).toHaveLength(0)
 const missed=stillGame();missed.bricks=[{id:1,x:250,y:200,hp:4,maxHp:4}]
 collect(missed,'dash');advance(missed,4)
 expect(missed.dashShots).toHaveLength(0);expect(missed.bricks).toHaveLength(1)
})

it('heals exactly one life up to three without changing round scores',()=>{
 const game=stillGame();game.lives=1;
 collect(game,'heart');expect(game.lives).toBe(2)
 collect(game,'heart');expect(game.lives).toBe(3)
 collect(game,'heart');expect(game.lives).toBe(3)

 expect(game.drainFeedback().map(e=>e.message)).toEqual(['하트 +1!','하트 +1!','하트가 가득해요!'])
})

it('halves keyboard travel and limits pointer jumps for six seconds without stacking slowdowns',()=>{
 const game=stillGame();game.moveInput(222,0.1);expect(game.paddleX).toBe(222)
 collect(game,'sticky');game.moveInput(game.paddleX+42,0.1);expect(game.paddleX).toBeCloseTo(243)
 game.moveInput(300,0.1);expect(game.paddleX).toBeCloseTo(264)
 collect(game,'sticky');game.moveInput(300,0.1);expect(game.paddleX).toBeCloseTo(285)
 advance(game,6.1);game.moveInput(100,0.1);expect(game.paddleX).toBe(100)
 expect(game.stickySeconds).toBe(0)
})

it('shields stop sticky liquid and losing a life clears it',()=>{
 const game=stillGame();collect(game,'shield');collect(game,'sticky')
 expect(game.stickySeconds).toBe(0);expect(game.shield).toBe(false)
 advance(game,0.7);collect(game,'sticky');expect(game.stickySeconds).toBeCloseTo(6)
 game.damage();expect(game.stickySeconds).toBe(0)
})

it('shrinks the plank for six seconds, refreshes without compounding and restores safe movement bounds',()=>{
 const game=stillGame();collect(game,'shrink');expect(game.paddleWidth).toBe(54)
 advance(game,3);collect(game,'shrink');advance(game,5.8);expect(game.paddleWidth).toBe(54)
 game.move(-1000);expect(game.paddleX).toBe(35)
 advance(game,0.3);expect(game.paddleWidth).toBe(82);expect(game.paddleX).toBe(49)
})

it('uses the shorter plank for real ball collisions',()=>{
 const normal=stillGame(),small=stillGame();collect(small,'shrink')
 for(const game of [normal,small]){game.ball={x:game.paddleX+36,y:game.paddleY-26,vx:0,vy:320};game.step(0.1)}
 expect(normal.ball.vy).toBeLessThan(0);expect(small.ball.vy).toBeGreaterThan(0)
})

it('lets the latest length effect win, blocks shrink with a shield and clears it on life loss',()=>{
 const game=stillGame();collect(game,'wide');collect(game,'shrink')
 expect(game.wideSeconds).toBe(0);expect(game.paddleWidth).toBe(54)
 collect(game,'wide');expect(game.shrinkSeconds).toBe(0);expect(game.paddleWidth).toBe(124)
 collect(game,'shield');collect(game,'shrink');expect(game.paddleWidth).toBe(124);expect(game.shield).toBe(false)
 advance(game,0.7);collect(game,'shrink');expect(game.paddleWidth).toBe(54)
 game.damage();expect(game.shrinkSeconds).toBe(0);expect(game.paddleWidth).toBe(82)
})

it('uses a smaller inflated puffer collision area and loses one life on contact',()=>{
 for(const [age,lives] of [[0,3],[0.6,2]]){
  const game=stillGame();game.reward=80
  game.drops.push({id:1,kind:'puffer',x:game.paddleX,y:game.paddleY-12,vx:0,vy:0,warning:0,age})
  game.step(1/120)
  expect(game.lives).toBe(lives);expect(game.reward).toBe(80)
 }
})

it('blocks a puffer with the shield and suppresses duplicate life loss',()=>{
 const game=stillGame();collect(game,'shield');collect(game,'puffer')
 expect(game.shield).toBe(false);expect(game.lives).toBe(3)
 advance(game,0.7);collect(game,'puffer');collect(game,'puffer')
 expect(game.lives).toBe(2);expect(game.phase).toBe('ready')
})

it('ignores hazard glancing contacts while keeping central body contacts for every hazard',()=>{
 for(const kind of HAZARD_KINDS){
  const drop={id:1,kind,x:180,y:486,warning:0,age:0.6}
  expect(hazardTouches(drop,180,486,82)).toBe(true)
  expect(hazardTouches({...drop,x:230},180,486,82)).toBe(false)
  expect(hazardTouches({...drop,y:486-(kind==='shark'?25:kind==='puffer'?20:18)},180,486,82)).toBe(false)
 }
})

it('arms a magnet, catches the next paddle contact, follows movement and waits for explicit launch',()=>{
 const game=stillGame();collect(game,'magnet')
 expect(game.magnetArmed).toBe(true);expect(game.ball.held).toBeFalsy()
 game.ball={x:game.paddleX+15,y:game.paddleY-22,vx:0,vy:300};game.step(0.05)
 expect(game.magnetArmed).toBe(false);expect(game.ball.held).toBe(true);expect(game.score().held).toBe(true)
 game.move(240);game.step(0.1)
 expect(game.ball.x).toBe(255);expect(game.ball.y).toBe(game.paddleY-12);expect(game.ball.vy).toBe(0)
 game.launch();expect(game.ball.held).toBe(false);expect(game.ball.vy).toBeLessThan(0)
})

it('catches just one of two balls and keeps a held ball alive when the free ball is missed',()=>{
 const game=stillGame();collect(game,'magnet')
 game.balls=[{x:game.paddleX,y:game.paddleY-22,vx:0,vy:300},{x:20,y:240,vx:0,vy:0}];game.step(0.05)
 expect(game.balls.filter(b=>b.held)).toHaveLength(1)
 game.balls[1]={x:game.paddleX+10,y:game.paddleY-22,vx:0,vy:300};game.step(0.05)
 expect(game.balls[1].held).toBeFalsy();expect(game.balls[1].vy).toBeLessThan(0)
 game.balls[1].y=game.height+10;game.balls[1].vy=200;game.step(0.01)
 expect(game.balls).toHaveLength(1);expect(game.ball.held).toBe(true);expect(game.lives).toBe(3)
 game.launch();expect(game.ball.vy).toBeLessThan(0)
})

it('clamps a held ball to a shortened plank and preserves its attachment after resize',()=>{
 const game=stillGame();collect(game,'magnet')
 game.ball={x:game.paddleX+30,y:game.paddleY-22,vx:0,vy:300};game.step(0.05)
 collect(game,'shrink');game.step(0.01);game.resize(400)
 expect(game.ball.held).toBe(true);expect(game.ball.x-game.paddleX).toBeLessThanOrEqual(21)
 expect(game.ball.y).toBe(game.paddleY-12)
})


it('builds four rows of six bricks',()=>{
 const game=new BrickPractice()
 expect(game.bricks).toHaveLength(24)
 expect(new Set(game.bricks.map(b=>b.y)).size).toBe(4)
 expect(new Set(game.bricks.map(b=>b.x)).size).toBe(6)
})

it('does not split at a brick and fires two upward balls on the next paddle bounce',()=>{
 const game=stillGame();collect(game,'split')
 const brick=weakenBrick(game,4)
 game.ball={x:brick.x+21,y:brick.y+26.5,vx:0,vy:-200};game.step(1/120)
 expect(game.balls).toHaveLength(1);expect(game.splitArmed).toBe(true)
 splitAtPaddle(game)
 expect(game.balls).toHaveLength(2);expect(game.splitArmed).toBe(false)
 expect(game.balls.every(b=>b.vy<0)).toBe(true)
 expect(game.balls[0].vx).toBeLessThan(0);expect(game.balls[1].vx).toBeGreaterThan(0)
})

it('waits for explicit release when magnet and split are collected together',()=>{
 const game=stillGame();collect(game,'split');collect(game,'magnet')
 game.ball={x:game.paddleX,y:game.paddleY-12,vx:0,vy:300};game.step(1/120)
 expect(game.ball.held).toBe(true);expect(game.balls).toHaveLength(1)
 game.launch()
 expect(game.balls).toHaveLength(2);expect(game.balls.every(b=>!b.held&&b.vy<0)).toBe(true)
})

it('immediately fires one wave that pierces multiple bricks once each for one damage',()=>{
 const game=stillGame()
 game.bricks=[{id:1,x:159,y:200,hp:3,maxHp:3},{id:2,x:159,y:100,hp:2,maxHp:2},{id:3,x:250,y:100,hp:2,maxHp:2}]
 collect(game,'wave')
 expect(game.waveShots).toHaveLength(1);expect(game.shots).toHaveLength(0)
 expect(game.waveShots[0].x).toBe(game.paddleX)
 advance(game,0.9)
 expect(game.bricks.map(b=>b.hp)).toEqual([2,1,2])
 const hits=game.drainImpacts();expect(hits).toHaveLength(2);expect(hits.every(h=>h.source==='wave')).toBe(true)
 expect(game.waveShots).toHaveLength(1)
 advance(game,0.4)
 expect(game.waveShots).toHaveLength(0);expect(game.bricks.map(b=>b.hp)).toEqual([2,1,2])
})

it('scores piercing destruction and removes all projectiles on life loss or round clear',()=>{
 const game=stillGame();game.bricks=[{id:1,x:159,y:200,hp:1,maxHp:1},{id:2,x:159,y:100,hp:1,maxHp:1}]
 collect(game,'wave');advance(game,1)
 expect(game.phase).toBe('round-clear');expect(game.waveShots).toHaveLength(0)
 game.nextRound();game.launch();collect(game,'wave');collect(game,'magnet');game.damage()
 expect(game.waveShots).toHaveLength(0);expect(game.magnetArmed).toBe(false)
})

it('keeps wave collision history after resizing and lets separate waves hit the same brick',()=>{
 const game=stillGame();game.bricks=[{id:1,x:159,y:200,hp:4,maxHp:4},{id:2,x:250,y:100,hp:4,maxHp:4}]
 collect(game,'wave');advance(game,0.6)
 expect(game.bricks[0].hp).toBe(3)
 expect(game.waveShots[0].hitIds.has(1)).toBe(true)
 const y=game.waveShots[0].y;game.resize(400)
 expect(game.waveShots[0].y).toBeCloseTo(y*400/520)
 expect(game.waveShots[0].hitIds.has(1)).toBe(true)
 const second=stillGame();second.bricks=[{id:1,x:159,y:200,hp:4,maxHp:4},{id:2,x:250,y:100,hp:4,maxHp:4}]
 collect(second,'wave');collect(second,'wave');advance(second,0.7)
 expect(second.bricks[0].hp).toBe(2)
})

it('reveals a stationary poison bottle then pours at irregular intervals',()=>{
 const game=new BrickPractice(()=>0.9);game.enterLaboratory();game.previewSkill('poison')
 const bottle=game.drops[0],position={x:bottle.x,y:bottle.y}
 advance(game,1.2);expect(game.drops).toHaveLength(1)
 advance(game,0.1);expect(game.drops.filter(d=>!d.bottle)).toHaveLength(1)
 advance(game,0.7);expect(game.drops.filter(d=>!d.bottle)).toHaveLength(2)
 expect({x:bottle.x,y:bottle.y}).toEqual(position)
 expect(hazardTouches({...bottle,y:game.paddleY},game.paddleX,game.paddleY,game.paddleWidth)).toBe(false)
 game.move(300);advance(game,2.9);expect(game.drops.some(d=>d.bottle)).toBe(false)
 expect(bottle.emitted).toBe(3)
})
it('loses one life to poison while preserving gold and respecting shields',()=>{
 const game=stillGame();game.reward=50;collect(game,'shield');collect(game,'poison')
 expect(game.lives).toBe(3);expect(game.shield).toBe(false)
 advance(game,0.7);collect(game,'poison');collect(game,'poison')
 expect(game.lives).toBe(2);expect(game.phase).toBe('ready');expect(game.reward).toBe(50)
})
