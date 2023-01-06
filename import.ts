import { PrismaClient } from '@prisma/client'
import request from "request";
import JSONStream from "JSONStream"
import es from "event-stream"
import { Card, ForeignData } from "./types"
import fs from "fs"
require('dotenv').config();


const prisma = new PrismaClient()

async function main() {

  await prisma.card.deleteMany({})

  const allCard: Card[] = []

  // fs.createReadStream('PioneerAtomic.json')
  request({ url: process.env.JSON_URL || "" })
    .pipe(JSONStream.parse('data.*'))
    .pipe(es.mapSync((cards: Card[]) => {

      allCard.push(...cards)

      return cards
    }))
    .on("end", async () => {
      console.log(`batch insert ${allCard.length}`)

      await prisma.card.createMany({
        data: allCard
          .filter(card => card.foreignData.filter(data => data.language === "Japanese").length > 0)
          .map(card => {
            const localizedData = card.foreignData.filter(data => data.language === "Japanese").pop()!

            return {
              colorIdentities: card.colorIdentity,
              cardTypeJa: localizedData.type || "",
              isLegendary: card.types.includes("legendary"),
              loyalty: card.loyalty,
              manaCost: card.manaCost,
              manaValue: card.manaValue,
              name: localizedData.name,
              power: card.power,
              toughness: card.toughness,
              subTypes: card.subtypes,
              superTypes: card.supertypes,
              types: card.types,
              flavorText: localizedData.text,
              text: localizedData.text
            }
          })
      })
    })
}
main()
