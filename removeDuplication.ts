import { PrismaClient, Prisma } from '@prisma/client'
import pino from "pino"
require('dotenv').config()

const prisma = new PrismaClient()

// 翻訳されていないカードと同じセットコードとコレクター番号をもつ他のカードがある場合、
// 翻訳されていないカードを削除する。
// 絵違いカードを削除する。
async function main() {
  await removeUntranslatedCard()
  await removeDuplicatedJaCard()
}

const removeUntranslatedCard = async () => {

  const untranslatedCards = await prisma.card.findMany({
    where: {
      cardTypeJa: {
        equals: ""
      }
    }
  })

  for (const card of untranslatedCards) {

    const translated = await prisma.card.findFirst({
      where: {
        AND: [
          {
            setCode: {
              equals: card.setCode,
            }
          },
          {
            number: {
              equals: card.number
            }
          },
          {
            uuid: {
              not: {
                equals: card.uuid
              }
            }
          }
        ]
      }
    })
    if (translated) {
      await prisma.card.delete({
        where: {
          uuid: card.uuid
        }
      })
    }
  }
}

const removeDuplicatedJaCard = async () => {

  const result = await prisma.$queryRaw<{ name: string }[]>(
    Prisma.sql`select "name" from "Card" where "otherFaceUuid" is null group by "name" having count("name") > 1`
  )

  for (const { name } of result) {

    const cardsHasSameName = await prisma.card.findMany({
      where: {
        name
      }
    })

    // コレクター番号順に並べて先頭のもの以外を削除
    const deleteTargets = cardsHasSameName.sort((a, b) => a.number.localeCompare(b.number))
    deleteTargets.shift()

    await prisma.card.deleteMany({
      where: {
        uuid: {
          in: deleteTargets.map(card => card.uuid)
        }
      }
    })
  }
}

main()