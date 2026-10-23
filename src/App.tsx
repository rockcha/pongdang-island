import { GoldProvider } from '@/features/gold/gold-provider'
import { RodProvider } from '@/features/fishing/rod-provider'
import { AppRoutes } from '@/routes'
import { Toaster } from '@/components/ui/sonner'
import { PwaStatus } from '@/components/pwa-status'
import { PortraitOrientation } from '@/components/portrait-orientation'
import { SocialProvider } from '@/features/social/social-provider'
import {MusicProvider} from '@/features/music/music-provider'
import {useAuth} from '@/components/auth-provider'
import {ExperienceProvider} from '@/features/experience/experience-provider'
import {PushAccountSync} from '@/features/notifications/push-account-sync'
import {PresenceReporter} from '@/features/friends/presence-reporter'
import {useEffect} from 'react'
import {installGameAudioLifecycle} from '@/features/fishing/game-audio'

export default function App() {
  useEffect(installGameAudioLifecycle,[])
  const {session}=useAuth()
  const musicKey=`pongdang:music:${session?.user.id??'guest'}`
  return (
    <>
      <PushAccountSync/>
      <PresenceReporter/>
      <MusicProvider key={musicKey} storageKey={musicKey} userId={session?.user.id}><SocialProvider><GoldProvider><ExperienceProvider><RodProvider><AppRoutes /></RodProvider></ExperienceProvider></GoldProvider><PwaStatus /></SocialProvider></MusicProvider>
      <Toaster position="top-center" duration={3000} />
      <PortraitOrientation />
    </>
  )
}
