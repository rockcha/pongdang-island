import type {Glyph} from './catalog'

export function TrainingGlyph({glyph,className=''}:{glyph:Glyph;color?:string;className?:string}){
 return <img className={`training-glyph ${className}`} src={`/training/abilities/${glyph}.svg`} alt="" draggable={false} aria-hidden="true"/>
}
export function BondShard({className=''}:{className?:string}){
 return <svg className={className} width="24" height="28" viewBox="0 0 24 28" fill="none" aria-hidden="true"><path d="m12 2 9 9-4 12-10 3-5-14Z" fill="#d1b2a6" stroke="#a57f76" strokeWidth="1.4"/><path d="m12 2-2 13 7 8m-7-8 11-4M2 12l8 3-3 11" stroke="#fff3e7" strokeWidth="1.1"/><path d="m14 8 2 3-3 3-2-3Z" fill="#fff7ed"/></svg>
}
export function TrainingDummy(){
 return <svg viewBox="0 0 180 200" role="img" aria-label="연습용 허수아비" className="training-dummy"><ellipse cx="90" cy="183" rx="48" ry="8" fill="#72593b" opacity=".12"/><path d="M85 69h10v115H85Z" fill="#a57a4d"/><path d="m29 92 13-10 102 13-4 11Z" fill="#ae8658" stroke="#8f6c44" strokeWidth="2"/><path d="m35 84-15 1m13 6-17 4m124 3 20 4m-18-10 17-1" stroke="#d8b879" strokeWidth="4" strokeLinecap="round"/><path d="m66 81 48 2 10 57-35 16-32-20Z" fill="#bd9667" stroke="#967449" strokeWidth="2"/><path d="m66 90 50 3M64 107l55 3M62 124l59 4" stroke="#d9ba85" strokeWidth="5"/><path d="m84 85-6 61m24-59 4 59" stroke="#8b7049" strokeWidth="2"/><path d="m65 135-12 15m21-10-4 15m40-14 15 11" stroke="#dcc18b" strokeWidth="4" strokeLinecap="round"/><circle cx="90" cy="54" r="29" fill="#e8c991" stroke="#b3915e" strokeWidth="2"/><path d="M74 49h8m16 0h8M81 65q9 7 18 0" stroke="#886b45" strokeWidth="3" strokeLinecap="round"/><path d="M54 33q35-22 73 1v10H53Z" fill="#cfac6c" stroke="#aa854e" strokeWidth="2"/><path d="m65 33 9-17 32 1 10 16" fill="#dabc80" stroke="#aa854e" strokeWidth="2"/><path d="M72 29h37" stroke="#a77d50" strokeWidth="5"/><path d="m123 22 3 5 6 1-4 4 1 6-6-3-5 3 1-6-4-4 6-1Z" fill="#dfb86a"/></svg>
}
