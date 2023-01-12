import { PrismaClient } from '@prisma/client'
require('dotenv').config();
import S3 from 'aws-sdk/clients/s3'
import { downloadImageFromScryfall } from './utils/scryfall';

const region = 'ap-northeast-1'
const s3Client = new S3({
  region,
})
const CHUNK_SIZE = 10;

const prisma = new PrismaClient()

// dbのisImageImportedがfalseのデータを抽出し、scrtfallから画像を取得する。
// 取得できたらisImageImportedをtrueにする。
async function main() {
  forEachCardChunk(async (importDataList) => {

    for (const {
      collectorNumber,
      id,
      setCode,
      isMainSpell,
      otherFaceUuid
    } of importDataList) {
      console.log("import start. " + id)

      const response = await downloadImageFromScryfall({ code: setCode, number: collectorNumber, isMainSpell })

      if (!response) {
        console.log("image not found. " + id)

        if (!isMainSpell) {
          // 表面に２つ分のカードが記載されているケース
          // 画像は存在しないのでインポート済みとする
          await prisma.card.update({
            data: {
              isImageImported: true
            },
            where: {
              uuid: id
            }
          })
        }

        continue
      }

      await s3Client.upload({
        Bucket: process.env.S3_BUCKET_NAME || "",
        Key: id + ".jpeg",
        Body: response.body
      }).promise()

      // ２つ呪文がありメインでない呪文の画像が取得できた場合、それは両面カード
      // 表面側の両面カードフラグを立てる
      if (!isMainSpell && otherFaceUuid) {
        console.log("detect reversible card. " + otherFaceUuid)
        await prisma.card.update({
          data: {
            isReversible: true
          },
          where: {
            uuid: otherFaceUuid
          }
        })
      }

      await prisma.card.update({
        data: {
          isImageImported: true,
          isReversible: !isMainSpell
        },
        where: {
          uuid: id
        }
      })
    }
  })
}

type ImportData = {
  id: string
  collectorNumber: string
  setCode: string
  isFrontFace: boolean
  isMainSpell: boolean
  otherFaceUuid: string | null
}
type Callback = (cards: ImportData[]) => Promise<unknown>
const forEachCardChunk = async (callback: Callback) => {
  let done = false
  while (!done) {
    const cards = await selectUnimportedCardChunk();
    done = cards.length < CHUNK_SIZE;
    await callback(cards
      .map(card => ({
        id: card.uuid,
        collectorNumber: card.number,
        setCode: card.setCode.toLowerCase(),
        isFrontFace: card.isFrontFace,
        isMainSpell: card.isMainSpell,
        otherFaceUuid: card.otherFaceUuid
      })))
    await sleep(500)
  }
}

const sleep = (ms: number) => {
  return new Promise(resolve => {
    setTimeout(resolve, ms)
  })
}

const selectUnimportedCardChunk = () => {
  return prisma.card.findMany({
    take: CHUNK_SIZE,
    orderBy: {
      uuid: "asc"
    },
    select: {
      uuid: true,
      scryfallId: true,
      number: true,
      setCode: true,
      isFrontFace: true,
      isMainSpell: true,
      otherFaceUuid: true
    },
    where: {
      isImageImported: false
    }
  })
}

main()