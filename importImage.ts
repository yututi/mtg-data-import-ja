import { PrismaClient } from '@prisma/client'
import request from "request";
import fs from "fs"
require('dotenv').config();
import S3 from 'aws-sdk/clients/s3'
import { downloadImageFromScryfall } from './utils/scryfall';

// WIP

const region = 'ap-northeast-1'
const s3Client = new S3({
  region,
})
const CHUNK_SIZE = 10;

const prisma = new PrismaClient()

async function main() {
  forEachCardChunk(async (importDataList) => {

    for (const {
      collectorNumber,
      id,
      setCode,
      isFrontFace
    } of importDataList) {
      console.log("import start. " + id)

      const response = await downloadImageFromScryfall({ code: setCode, number: collectorNumber, isFrontFace })

      if (!response) {
        console.log("image not found. " + id)
        continue
      }

      await s3Client.upload({
        Bucket: process.env.S3_BUCKET_NAME || "",
        Key: id + ".jpeg",
        Body: response.body
      }).promise()

      await prisma.card.update({
        data: {
          isImageImported: true
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
}
type Callback = (cards: ImportData[]) => Promise<unknown>
const forEachCardChunk = async (callback: Callback) => {
  let page = 0;
  let done = false
  while (!done) {
    const cards = await selectUnimportedCardChunk(page++);
    done = cards.length < CHUNK_SIZE;
    await callback(cards
      .map(card => ({
        id: card.uuid,
        collectorNumber: card.number,
        setCode: card.setCode.toLowerCase(),
        isFrontFace: card.isFrontFace
      })))
    await sleep(500)
  }
}

const sleep = (ms: number) => {
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
    select: {
      uuid: true,
      scryfallId: true,
      number: true,
      setCode: true,
      isFrontFace: true
    },
    where: {
      isImageImported: false
    }
  })
}

main()