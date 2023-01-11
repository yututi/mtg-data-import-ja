import fetch from "node-fetch"
import { sleep } from "."

export const downloadImageFromScryfall = async ({ code, number, isFrontFace }: { code: string, number: string, isFrontFace: boolean }) => {

  const param = new URLSearchParams({
    format: "image",
    border: "border_crop"
  })
  if (!isFrontFace) {
    param.append("face", "back")
  }

  await sleep(200)
  console.log(`download start. code:${code}, number:${number}`)
  // jaの画像を優先して取得する。取れなかったらデフォルト（主に英語）
  const jaImageRes = await withRetry(async () => fetch(`https://api.scryfall.com//cards/${code}/${number}/ja?` + param.toString()), 5)
  if (jaImageRes.ok) {
    return jaImageRes
  }
  await sleep(200)
  const imageRes = await withRetry(async () => fetch(`https://api.scryfall.com//cards/${code}/${number}?` + param.toString()), 5)
  if (imageRes.ok) {
    return imageRes
  }
}

const withRetry = async <T>(callback: () => Promise<T>, count: number): Promise<T> => {
  try {
    return await callback()
  } catch (e) {
    if (count === 1) throw e
    sleep(1000)
    return await withRetry(callback, count - 1)
  }
}
