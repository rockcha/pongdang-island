import { GoldProvider } from '@/features/gold/gold-provider'
import { AppRoutes } from '@/routes'
import { Toaster } from '@/components/ui/sonner'
import { PwaStatus } from '@/components/pwa-status'
import { SocialProvider } from '@/features/social/social-provider'

export default function App() {
  return (
    <>
      <SocialProvider><GoldProvider><AppRoutes /></GoldProvider></SocialProvider>
      <Toaster position="bottom-right" richColors closeButton />
      <PwaStatus />
    </>
  )
}
