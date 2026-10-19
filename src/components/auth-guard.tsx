import { Navigate, Outlet } from 'react-router'
import { getNickname, useAuth } from '@/components/auth-provider'
import {IslandLoading} from './island-loading'

export function AuthGuard({ requireNickname = false }: { requireNickname?: boolean }) {
  const { session, loading, error, recovery } = useAuth()
  if (loading) return <IslandLoading/>
  if (error) return <p role="alert" className="py-16 text-center">{error}</p>
  if (!session) return <Navigate to="/login" replace />
  if (recovery) return <Navigate to="/reset-password" replace />
  if (requireNickname && !getNickname(session)) return <Navigate to="/nickname" replace />
  return <Outlet />
}
