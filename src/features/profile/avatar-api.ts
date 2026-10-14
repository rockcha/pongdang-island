import { createClient } from '@/lib/client'
export const AVATAR_BUCKET = 'avatars'
export const MAX_AVATAR_BYTES = 5 * 1024 * 1024
export function validateAvatarFile(file: Pick<File, 'type' | 'size'>): string | null {
  if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) return 'JPG, PNG, WebP 이미지를 선택해주세요.'
  if (!file.size) return '비어 있는 파일은 사용할 수 없어요.'
  if (file.size > MAX_AVATAR_BYTES) return '이미지는 5MB 이하로 선택해주세요.'
  return null
}
export function avatarUrl(path?: string | null): string | undefined {
  if (!path) return undefined
  return createClient().storage.from(AVATAR_BUCKET).getPublicUrl(path).data.publicUrl
}
export async function prepareAvatar(file: File): Promise<Blob> {
  const error = validateAvatarFile(file)
  if (error) throw new Error(error)
  const objectUrl = URL.createObjectURL(file)
  try {
    const image = new Image()
    image.src = objectUrl
    await image.decode()
    if (!image.naturalWidth || !image.naturalHeight || image.naturalWidth * image.naturalHeight > 40_000_000) throw new Error('이미지 해상도가 너무 커요. 작은 이미지로 다시 선택해주세요.')
    const canvas = document.createElement('canvas')
    canvas.width = 512; canvas.height = 512
    const context = canvas.getContext('2d')
    if (!context) throw new Error('이미지를 처리하지 못했어요.')
    const edge = Math.min(image.naturalWidth, image.naturalHeight)
    context.drawImage(image, (image.naturalWidth-edge)/2, (image.naturalHeight-edge)/2, edge, edge, 0, 0, 512, 512)
    const blob = await new Promise<Blob>((resolve,reject) => canvas.toBlob(value => value ? resolve(value) : reject(new Error('이미지를 변환하지 못했어요.')), 'image/webp', .85))
    if (blob.type !== 'image/webp') throw new Error('이 브라우저에서는 이미지 저장을 지원하지 않아요. 최신 브라우저로 시도해주세요.')
    return blob
  } finally { URL.revokeObjectURL(objectUrl) }
}
export async function saveAvatar(userId: string, blob: Blob | null, previousPath?: string | null) {
  const client = createClient()
  const storage = client.storage.from(AVATAR_BUCKET)
  const path = blob ? `${userId}/${crypto.randomUUID()}.webp` : null
  if (blob && path) {
    const { error } = await storage.upload(path,blob,{contentType:'image/webp',upsert:false,cacheControl:'3600'})
    if (error) throw new Error('이미지 업로드에 실패했어요. 잠시 후 다시 시도해주세요.')
  }
  const { error } = await client.rpc('set_player_avatar',{p_path:path})
  if (error) {
    if (path) await storage.remove([path]).catch(() => {})
    throw new Error('아바타 설정을 저장하지 못했어요. 잠시 후 다시 시도해주세요.')
  }
  // Metadata is committed before removing the previous image; cleanup failure does not undo a save.
  if (previousPath && previousPath !== path) {
    const { error: cleanupError } = await storage.remove([previousPath]).catch(() => ({error:true}))
    if (cleanupError) console.warn('이전 아바타 파일 정리가 완료되지 않았습니다.')
  }
}
