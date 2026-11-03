import {Navigate} from 'react-router'
import {useAuth} from '@/components/auth-provider'
import {useOperator} from '@/features/notices/use-operator'
import {canUseTrainingLab} from './access'
import {TrainingLab} from './training-lab'

export function TrainingPage(){
 const {session,loading:authLoading,recovery}=useAuth(),{operator,loading}=useOperator()
 if(authLoading||loading)return <p role="status" className="p-8 text-center text-xs text-muted-foreground">훈련장을 준비하고 있어요…</p>
 if(recovery||!session||!canUseTrainingLab(operator,session.user.email))return <Navigate to="/farm" replace/>
 return <TrainingLab key={session.user.id} accountId={session.user.id}/>
}
