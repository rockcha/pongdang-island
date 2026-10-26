import {DecorationShopPage} from '@/features/gold/decoration-shop-page'
import {lazy} from 'react'
import { OperatorGuard } from '@/components/operator-guard'
import { Navigate, Route, Routes } from 'react-router'
import { AppLayout } from '@/layouts/app-layout'
import { AuthGuard } from '@/components/auth-guard'
import {FirstFishingGate} from '@/features/onboarding/first-fishing-gate'
const FirstFishingPage=lazy(()=>import('@/features/onboarding/first-fishing-page').then(module=>({default:module.FirstFishingPage})))

const MerchantPage=lazy(()=>import('@/features/merchant/merchant-page').then(module=>({default:module.MerchantPage})))
const HallPage=lazy(()=>import('@/features/hall-of-fame/hall-page').then(module=>({default:module.HallPage})))
const ShowcasePage=lazy(()=>import('@/features/showcase/showcase-page').then(module=>({default:module.ShowcasePage})))
const SponsorshipPage=lazy(()=>import('@/features/sponsorship/sponsorship-page').then(module=>({default:module.SponsorshipPage})))
const BeggingPage=lazy(()=>import('@/features/begging/begging-page').then(module=>({default:module.BeggingPage})))
const ShowcaseEditor=lazy(()=>import('@/features/showcase/showcase-editor').then(module=>({default:module.ShowcaseEditor})))
const ShowcasePreview=lazy(()=>import('@/features/showcase/showcase-preview').then(module=>({default:module.ShowcasePreview})))
const DownloadPage=lazy(()=>import('@/pages/download-page').then(module=>({default:module.DownloadPage})))
const BoardPage=lazy(()=>import('@/features/board/board-page').then(module=>({default:module.BoardPage})))
const BoardDetailPage=lazy(()=>import('@/features/board/board-page').then(module=>({default:module.BoardDetailPage})))
const CollectionPage=lazy(()=>import('@/features/collection/collection-page').then(module=>({default:module.CollectionPage})))
const StoragePage=lazy(()=>import('@/features/aquarium/storage-page').then(module=>({default:module.StoragePage})))
const BaitProductionPage=lazy(()=>import('@/features/production/bait-production-page').then(module=>({default:module.BaitProductionPage})))
const PersonalBaitWorkshopPage=lazy(()=>import('@/features/production/personal-bait-workshop-page').then(module=>({default:module.PersonalBaitWorkshopPage})))
const ProductionPage=lazy(()=>import('@/features/production/production-page').then(module=>({default:module.ProductionPage})))
const RelicPage=lazy(()=>import('@/features/relics/relic-loadout').then(module=>({default:module.RelicPage})))
const TitlePicker=lazy(()=>import('@/features/titles/title-picker').then(module=>({default:module.TitlePicker})))
const ExpeditionPage=lazy(()=>import('@/features/expeditions/expedition-page').then(module=>({default:module.ExpeditionPage})))
const PortPage=lazy(()=>import('@/features/port/port-page').then(module=>({default:module.PortPage})))
const FriendExpeditionPage=lazy(()=>import('@/features/expeditions/friend-expedition-page').then(module=>({default:module.FriendExpeditionPage})))
const SettingsPage=lazy(()=>import('@/pages/settings-page').then(module=>({default:module.SettingsPage})))
const SavingsPage=lazy(()=>import('@/features/savings/savings-page').then(module=>({default:module.SavingsPage})))
const SuggestionsPage=lazy(()=>import('@/features/suggestions/suggestions-page').then(module=>({default:module.SuggestionsPage})))
const SuggestionDetail=lazy(()=>import('@/features/suggestions/suggestions-page').then(module=>({default:module.SuggestionDetail})))
const BugReportsPage=lazy(()=>import('@/features/bugs/bug-reports-page').then(module=>({default:module.BugReportsPage})))
const BugReportDetail=lazy(()=>import('@/features/bugs/bug-reports-page').then(module=>({default:module.BugReportDetail})))
const RegionPage=lazy(()=>import('@/features/regions/region-page').then(module=>({default:module.RegionPage})))
const SailingPage=lazy(()=>import('@/features/regions/sailing-page').then(module=>({default:module.SailingPage})))
const FishingShortcutPage=lazy(()=>import('@/features/regions/fishing-shortcut-page').then(module=>({default:module.FishingShortcutPage})))
const ShopPage=lazy(()=>import('@/features/gold/shop-page').then(module=>({default:module.ShopPage})))
const ExchangePage=lazy(()=>import('@/features/exchange/exchange-page').then(module=>({default:module.ExchangePage})))
const ExchangeDetailPage=lazy(()=>import('@/features/exchange/exchange-detail-page').then(module=>({default:module.ExchangeDetailPage})))
const NoticePage=lazy(()=>import('@/features/notices/notice-page').then(module=>({default:module.NoticePage})))
const NoticeDetail=lazy(()=>import('@/features/notices/notice-page').then(module=>({default:module.NoticeDetail})))
const NoticeEditor=lazy(()=>import('@/features/notices/notice-editor').then(module=>({default:module.NoticeEditor})))
const WarehousePage=lazy(()=>import('@/features/fishing/warehouse-page').then(module=>({default:module.WarehousePage})))
const ArcadePage=lazy(()=>import('@/features/arcade/arcade-page').then(module=>({default:module.ArcadePage})))
const ArcadeGamePage=lazy(()=>import('@/features/arcade/arcade-page').then(module=>({default:module.ArcadeGamePage})))
const HomePage=lazy(()=>import('@/pages/home-page').then(module=>({default:module.HomePage})))
const NotFoundPage=lazy(()=>import('@/pages/not-found-page').then(module=>({default:module.NotFoundPage})))
const LoginPage=lazy(()=>import('@/pages/login-page').then(module=>({default:module.LoginPage})))
const NicknamePage=lazy(()=>import('@/pages/nickname-page').then(module=>({default:module.NicknamePage})))
const EmailConfirmPage=lazy(()=>import('@/pages/email-confirm-page').then(module=>({default:module.EmailConfirmPage})))
const ForgotPasswordPage=lazy(()=>import('@/pages/forgot-password-page').then(module=>({default:module.ForgotPasswordPage})))
const ResetPasswordPage=lazy(()=>import('@/pages/reset-password-page').then(module=>({default:module.ResetPasswordPage})))
const FriendsPage=lazy(()=>import('@/features/friends/friends-page').then(module=>({default:module.FriendsPage})))
const FriendAquariumPage=lazy(()=>import('@/features/friends/friend-aquarium-page').then(module=>({default:module.FriendAquariumPage})))
const NotificationsPage=lazy(()=>import('@/features/notifications/notifications-page').then(module=>({default:module.NotificationsPage})))
const ProfilePage=lazy(()=>import('@/features/profile/profile-page').then(module=>({default:module.ProfilePage})))
const AquariumPage=lazy(()=>import('@/pages/aquarium-page').then(module=>({default:module.AquariumPage})))
const HarborPage=lazy(()=>import('@/pages/harbor-page').then(module=>({default:module.HarborPage})))
const FarmPage=lazy(()=>import('@/pages/farm-page').then(module=>({default:module.FarmPage})))
const MusicRoomPage=lazy(()=>import('@/pages/music-room-page').then(module=>({default:module.MusicRoomPage})))

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
            <Route path="square/sponsorship" element={<SponsorshipPage />} />
            <Route path="square/begging" element={<BeggingPage />} />
          <Route element={<FirstFishingGate/>}>
            <Route path="first-fishing" element={<FirstFishingPage/>}/>
            <Route index element={<Navigate to="/aquarium" replace />} />
            <Route path="island-news" element={<HomePage />} />
            <Route path="aquarium" element={<AquariumPage />} />
            <Route path="collection" element={<CollectionPage />} />
            <Route path="storage" element={<StoragePage />} />
            <Route path="bait-production" element={<BaitProductionPage />} />
            <Route path="my-bait-production" element={<PersonalBaitWorkshopPage />} />
            <Route path="bait-production-shop" element={<BaitProductionPage shop />} />
            <Route path="production" element={<ProductionPage />} />
            <Route path="production-shop" element={<ProductionPage shop />} />
            <Route
              path="collection-animation"
              element={
                <OperatorGuard>
                  <CollectionPage animationPreview />
                </OperatorGuard>
              }
            />
            <Route path="titles" element={<TitlePicker page />} />
            <Route path="relics" element={<RelicPage />} />
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
            <Route path="decoration-shop" element={<DecorationShopPage />} />
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
        </Route>
        <Route path="*" element={<NotFoundPage />} />
      </Route>
    </Routes>
  )
}
