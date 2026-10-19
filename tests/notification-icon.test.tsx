import {cleanup,render} from '@testing-library/react'
import {afterEach,expect,it} from 'vitest'
import {notificationIconName,NotificationIcon} from '@/features/notifications/notification-icon'
afterEach(cleanup)
it.each([
 [{kind:'system',achievement_id:'fishing-1'},'title'],
 [{kind:'system',expedition_id:'trip'},'expedition'],
 [{kind:'system',expedition_boost_id:'boost'},'expedition-boost'],
 [{kind:'system',title:'어선이 귀항했어요!'},'expedition'],
 [{kind:'system',title:'친구가 어항을 닦아줬어요'},'clean'],
 [{kind:'system',title:'친구가 먹이를 줬어요'},'feed'],
 [{kind:'friend_request'},'friend-request'],
 [{kind:'friend_accepted'},'friend-accepted'],
 [{kind:'gift_received'},'gift-received'],
 [{kind:'gift_received',title:'거래소 물품이 도착했어요'},'exchange'],
 [{kind:'gift_claimed'},'gift-claimed'],
 [{kind:'gift_reaction'},'gift-reaction'],
 [{kind:'announcement',title:'버그 수정 안내'},'announcement'],
 [{category:'notice',notice_id:'notice'},'announcement'],
 [{kind:'reward',title:'[운영팀] 아이디어가 채택됐어요!'},'suggestion'],
 [{kind:'reward',title:'[운영팀] 버그 제보가 확인됐어요!'},'bug'],
 [{kind:'reward',title:'보상을 받았어요'},'reward'],
 [{kind:'system',title:'새로운 소식'},'system'],
])('selects the matching artwork for %o',(notification,expected)=>{
 expect(notificationIconName(notification)).toBe(expected)
 const {container}=render(<NotificationIcon notification={notification}/>)
 expect(container.querySelector('img')?.getAttribute('src')).toBe('notice_id' in notification?'/app-icons/notice-guide.png':'expedition_id' in notification||'expedition_boost_id' in notification?'/app-icons/fish-trap.png':`/notification-icons/${expected}.png`)
})
