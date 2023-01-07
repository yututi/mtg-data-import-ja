import { PrismaClient } from '@prisma/client'
import request from "request";
import JSONStream from "JSONStream"
import es from "event-stream"
import { Card, ForeignData } from "./types"
import fs from "fs"
require('dotenv').config();


const prisma = new PrismaClient()

async function main() {

  prisma.$transaction(async (tx) => {

    await tx.card.deleteMany({})

    const allCard: Card[] = []
  
    fs.createReadStream('Pioneer.json')
    // request({ url: process.env.JSON_URL || "" })
      .pipe(JSONStream.parse('data.*.cards.*'))
      .pipe(es.mapSync((card: Card) => {
  
        allCard.push(card)
  
        return card
      }))
      .on("end", async () => {
  
        await tx.card.createMany({
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
                otherFaceId: card.otherFaceId
              }
            })
        })
      })
  })

}
main()
