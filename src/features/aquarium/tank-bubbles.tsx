import './tank-bubbles.css'

const bubbles = [
 { left: 8, size: 7, duration: 15, delay: -3 },
 { left: 16, size: 9, duration: 19, delay: -12 },
 { left: 24, size: 11, duration: 18, delay: -6 },
 { left: 32, size: 6, duration: 17, delay: -8 },
 { left: 40, size: 8, duration: 22, delay: -18 },
 { left: 48, size: 9, duration: 21, delay: -16 },
 { left: 56, size: 7, duration: 16, delay: -5 },
 { left: 64, size: 6, duration: 20, delay: -14 },
 { left: 72, size: 10, duration: 20, delay: -10 },
 { left: 80, size: 8, duration: 18, delay: -15 },
 { left: 87, size: 7, duration: 23, delay: -8 },
 { left: 94, size: 9, duration: 19, delay: -17 },
]

export function TankBubbles() {
 return <div aria-hidden="true" className="pointer-events-none absolute inset-0 overflow-hidden">
  {bubbles.map(bubble => <div key={bubble.left} className="tank-bubble-lane" style={{animationDuration:`${bubble.duration}s`,animationDelay:`${bubble.delay}s`}}>
   <span className="tank-bubble" style={{left:`${bubble.left}%`,width:bubble.size,height:bubble.size}}/>
  </div>)}
 </div>
}
