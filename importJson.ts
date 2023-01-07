import { PrismaClient } from '@prisma/client'
import request from "request";
import JSONStream from "JSONStream"
import es from "event-stream"
import { Card, Set } from "./types"
import fs from "fs"
require('dotenv').config();

const TEMP_FILE_NAME = "./set.json"

const prisma = new PrismaClient()

async function main() {

  if (!fs.existsSync(TEMP_FILE_NAME)) {
    await downloadFile()
  }

  const allSet = await readAllSetData()

  const createSetResult = await prisma.set.createMany({
    data: allSet,
    skipDuplicates: true
  })

  console.log(`set insert done. count:${createSetResult.count}`)

  const allCard = await readAllCardData()

  console.log("card insert start")

  const cardCreateResult = await prisma.card.createMany({
    data: allCard
      .map(card => {
        const localizedData = card.foreignData.filter(data => data.language === "Japanese").pop()

        return {
          uuid: card.uuid,
          colorIdentities: card.colorIdentity,
          cardTypeJa: localizedData?.type || "",
          isLegendary: card.types.includes("legendary"),
          loyalty: card.loyalty,
          manaCost: card.manaCost,
          manaValue: card.manaValue,
          name: localizedData?.name || card.name,
          power: card.power,
          toughness: card.toughness,
          subTypes: card.subtypes,
          superTypes: card.supertypes,
          types: card.types,
          flavorText: localizedData?.text,
          text: localizedData?.text || card.text,
          scryfallId: card.identifiers.scryfallId,
          rarity: card.rarity,
          otherFaceId: card.otherFaceId,
          setCode: card.setCode
        }
      }),
      skipDuplicates: true
  })

  console.log(`card insert done. count:${cardCreateResult.count}`)
}

const downloadFile = async () => {
  console.log("download file from:" + process.env.JSON_URL)
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
      .pipe(JSONStream.parse("data.*.cards.*"))
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
      .pipe(JSONStream.parse("data.*"))
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

main().finally(() => {
  if (process.env.KEEP_JSON_FILE !== "yes") {
    fs.unlinkSync(TEMP_FILE_NAME)
  }
})
