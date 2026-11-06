export const farmFenceKinds=['fence','fenceWhite','fenceDark'] as const
export type FarmFenceKind=typeof farmFenceKinds[number]
export const isFarmFence=(kind:string):kind is FarmFenceKind=>farmFenceKinds.includes(kind as FarmFenceKind)
