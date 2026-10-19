import {CollectionPage} from '@/features/collection/collection-page'
import {TitlePicker} from '@/features/titles/title-picker'
import {ExpeditionPage} from '@/features/expeditions/expedition-page'
import {FriendExpeditionPage} from '@/features/expeditions/friend-expedition-page'
import { SettingsPage } from '@/pages/settings-page'
import { SavingsPage } from '@/features/savings/savings-page'
import { SuggestionsPage, SuggestionDetail } from '@/features/suggestions/suggestions-page'
import { BugReportsPage, BugReportDetail } from '@/features/bugs/bug-reports-page'
import { RegionPage } from '@/features/regions/region-page'
import { SailingPage } from '@/features/regions/sailing-page'
import { ShopPage } from '@/features/gold/shop-page'
import { ExchangePage } from '@/features/exchange/exchange-page'
import { NoticePage,NoticeDetail } from '@/features/notices/notice-page'
import { NoticeEditor } from '@/features/notices/notice-editor'
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
import {FriendAquariumPage} from '@/features/friends/friend-aquarium-page'
import { NotificationsPage } from '@/features/notifications/notifications-page'
import { ProfilePage } from '@/features/profile/profile-page'
import { AquariumPage } from '@/pages/aquarium-page'
import { HarborPage } from '@/pages/harbor-page'
import { FarmPage } from '@/pages/farm-page'
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
            <Route path="collection" element={<CollectionPage />} />
            <Route path="collection-animation" element={<CollectionPage animationPreview />} />
            <Route path="titles" element={<TitlePicker page />} />
            <Route path="harbor" element={<HarborPage />} />
            <Route path="farm" element={<FarmPage />} />
            <Route path="sailing/:regionId" element={<SailingPage />} />
            <Route path="region/:regionId" element={<RegionPage />} />
            <Route path="expeditions" element={<ExpeditionPage />} />
            <Route path="shipyard" element={<ExpeditionPage shipyard />} />
            <Route path="shop" element={<ShopPage />} />
            <Route path="savings" element={<SavingsPage />} />
            <Route path="warehouse" element={<WarehousePage />} />
            <Route path="arcade" element={<ArcadePage />} />
            <Route path="arcade/:gameId" element={<ArcadeGamePage />} />
            <Route path="friends" element={<FriendsPage />} />
            <Route path="friends/:ownerId/aquarium" element={<FriendAquariumPage />} />
            <Route path="friends/:ownerId/expeditions" element={<FriendExpeditionPage />} />
            <Route path="profile" element={<ProfilePage />} />
            <Route path="profile/settings" element={<SettingsPage />} />
            <Route path="notifications" element={<NotificationsPage />} />
            <Route path="square" element={<PlaceSectionPage section="square" />} />
            <Route path="square/notices" element={<NoticePage />} />
            <Route path="square/notices/new" element={<NoticeEditor />} />
            <Route path="square/notices/:noticeId" element={<NoticeDetail />} />
            <Route path="square/notices/:noticeId/edit" element={<NoticeEditor />} />
            <Route path="square/suggestions" element={<SuggestionsPage />} />
            <Route path="square/suggestions/:suggestionId" element={<SuggestionDetail />} />
            <Route path="square/bugs" element={<BugReportsPage />} />
            <Route path="square/bugs/:bugReportId" element={<BugReportDetail />} />
            <Route path="merchant-street" element={<Navigate to="/shop" replace />} />
            <Route path="exchange" element={<ExchangePage />} />
            <Route path="merchant-street/exchange" element={<Navigate to="/exchange" replace />} />
            <Route path="merchant-street/auctions" element={<Navigate to="/exchange" replace />} />
          </Route>
        </Route>
        <Route path="*" element={<NotFoundPage />} />
      </Route>
    </Routes>
  )
}
