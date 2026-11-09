type Entry = { image: HTMLImageElement; ready: boolean; promise: Promise<HTMLImageElement> }
const cache = new Map<string, Entry>()
export const readyPetImage = (url: string) => {
  const entry = cache.get(url)
  return entry?.ready ? entry.image : undefined
}
export function loadPetImage(url: string): Promise<HTMLImageElement> {
  const existing = cache.get(url)
  if (existing) return existing.promise
  const image = new Image()
  const entry = {} as Entry
  entry.image = image
  entry.ready = false
  entry.promise = new Promise<HTMLImageElement>((resolve, reject) => {
    image.onload = async () => {
      try {
        if (image.decode) await image.decode()
        entry.ready = true
        resolve(image)
      } catch (error) {
        cache.delete(url)
        reject(error)
      }
    }
    image.onerror = () => {
      cache.delete(url)
      reject(new Error('PET_IMAGE_LOAD_FAILED'))
    }
  })
  cache.set(url, entry)
  image.src = url
  return entry.promise
}
