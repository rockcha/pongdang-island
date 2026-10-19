import type {ReactNode} from 'react'
import {Navigate} from 'react-router'
import {useOperator} from '@/features/notices/use-operator'

export function OperatorGuard({children}:{children:ReactNode}){
 const {operator,loading}=useOperator()
 if(loading)return <p role="status" className="p-8 text-center text-xs text-muted-foreground">운영자 권한 확인 중…</p>
 return operator?children:<Navigate to="/collection" replace/>
}
