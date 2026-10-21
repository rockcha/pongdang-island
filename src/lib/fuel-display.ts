// Keep historical server resource snapshots compatible with the current UI name.
// User-written titles, messages and captions are left untouched.
export function fuelDisplay<T>(value:T):T{
 if(Array.isArray(value))return value.map(item=>fuelDisplay(item)) as T
 if(!value||typeof value!=='object')return value
 const record=value as Record<string,unknown>
 const fuel=record.kind==='fuel'||record.id==='fuel'||record.thumbnail_path==='/app-icons/fuel.png'
 return Object.fromEntries(Object.entries(record).map(([key,item])=>[
  key,fuel&&key==='name'?'연료':fuel&&key==='thumbnail_path'?'/app-icons/fuel-can.svg':fuelDisplay(item),
 ])) as T
}
