import { GoldProvider } from '@/features/gold/gold-provider'
import { RodProvider } from '@/features/fishing/rod-provider'
import { AppRoutes } from '@/routes'
import { Toaster } from '@/components/ui/sonner'
import { PwaStatus } from '@/components/pwa-status'
import { PortraitOrientation } from '@/components/portrait-orientation'
import { SocialProvider } from '@/features/social/social-provider'
import {MusicProvider} from '@/features/music/music-provider'
import {useAuth} from '@/components/auth-provider'

export default function App() {
  const {session}=useAuth()
  const musicKey=`pongdang:music:${session?.user.id??'guest'}`
  return (
    <>
      <MusicProvider key={musicKey} storageKey={musicKey} userId={session?.user.id}><SocialProvider><GoldProvider><RodProvider><AppRoutes /></RodProvider></GoldProvider></SocialProvider></MusicProvider>
      <Toaster position="bottom-right" duration={3500} />
      <PwaStatus />
      <PortraitOrientation />
    </>
  )
}
