/** Navigation categories shared by the header and the island's starter layout. */
export const placeGroups = [
  {
    id: 'home',
    label: '내 섬',
    sections: [
      { label: '나의 공간', paths: ['/my-island', '/aquarium', '/profile'] },
      { label: '쉬어가기', paths: ['/music-room', '/arcade'] },
      { label: '골드 관리', paths: ['/savings'] },
    ],
  },
  {
    id: 'sea',
    label: '바다',
    sections: [
      { label: '낚시', paths: ['/harbor', '/fishing'] },
      { label: '자동 낚시', paths: ['/expeditions', '/port'] },
    ],
  },
  {
    id: 'production',
    label: '생산',
    sections: [
      { label: '미끼 만들기', paths: ['/bait-production', '/my-bait-production'] },
      { label: '연료·재배', paths: ['/production', '/farm'] },
    ],
  },
  {
    id: 'market',
    label: '장터',
    sections: [
      { label: '상점거리', paths: ['/shop', '/item-shop', '/decoration-shop'] },
      { label: '시설 구매', paths: ['/shipyard', '/bait-production-shop', '/production-shop'] },
      { label: '거래·의뢰', paths: ['/flea-market', '/exchange', '/merchant-orders'] },
    ],
  },
  {
    id: 'collection',
    label: '수집',
    sections: [
      { label: '보관', paths: ['/storage', '/warehouse'] },
      { label: '수집 기록', paths: ['/collection', '/item-collection', '/titles', '/relics', '/collection-animation'] },
    ],
  },
  {
    id: 'news',
    label: '소식',
    sections: [
      { label: '섬 소식', paths: ['/island-news', '/square/notices'] },
      { label: '의견 보내기', paths: ['/square/suggestions', '/square/bugs'] },
    ],
  },
  {
    id: 'community',
    label: '광장',
    sections: [
      { label: '교류', paths: ['/friends', '/board', '/showcase'] },
      { label: '명예', paths: ['/hall-of-fame'] },
      { label: '함께하기', paths: ['/development-fund', '/square/sponsorship', '/square/begging'] },
    ],
  },
]
