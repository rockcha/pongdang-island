import './farm-gold.css'

export function FarmGoldIcon(){return <img className="farm-gold-icon" src="/currency/gold-coin-starfish.png" alt="" aria-hidden="true"/>}
export function FarmGold({amount}:{amount:number|string}){
 return <span className="farm-gold-amount"><FarmGoldIcon/><span>{typeof amount==='number'?amount.toLocaleString('ko-KR'):amount}</span><span className="sr-only"> 골드</span></span>
}
