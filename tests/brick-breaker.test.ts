import {expect,it} from 'vitest'
import {BOARD,BRICK,BrickPractice,brickDrop} from '@/features/arcade/brick-breaker-model'

it('uses four durability levels and scores only destroyed bricks',()=>{
 const game=new BrickPractice(()=>0.9);game.launch()
 expect(new Set(game.bricks.map(b=>b.hp))).toEqual(new Set([1,2,3,4]))
 const brick=game.bricks.find(b=>b.hp===4)!
 for(let i=0;i<3;i++)game.hitBrick(brick.id)
 expect(game.pending).toBe(0);expect(brick.hp).toBe(1)
 game.hitBrick(brick.id);expect(game.pending).toBe(1);expect(game.bricks).not.toContain(brick)
})
it('gives exclusive 25 percent shark and 15 percent item drops',()=>{
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
 game.damage();expect(game.lives).toBe(2)
})
it('collecting an item fires two upward torpedoes from paddle edges',()=>{
 const game=new BrickPractice(()=>0.9);game.launch()
 game.drops.push({id:1,kind:'item',x:game.paddleX,y:BOARD.paddleY-18,warning:0})
 game.step(0.01)
 expect(game.shots).toHaveLength(2)
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
