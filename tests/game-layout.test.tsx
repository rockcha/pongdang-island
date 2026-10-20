import {cleanup,fireEvent,render,screen} from '@testing-library/react'
import {afterEach,expect,it,vi} from 'vitest'
import {GameActions,GamePanel,GameStage} from '@/features/arcade/game-layout'
import {GameOverlay} from '@/features/arcade/game-overlay'
import {GameStartOverlay} from '@/features/arcade/game-start-overlay'

afterEach(cleanup)

it('keeps the board mounted across waiting, result and hidden-tab transitions',()=>{
 function Board({hidden=false,result=false}:{hidden?:boolean;result?:boolean}){
  return <GamePanel id="sample" hidden={hidden}><GameStage><canvas data-testid="board"/>{result&&<GameOverlay title="완료" actions={<button>다시 하기</button>}>보상 확인</GameOverlay>}</GameStage></GamePanel>
 }
 const view=render(<Board/>),canvas=screen.getByTestId('board')
 view.rerender(<Board result/>)
 expect(screen.getByRole('heading',{name:'완료'})).toBeTruthy()
 expect(screen.getByTestId('board')).toBe(canvas)
 view.rerender(<Board hidden/>)
 expect(screen.queryByRole('tabpanel')).toBeNull()
 expect(screen.getByTestId('board')).toBe(canvas)
 view.rerender(<Board/>)
 expect(screen.getByRole('tabpanel').getAttribute('aria-labelledby')).toBe('sample-game-tab')
 expect(screen.getByTestId('board')).toBe(canvas)
})

it('conceals unrevealed outcomes from visual and keyboard interaction while reserving their space',()=>{
 const view=render(<GameActions revealed={false}><button>보상 받기</button></GameActions>)
 const actions=view.container.firstElementChild as HTMLElement
 expect(actions.style.visibility).toBe('hidden')
 expect(actions.hasAttribute('inert')).toBe(true)
 expect(screen.queryByRole('button',{name:'보상 받기'})).toBeNull()
 view.rerender(<GameActions><button>보상 받기</button></GameActions>)
 expect(view.container.firstElementChild).toBe(actions)
 expect(actions.hasAttribute('inert')).toBe(false)
 expect(screen.getByRole('button',{name:'보상 받기'})).toBeTruthy()
})

it('shares the waiting screen without coupling free practice to real-play availability',()=>{
 const real=vi.fn(),practice=vi.fn()
 const props={title:'게임',description:'준비되면 시작하세요.',poster:'/test.png',onPaid:real,onPractice:practice,fee:0,paidDisabled:true,practiceDisabled:false}
 const view=render(<GameStartOverlay {...props}/>)
 expect(screen.getByRole('button',{name:'실전 (무료)'}).hasAttribute('disabled')).toBe(true)
 fireEvent.click(screen.getByRole('button',{name:'연습'}))
 expect(practice).toHaveBeenCalledOnce();expect(real).not.toHaveBeenCalled()
 view.rerender(<GameStartOverlay {...props} paidDisabled={false}/>)
 fireEvent.click(screen.getByRole('button',{name:'실전 (무료)'}))
 expect(real).toHaveBeenCalledOnce()
})
