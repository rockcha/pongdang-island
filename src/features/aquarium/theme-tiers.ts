export const themeTiers={
 simple:{label:'심플',description:'물빛과 여백 중심의 간결한 배경',className:'bg-muted text-muted-foreground'},
 mood:{label:'감성',description:'빛과 색감, 자연 풍경이 더해진 배경',className:'bg-emerald-50 text-emerald-800'},
 special:{label:'스페셜',description:'건물과 소품으로 공간을 구성한 배경',className:'bg-primary/10 text-primary'},
} as const
export type ThemeTier=keyof typeof themeTiers
