export const sailingScenes = [
 { id: 'raft', image: '/sprites/pongi-sailing.png', label: '뗏목을 타고 노를 젓는 퐁이', caption: '잔잔한 물결을 따라 곧 도착해요.' },
 { id: 'telescope', image: '/sprites/pongi-telescope.png', label: '돛단배에서 망원경으로 바다를 살피는 퐁이', caption: '저 멀리 새로운 바다가 보이는 것 같아요.' },
 { id: 'shell-map', image: '/sprites/pongi-shell-map.png', label: '조개 배에서 지도를 펼쳐 보는 퐁이', caption: '지도 위 작은 항로를 따라가고 있어요.' },
] as const
export function pickSailingScene(random = Math.random) {
 return sailingScenes[Math.floor(random() * sailingScenes.length)]
}
