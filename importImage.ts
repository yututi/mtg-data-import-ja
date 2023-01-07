import { PrismaClient } from '@prisma/client'
import request from "request";
import JSONStream from "JSONStream"
import es from "event-stream"
import { Card, ForeignData } from "./types"
import fs from "fs"
require('dotenv').config();
import AWS from 'aws-sdk'
import S3 from 'aws-sdk/clients/s3'

// WIP

const region = 'ap-northeast-1'
const s3Client = new S3({
  region,
})
const bucketName = 'YOUR_BUCKET_NAME'

const CHUNK_SIZE = 10;

const prisma = new PrismaClient()


async function main() {
  forEachCardChunk(async (importDataList) => {

    importDataList.map(async data => {
      const res = request(`https://api.scryfall.com/cards/${data.scryfallId}?format=image`)

      await s3Client.upload({
        Bucket: bucketName,
        Key: data.id,
        Body: res
      }).promise()

      prisma.card.update({
        data: {
          isImageImported: true
        },
        where: {
          uuid: data.id
        }
      })
    })

  })
}

type ImportData = {
  id: string
  scryfallId: string
}
type Callback = (cards: ImportData[]) => Promise<unknown>
const forEachCardChunk = async (callback: Callback) => {
  let page = 0;
  let done = false
  while (!done) {
    const cards = await selectUnimportedCardChunk(page++);
    done = cards.length < CHUNK_SIZE;
    await callback(cards
      .filter(card => !!card.scryfallId)
      .map(card => ({
        id: card.uuid,
        scryfallId: card.scryfallId!
      })))
    await sleep(500)
  }
}

const sleep = (ms:number) => {
  return new Promise(resolve => {
    setTimeout(resolve, ms)
  })
}

const selectUnimportedCardChunk = (page: number) => {
  return prisma.card.findMany({
    take: CHUNK_SIZE,
    skip: page * CHUNK_SIZE,
    orderBy: {
      uuid: "asc"
    },
    where: {
      isImageImported: false
    }
  })
}


main()