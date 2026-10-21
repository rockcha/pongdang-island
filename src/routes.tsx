import { MerchantPage } from '@/features/merchant/merchant-page'
import { HallPage } from '@/features/hall-of-fame/hall-page'
import {ShowcasePage} from '@/features/showcase/showcase-page'
import {ShowcaseEditor} from '@/features/showcase/showcase-editor'
import {ShowcasePreview} from '@/features/showcase/showcase-preview'
import { DownloadPage } from '@/pages/download-page'
import { BoardPage, BoardDetailPage } from '@/features/board/board-page'
import { CollectionPage } from '@/features/collection/collection-page'
import { OperatorGuard } from '@/components/operator-guard'
import { TitlePicker } from '@/features/titles/title-picker'
import { ExpeditionPage } from '@/features/expeditions/expedition-page'
import { PortPage } from '@/features/port/port-page'
import { FriendExpeditionPage } from '@/features/expeditions/friend-expedition-page'
import { SettingsPage } from '@/pages/settings-page'
import { SavingsPage } from '@/features/savings/savings-page'
import { SuggestionsPage, SuggestionDetail } from '@/features/suggestions/suggestions-page'
import { BugReportsPage, BugReportDetail } from '@/features/bugs/bug-reports-page'
import { RegionPage } from '@/features/regions/region-page'
import { SailingPage } from '@/features/regions/sailing-page'
import { FishingShortcutPage } from '@/features/regions/fishing-shortcut-page'
import { ShopPage } from '@/features/gold/shop-page'
import { ExchangePage } from '@/features/exchange/exchange-page'
import { ExchangeDetailPage } from '@/features/exchange/exchange-detail-page'
import { NoticePage, NoticeDetail } from '@/features/notices/notice-page'
import { NoticeEditor } from '@/features/notices/notice-editor'
import { WarehousePage } from '@/features/fishing/warehouse-page'
import { Navigate, Route, Routes } from 'react-router'
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
import { FriendAquariumPage } from '@/features/friends/friend-aquarium-page'
import { NotificationsPage } from '@/features/notifications/notifications-page'
import { ProfilePage } from '@/features/profile/profile-page'
import { AquariumPage } from '@/pages/aquarium-page'
import { HarborPage } from '@/pages/harbor-page'
import { FarmPage } from '@/pages/farm-page'
import { MusicRoomPage } from '@/pages/music-room-page'

export function AppRoutes() {
  return (
    <Routes>
      <Route element={<AppLayout />}>
        <Route path="download" element={<DownloadPage />} />
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
            <Route
              path="collection-animation"
              element={
                <OperatorGuard>
                  <CollectionPage animationPreview />
                </OperatorGuard>
              }
            />
            <Route path="titles" element={<TitlePicker page />} />
            <Route path="harbor" element={<HarborPage />} />
            <Route path="fishing" element={<FishingShortcutPage />} />
            <Route path="farm" element={<FarmPage />} />
            <Route path="music-room" element={<MusicRoomPage />} />
            <Route path="sailing/:regionId" element={<SailingPage />} />
            <Route path="region/:regionId" element={<RegionPage />} />
            <Route path="expeditions" element={<ExpeditionPage />} />
            <Route path="shipyard" element={<PortPage shipyard />} />
            <Route path="port" element={<PortPage />} />
            <Route path="shop" element={<ShopPage key="fishing-shop" />} />
            <Route path="item-shop" element={<ShopPage key="item-shop" items />} />
            <Route path="savings" element={<SavingsPage />} />
            <Route path="warehouse" element={<WarehousePage />} />
            <Route path="arcade" element={<ArcadePage />} />
            <Route path="arcade/:gameId" element={<ArcadeGamePage />} />
            <Route path="friends" element={<FriendsPage />} />
            <Route path="hall-of-fame" element={<HallPage />} />
            <Route path="friends/:ownerId/aquarium" element={<FriendAquariumPage />} />
            <Route path="friends/:ownerId/expeditions" element={<FriendExpeditionPage />} />
            <Route path="profile" element={<ProfilePage />} />
            <Route path="profile/settings" element={<SettingsPage />} />
            <Route path="notifications" element={<NotificationsPage />} />
            <Route path="board" element={<BoardPage />} />
            <Route path="showcase" element={<ShowcasePage />} />
            <Route path="showcase/new" element={<ShowcaseEditor />} />
            <Route path="showcase/preview" element={<ShowcasePreview />} />
            <Route path="board/:postId" element={<BoardDetailPage />} />
            <Route path="square" element={<Navigate to="/board" replace />} />
            <Route path="square/notices" element={<NoticePage />} />
            <Route path="square/notices/new" element={<NoticeEditor />} />
            <Route path="square/notices/:noticeId" element={<NoticeDetail />} />
            <Route path="square/notices/:noticeId/edit" element={<NoticeEditor />} />
            <Route path="square/suggestions" element={<SuggestionsPage />} />
            <Route path="square/suggestions/:suggestionId" element={<SuggestionDetail />} />
            <Route path="square/bugs" element={<BugReportsPage />} />
            <Route path="square/bugs/:bugReportId" element={<BugReportDetail />} />
            <Route path="merchant-street" element={<Navigate to="/shop" replace />} />
            <Route path="merchant-orders" element={<MerchantPage />} />
            <Route path="exchange" element={<ExchangePage />} />
            <Route path="exchange/:listingId" element={<ExchangeDetailPage />} />
            <Route path="merchant-street/exchange" element={<Navigate to="/exchange" replace />} />
            <Route path="merchant-street/auctions" element={<Navigate to="/exchange" replace />} />
          </Route>
        </Route>
        <Route path="*" element={<NotFoundPage />} />
      </Route>
    </Routes>
  )
}
