import {expect,it} from 'vitest'
import {BOARD,BRICK,BrickPractice,brickDrop,pufferRadius,pufferFrame,itemDrop,hazardTouches,HAZARD_KINDS} from '@/features/arcade/brick-breaker-model'
import type {DropKind} from '@/features/arcade/brick-breaker-model'

function collect(game:BrickPractice,kind:DropKind){game.drops.push({id:900+game.drops.length,kind,x:game.paddleX,y:game.paddleY,warning:0});game.step(1/120)}
function advance(game:BrickPractice,seconds:number){for(let i=0;i<Math.ceil(seconds*100);i++)game.step(0.01)}
function stillGame(){const game=new BrickPractice(()=>0.9);game.launch();game.ball={x:20,y:240,vx:0,vy:0};return game}
function splitAtBrick(game:BrickPractice){
 collect(game,'split')
 const brick=game.bricks.find(b=>b.hp>=2)!,speed=Math.hypot(game.ball.vx,game.ball.vy)||200
 game.ball={x:brick.x+BRICK.width/2,y:brick.y+BRICK.height+6.5,vx:0,vy:-speed}
 game.step(1/120)
}

it('uses four durability levels and scores only destroyed bricks',()=>{
 const game=new BrickPractice(()=>0.9);game.launch()
 expect(new Set(game.bricks.map(b=>b.hp))).toEqual(new Set([1,2,3,4]))
 const brick=game.bricks.find(b=>b.hp===4)!
 for(let i=0;i<3;i++)game.hitBrick(brick.id)
 expect(game.pending).toBe(0);expect(brick.hp).toBe(1)
 game.hitBrick(brick.id);expect(game.pending).toBe(1);expect(game.bricks).not.toContain(brick)
})
it('gives exclusive 25 percent hazard and 15 percent item categories',()=>{
 const drops=Array.from({length:100},(_,i)=>brickDrop(i/100))
 expect(drops.filter(d=>d==='shark')).toHaveLength(25)
 expect(drops.filter(d=>d==='item')).toHaveLength(15)
 expect(drops.filter(d=>d===null)).toHaveLength(60)
})
it('banks cleared rounds and loses only the unfinished round on game over',()=>{
 const game=new BrickPractice(()=>0.9);game.launch()
 for(const brick of [...game.bricks])for(let i=0;i<brick.maxHp;i++)game.hitBrick(brick.id)
 expect(game.score()).toMatchObject({phase:'round-clear',secured:30,pending:0})
 game.nextRound();game.launch();expect(game.round).toBe(2)
 const brick=game.bricks[0];for(let i=0;i<brick.maxHp;i++)game.hitBrick(brick.id)
 expect(game.pending).toBe(1)
 for(let i=0;i<3;i++){game.invulnerable=0;game.damage();if(i<2){expect(game.pending).toBe(1);game.launch()}}
 expect(game.score()).toMatchObject({phase:'over',lives:0,secured:30,pending:0})
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
it('collecting an item fires two upward torpedoes from paddle edges',()=>{
 const game=new BrickPractice(()=>0.9);game.launch()
 game.drops.push({id:1,kind:'item',x:game.paddleX,y:BOARD.paddleY-18,warning:0})
 game.step(0.01)
 expect(game.shots).toHaveLength(2)
 expect(game.drainFeedback()).toEqual([{kind:'item',message:'어뢰 발사!'}])
 expect(game.shots.map(s=>s.x)).toEqual([game.paddleX-32,game.paddleX+32])
 const y=game.shots[0].y;game.step(0.01);expect(game.shots[0].y).toBeLessThan(y)
})
it('reflects a descending ball at the plank and prevents tunnelling at low FPS',()=>{
 const game=new BrickPractice(()=>0.9);game.launch()
 game.ball={x:game.paddleX,y:BOARD.paddleY-26,vx:0,vy:320};game.step(0.1)
 expect(game.ball.vy).toBeLessThan(0);expect(game.lives).toBe(3)
 const brick=game.bricks.find(b=>b.hp===1)!
 game.bricks=[brick,{id:999,x:300,y:250,hp:4,maxHp:4}]
 game.ball={x:brick.x+25,y:brick.y+40,vx:0,vy:-330};game.step(0.1)
 expect(game.pending).toBe(1)
})
it('ends voluntarily only after a round is secured and clamps paddle movement',()=>{
 const game=new BrickPractice(()=>0.9);game.bank();expect(game.phase).toBe('ready')
 game.move(-1000);expect(game.paddleX).toBe(49)
 game.move(1000);expect(game.paddleX).toBe(311)
 game.launch();for(const brick of [...game.bricks])for(let i=0;i<brick.maxHp;i++)game.hitBrick(brick.id)
 game.bank();game.nextRound();expect(game.phase).toBe('banked');expect(game.secured).toBe(30)
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
 expect(game.ball.x).toBeGreaterThan(300);expect(game.bricks).toHaveLength(30)
})
it('resizes the playfield without losing durability or round scores',()=>{
 const game=new BrickPractice(()=>0.9);game.launch();game.hitBrick(game.bricks.find(b=>b.hp===1)!.id)
 const hp=game.bricks.map(b=>b.hp);game.resize(380)
 expect(game.height).toBe(380);expect(game.paddleY).toBe(346);expect(game.pending).toBe(1)
 expect(game.bricks.map(b=>b.hp)).toEqual(hp)
 game.damage();expect(game.ball.y).toBe(game.paddleY-16)
})
it('emits separate impact and destruction events for ball and torpedo effects',()=>{
 const game=new BrickPractice(()=>0.9);game.launch();const brick=game.bricks.find(b=>b.hp===2)!
 game.hitBrick(brick.id);expect(game.drainImpacts()).toMatchObject([{brickId:brick.id,hp:1,destroyed:false}])
 expect(game.drainImpacts()).toEqual([])
 game.hitBrick(brick.id);expect(game.drainImpacts()).toMatchObject([{brickId:brick.id,hp:0,destroyed:true}])
})
it('marks a real torpedo collision for explosion effects while dealing one damage',()=>{
 const game=new BrickPractice(()=>0.9);game.launch();const brick=game.bricks.find(b=>b.hp===2)!
 game.shots.push({id:1,x:brick.x+BRICK.width/2,y:brick.y+BRICK.height+4})
 game.step(1/120)
 expect(game.shots).toHaveLength(0)
 expect(brick.hp).toBe(1);expect(game.pending).toBe(0)
 expect(game.drainImpacts()).toMatchObject([{brickId:brick.id,source:'torpedo',destroyed:false}])
})
it('spawns practice test drops in front of the paddle without changing score or lives',()=>{
 const game=new BrickPractice(()=>0.9)
 game.spawnTestDrop('item');game.spawnTestDrop('shark')
 expect(game.phase).toBe('playing')
 expect(game.drops.map(d=>d.kind)).toEqual(['item','shark'])
 expect(game.drops.every(d=>d.x===game.paddleX&&d.y<game.paddleY)).toBe(true)
 expect(game.drops[1].warning).toBeGreaterThan(0)
 expect(game.score()).toMatchObject({lives:3,secured:0,pending:0})
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

it('does not stack shields and blocks exactly one hazard while leaving secured scores intact',()=>{
 const game=stillGame();game.secured=30;game.pending=8
 collect(game,'shield');collect(game,'shield');expect(game.shield).toBe(true)
 collect(game,'urchin');expect(game.shield).toBe(false);expect(game.pending).toBe(8)
 advance(game,0.7);collect(game,'urchin');expect(game.pending).toBe(5);expect(game.secured).toBe(30)
 advance(game,0.7);game.pending=1;collect(game,'urchin');expect(game.pending).toBe(0)
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
 const speed=Math.hypot(game.ball.vx,game.ball.vy);collect(game,'split');collect(game,'split')
 expect(game.balls).toHaveLength(1);expect(game.splitArmed).toBe(true)
 game.hitBrick(game.bricks.find(b=>b.hp===4)!.id,'torpedo')
 expect(game.balls).toHaveLength(1);expect(game.splitArmed).toBe(true)
 splitAtBrick(game)
 expect(game.balls).toHaveLength(2);expect(Math.hypot(game.balls[1].vx,game.balls[1].vy)).toBeCloseTo(speed)
 expect(game.splitArmed).toBe(false)
 expect([game.balls[1].x,game.balls[1].y]).toEqual([game.ball.x,game.ball.y])
 expect(game.balls[1].vy).toBeGreaterThan(0)
 collect(game,'split');expect(game.splitArmed).toBe(false);expect(game.balls).toHaveLength(2)
 game.balls[0].y=game.height+10;game.step(0.01)
 expect(game.balls).toHaveLength(1);expect(game.lives).toBe(3)
 game.ball.y=game.height+10;game.step(0.01)
 expect(game.lives).toBe(2);expect(game.phase).toBe('ready');expect(game.balls).toHaveLength(1)
})

it('both split balls damage bricks and resize with the board',()=>{
 const game=stillGame();splitAtBrick(game)
 const brick=game.bricks.find(b=>b.hp===2)!
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
 const game=stillGame();game.ball.vx=100;splitAtBrick(game)
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
 const brick=game.bricks.find(b=>b.hp===1)!
 game.bricks=[brick];game.ball={x:brick.x+BRICK.width/2,y:brick.y+BRICK.height+6.5,vx:0,vy:-200}
 game.step(1/120)
 expect(game.phase).toBe('round-clear');expect(game.splitArmed).toBe(false);expect(game.balls).toHaveLength(1)
})

it('maintains the speed boost after paddle bounce and clears effects on life loss and round change',()=>{
 const game=stillGame();collect(game,'seaweed');collect(game,'wide');collect(game,'ink');collect(game,'shield')
 game.ball={x:game.paddleX,y:game.paddleY-23,vx:0,vy:400};game.step(0.05)
 expect(Math.hypot(game.ball.vx,game.ball.vy)).toBeCloseTo((225+35)*1.5*1.5)
 game.invulnerable=0;game.damage()
 expect([game.fastSeconds,game.wideSeconds,game.inkSeconds]).toEqual([0,0,0]);expect(game.shield).toBe(false)
 game.launch();collect(game,'wide');collect(game,'shield')
 for(const brick of [...game.bricks])for(let i=0;i<brick.maxHp;i++)game.hitBrick(brick.id)
 game.nextRound();expect(game.wideSeconds).toBe(0);expect(game.shield).toBe(false);expect(game.balls).toHaveLength(1)
})

it('selects the new drop types within the original exclusive category rates',()=>{
 for(const [roll,expected] of [[0.1,'shrink'],[0.3,'heart']] as const){
  const values=[0.9,roll,0.99];const game=new BrickPractice(()=>values.shift()??0.9);game.launch()
  game.hitBrick(game.bricks.find(b=>b.hp===1)!.id)
  expect(game.drops[0]?.kind).toBe(expected)
 }
})

it('fires a pair of puffers along two diverging downward paths and periodically inflates them',()=>{
 const game=stillGame();game.spawnTestDrop('puffer')
 expect(game.drops).toHaveLength(2)
 expect(game.drops.map(d=>d.vx)).toEqual([-90,90])
 const y=game.drops[0].y;game.step(0.1)
 expect(game.drops[0].x).toBeLessThan(game.paddleX);expect(game.drops[1].x).toBeGreaterThan(game.paddleX)
 expect(game.drops.every(d=>d.y>y)).toBe(true)
 expect(pufferRadius(0)).toBe(12);expect(pufferRadius(0.6)).toBe(18);expect(pufferRadius(1.2)).toBe(12)
 expect([0,0.3,0.6,0.9,1.2].map(pufferFrame)).toEqual([0,1,2,3,0])
})

it('only enables infinite lives in item and hazard testing and relaunches every missed ball',()=>{
 const game=stillGame();expect(game.testMode).toBe(false)
 game.spawnTestDrop('item');expect(game.score().testMode).toBe(true);game.drops=[]
 game.pending=7;game.secured=30
 for(let i=0;i<10;i++){
  game.invulnerable=0;collect(game,'shark')
  game.ball={x:20,y:game.height+10,vx:0,vy:200};game.step(0.01)
  expect(game.lives).toBe(3);expect(game.phase).toBe('playing');expect(game.ball.y).toBeLessThan(game.paddleY)
 }
 expect(game.pending).toBe(7);expect(game.secured).toBe(30)
 game.phase='round-clear';game.nextRound();expect(game.testMode).toBe(true)
 expect(new BrickPractice().testMode).toBe(false)
})

it('weights the heart at half the probability of every other item',()=>{
 const drops=Array.from({length:1300},(_,i)=>itemDrop((i+0.5)/1300))
 for(const kind of ['item','wide','shield','split','magnet','wave'])expect(drops.filter(d=>d===kind)).toHaveLength(200)
 expect(drops.filter(d=>d==='heart')).toHaveLength(100)
})

it('heals exactly one life up to three without changing round scores',()=>{
 const game=stillGame();game.lives=1;game.pending=4;game.secured=30
 collect(game,'heart');expect(game.lives).toBe(2)
 collect(game,'heart');expect(game.lives).toBe(3)
 collect(game,'heart');expect(game.lives).toBe(3)
 expect(game.pending).toBe(4);expect(game.secured).toBe(30)
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

it('uses the inflated puffer radius for collision and subtracts only one pending point',()=>{
 for(const [age,expected] of [[0,4],[0.6,3]]){
  const game=stillGame();game.secured=30;game.pending=4
  game.drops.push({id:1,kind:'puffer',x:game.paddleX,y:game.paddleY-15,vx:0,vy:0,warning:0,age})
  game.step(1/120)
  expect(game.pending).toBe(expected);expect(game.secured).toBe(30);expect(game.lives).toBe(3)
  expect(game.drainFeedback()).toEqual(age===0?[]:[{kind:'hazard',message:'아앗 따가워'}])
 }
 const game=stillGame();collect(game,'puffer');expect(game.pending).toBe(0)
})

it('blocks a puffer with the shield and suppresses duplicate hits during invulnerability',()=>{
 const game=stillGame();game.pending=5;collect(game,'shield');collect(game,'puffer')
 expect(game.shield).toBe(false);expect(game.pending).toBe(5)
 expect(game.drainFeedback().every(e=>e.kind==='item')).toBe(true)
 advance(game,0.7);collect(game,'puffer');collect(game,'puffer')
 expect(game.pending).toBe(4)
 expect(game.drainFeedback()).toEqual([{kind:'hazard',message:'아앗 따가워'}])
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

it('detonates a wave once on a real ball collision and damages only the surrounding eight cells',()=>{
 const game=stillGame();game.bricks.forEach(b=>{b.hp=2;b.maxHp=2});collect(game,'wave')
 game.hitBrick(29,'torpedo');expect(game.waveArmed).toBe(true);game.drainImpacts()
 const center=game.bricks[14];game.ball={x:center.x+21,y:center.y+10,vx:0,vy:-200};game.step(1/120)
 for(const brick of game.bricks){
  const nearby=Math.abs(brick.x-center.x)<=46&&Math.abs(brick.y-center.y)<=25
  expect(brick.hp).toBe(nearby||brick.id===29?1:2)
 }
 expect(game.waveArmed).toBe(false)
 const hits=game.drainImpacts();expect(hits).toHaveLength(9);expect(hits.filter(h=>h.source==='wave')).toHaveLength(8)
 expect(game.drainWaves()).toEqual([{x:center.x+21,y:center.y+10}]);expect(game.drainWaves()).toEqual([])
})

it('scores wave destruction normally and never chains damage beyond one cell',()=>{
 const game=stillGame();game.bricks.forEach(b=>{b.hp=1;b.maxHp=1});collect(game,'wave')
 const center=game.bricks[14];game.ball={x:center.x+21,y:center.y+10,vx:0,vy:-200};game.step(1/120)
 expect(game.pending).toBe(9);expect(game.bricks).toHaveLength(21)
 expect(game.bricks.some(b=>b.id===12)).toBe(true)
})

it('does not wrap edge waves across rows and clears pending powers on a lost life',()=>{
 const game=stillGame();game.bricks.forEach(b=>{b.hp=2;b.maxHp=2});collect(game,'wave');collect(game,'magnet')
 const center=game.bricks[0];game.ball={x:center.x+21,y:center.y+10,vx:0,vy:-200};game.step(1/120)
 expect(game.drainImpacts()).toHaveLength(4);expect(game.bricks.find(b=>b.id===5)!.hp).toBe(2)
 collect(game,'wave');game.damage();expect(game.waveArmed).toBe(false);expect(game.magnetArmed).toBe(false)
})
