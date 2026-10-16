import {createClient} from '@/lib/client'
export type AttendanceState={today:string;checkedIn:boolean;streak:number;currentDay:number;completedDays:number;sheetNumber:number;completedSheets:number;reset:boolean}
export type AttendanceClaim=AttendanceState&{replayed:boolean;reward:{claim_date:string;gold:number;bait_id:string|null;sheet_day:number}}
export async function loadAttendance():Promise<AttendanceState>{
 const {data,error}=await createClient().rpc('attendance_state');if(error)throw error;return data
}
export async function claimAttendance(day:string):Promise<AttendanceClaim>{
 const {data,error}=await createClient().rpc('claim_attendance',{p_day:day});if(error)throw error;return data
}
export function attendanceError(cause:unknown){
 const message=cause&&typeof cause==='object'&&'message'in cause?String(cause.message):''
 if(message.includes('ATTENDANCE_DAY_CHANGED'))return '날짜가 바뀌었어요. 새 출석지를 불러온 뒤 다시 눌러주세요.'
 if(message.includes('GOLD_LIMIT'))return '골드 보유 한도에 도달했어요. 골드를 사용한 뒤 다시 받아주세요.'
 return '출석 정보를 확인하지 못했어요. 다시 불러와주세요.'
}
