import { PrismaClient } from '@prisma/client'
import request from "request";
import { parse } from "jsonstream-ts"
import es from "event-stream"
import { Card, Set } from "./types"
import fs from "fs"
import pino from "pino"
require('dotenv').config()

// TODO JSONStreamは使わない方がいいかも

const TEMP_FILE_NAME = "./set.json"

const logger = pino({
  level: process.env.LOG_LEVEL || "info"
})
const prisma = new PrismaClient()

// mtgjsonからjsonファイルをダウンロードしてdbにインポートする
async function main() {
  logger.info("import json start.")

  const hash = await fetchHashValue()
  logger.debug("hash: " + hash)
  const lastImported = await prisma.lastImported.findFirst()
  const isSameHash = lastImported?.sha === hash
  if (isSameHash) {
    logger.info("hash not changed. skip import.")
    return;
  }

  if (!fs.existsSync(TEMP_FILE_NAME)) {
    await downloadJsonFile()
  }

  const allSet = await readAllSetData()

  const createSetResult = await prisma.set.createMany({
    data: allSet,
    skipDuplicates: true
  })

  logger.info(`set insert done. count:${createSetResult.count}`)

  const allCard = await readAllCardData()

  logger.debug("card insert start")

  const cardCreateResult = await prisma.card.createMany({
    data: allCard
      .filter(distinctAndPioneerfiliter)
      .map(card => {
        const localizedData = card.foreignData.filter(data => data.language === "Japanese").pop()

        return {
          uuid: card.uuid,
          colorIdentities: card.colorIdentity,
          cardTypeJa: localizedData?.type || "",
          isLegendary: card.types.includes("Legendary"),
          loyalty: card.loyalty,
          manaCost: card.manaCost,
          manaValue: card.manaValue,
          name: localizedData?.name || card.name,
          power: card.power,
          toughness: card.toughness,
          subTypes: card.subtypes,
          superTypes: card.supertypes,
          types: card.types,
          flavorText: localizedData?.flavorText || card.flavorText,
          text: localizedData?.text || card.text,
          scryfallId: card.identifiers.scryfallId,
          rarity: card.rarity,
          otherFaceUuid: (card.otherFaceIds || []).pop(),
          isMainSpell: card.side == null || card.side === "a",
          setCode: card.setCode,
          number: card.number
        }
      }),
    skipDuplicates: true
  })

  logger.info(`card insert done. count:${cardCreateResult.count}`)

  await prisma.lastImported.deleteMany({})
  await prisma.lastImported.create({
    data: {
      sha: hash,
      at: new Date()
    }
  })
}

const fetchHashValue = async () => {
  const hashFileUrl = process.env.JSON_URL + ".sha256"
  logger.info("download sha256 from:" + hashFileUrl)
  let text = ""
  return new Promise<string>(resolve => {
    request({ url: hashFileUrl, encoding: "utf-8" })
      .on("data", (data) => {
        text += data
      }).on("end", () => {
        resolve(text)
      })
  })
}

const downloadJsonFile = async () => {
  logger.info("download file from:" + process.env.JSON_URL)
  return new Promise<void>(resolve => {
    const fstream = fs.createWriteStream(TEMP_FILE_NAME)
    request({ url: process.env.JSON_URL || "" }).pipe(fstream).on("finish", () => {
      fstream.close()
      resolve()
    })
  })
}

const readAllCardData = () => {
  return new Promise<Card[]>(resolve => {
    const allCard: Card[] = []
    fs.createReadStream(TEMP_FILE_NAME)
      .pipe(parse("data.*.cards.*", undefined))
      .pipe(es.mapSync((card: Card) => {

        allCard.push(card)

        return card
      }))
      .on("end", () => {
        resolve(allCard)
      })
  })
}

const readAllSetData = () => {
  return new Promise<Set[]>(resolve => {
    const allSet: Set[] = []
    fs.createReadStream(TEMP_FILE_NAME)
      .pipe(parse("data.*", undefined))
      .pipe(es.mapSync((set: Set) => {
        allSet.push({
          name: set.name,
          code: set.code
        })
      }))
      .on("end", () => {
        resolve(allSet)
      })
  })
}

const distinctAndPioneerfiliter = (card: Card): boolean => {

  // collector numberが数値以外のものは絵違い,またはalchemyなど特殊フォーマットのカードなので除外
  if (Number.isNaN(Number(card.number))) {
    return false
  }

  if (card.legalities.pioneer !== "Legal") {
    return false
  }

  return true
}

main()
  .catch(e => {
    logger.error(e)
    throw e;
  })
  .finally(() => {
    if (process.env.KEEP_JSON_FILE !== "yes") {
      fs.unlinkSync(TEMP_FILE_NAME)
    }
    logger.info("import json done.")
  })
