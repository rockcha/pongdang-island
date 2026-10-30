// Only the standalone preview build aliases these services. No account API is called.
export const useAuth=()=>({session:{user:{id:'local-preview',user_metadata:{game_nickname:'탐험퐁이'}}},recovery:false})
export const getNickname=()=> '탐험퐁이'
export const useSocial=()=>({profile:{avatar_path:null}})
export const useOperator=()=>({operator:!new URLSearchParams(location.search).has('public'),loading:false})
