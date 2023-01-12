import fetch from "node-fetch"
import { sleep } from "."

export const downloadImageFromScryfall = async ({ code, number, isMainSpell }: { code: string, number: string, isMainSpell: boolean }) => {

  const param = new URLSearchParams({
    format: "image",
    version: "large"
  })
  if (!isMainSpell) {
    param.append("face", "back")
  }

  await sleep(100)
  console.log(`download start. code:${code}, number:${number}`)
  // jaの画像を優先して取得する。取れなかったらデフォルト（主に英語）
  const jaImageRes = await withRetry(async () => fetch(`https://api.scryfall.com//cards/${code}/${number}/ja?` + param.toString()), 5)
  if (jaImageRes.ok) {
    return jaImageRes
  }
  await sleep(100)
  const imageRes = await withRetry(async () => fetch(`https://api.scryfall.com//cards/${code}/${number}?` + param.toString()), 5)
  if (imageRes.ok) {
    return imageRes
  }
}

const withRetry = async <T>(callback: () => Promise<T>, count: number): Promise<T> => {
  try {
    return await callback()
  } catch (e) {
    if (count === 1) {
      console.log("request failed.")
      throw e
    }
    console.log("request failed. retrying...")
    sleep(1000)
    return await withRetry(callback, count - 1)
  }
}
