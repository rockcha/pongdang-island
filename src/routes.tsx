import { RegionPage } from '@/features/regions/region-page'
import { SailingPage } from '@/features/regions/sailing-page'
import { ShopPage } from '@/features/gold/shop-page'
import { WarehousePage } from '@/features/fishing/warehouse-page'
import { Navigate,Route, Routes } from 'react-router'
import { AppLayout } from '@/layouts/app-layout'
import { ArcadePage, ArcadeGamePage } from '@/features/arcade/arcade-page'
import { HomePage } from '@/pages/home-page'
import { NotFoundPage } from '@/pages/not-found-page'
import { AuthGuard } from '@/components/auth-guard'
import { LoginPage } from '@/pages/login-page'
import { NicknamePage } from '@/pages/nickname-page'
import { EmailConfirmPage } from '@/pages/email-confirm-page'
import { ForgotPasswordPage } from '@/pages/forgot-password-page'
import { ResetPasswordPage } from '@/pages/reset-password-page'
import { FriendsPage } from '@/features/friends/friends-page'
import { NotificationsPage } from '@/features/notifications/notifications-page'
import { ProfilePage } from '@/features/profile/profile-page'
import { AquariumPage } from '@/pages/aquarium-page'
import { HarborPage } from '@/pages/harbor-page'
import { PlaceSectionPage } from '@/pages/place-section-page'

export function AppRoutes() {
  return (
    <Routes>
      <Route element={<AppLayout />}>
        <Route path="login" element={<LoginPage />} />
        <Route path="auth/confirm" element={<EmailConfirmPage />} />
        <Route path="forgot-password" element={<ForgotPasswordPage />} />
        <Route path="reset-password" element={<ResetPasswordPage />} />
        <Route element={<AuthGuard />}>
          <Route path="nickname" element={<NicknamePage />} />
          <Route element={<AuthGuard requireNickname />}>
            <Route index element={<HomePage />} />
            <Route path="aquarium" element={<AquariumPage />} />
            <Route path="collection" element={<Navigate to="/aquarium" replace />} />
            <Route path="harbor" element={<HarborPage />} />
            <Route path="sailing/:regionId" element={<SailingPage />} />
            <Route path="region/:regionId" element={<RegionPage />} />
            <Route path="shop" element={<ShopPage />} />
            <Route path="warehouse" element={<WarehousePage />} />
            <Route path="arcade" element={<ArcadePage />} />
            <Route path="arcade/:gameId" element={<ArcadeGamePage />} />
            <Route path="friends" element={<FriendsPage />} />
            <Route path="profile" element={<ProfilePage />} />
            <Route path="notifications" element={<NotificationsPage />} />
            <Route path="square" element={<PlaceSectionPage section="square" />} />
            <Route path="square/notices" element={<PlaceSectionPage section="square" />} />
            <Route path="square/suggestions" element={<PlaceSectionPage section="square" />} />
            <Route path="square/bugs" element={<PlaceSectionPage section="square" />} />
            <Route path="merchant-street" element={<PlaceSectionPage section="merchants" />} />
            <Route path="merchant-street/exchange" element={<PlaceSectionPage section="merchants" />} />
            <Route path="merchant-street/auctions" element={<PlaceSectionPage section="merchants" />} />
          </Route>
        </Route>
        <Route path="*" element={<NotFoundPage />} />
      </Route>
    </Routes>
  )
}
