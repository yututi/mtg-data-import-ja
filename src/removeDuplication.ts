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

  await prisma.card.deleteMany({
    where: {
      uuid: {
        in: untranslatedCards.map(card => card.uuid)
      }
    }
  })

  // for (const card of untranslatedCards) {

  //   const translated = await prisma.card.findFirst({
  //     where: {
  //       AND: [
  //         {
  //           setCode: card.setCode
  //         },
  //         {
  //           number: card.number
  //         },
  //         {
  //           uuid: {
  //             not: card.uuid
  //           }
  //         },
  //         {
  //           isMainSpell: card.isMainSpell
  //         },
  //         {
  //           cardTypeJa: {
  //             not: ""
  //           }
  //         }
  //       ]
  //     }
  //   })
  //   if (translated) {
  //     await prisma.card.delete({
  //       where: {
  //         uuid: card.uuid
  //       }
  //     })
  //   }
  // }
}

const removeDuplicatedJaCard = async () => {

  const duplicatedCards = await prisma.$queryRaw<{ name: string }[]>(
    Prisma.sql`select "name" from "Card" group by "name", "setCode", "text" having count("name") > 1 and count("text") > 1`
  )

  const duplicatedCardNames = duplicatedCards.map(c => c.name)

  for (const name of duplicatedCardNames) {

    const cardsHasSameName = await prisma.card.findMany({
      select: {
        uuid: true,
        name: true,
        number: true,
        setCode: true,
        otherFaceUuid: true
      },
      where: {
        name
      }
    })

    const setCodes = new Set(cardsHasSameName.map(card => card.setCode));

    const deleteTargets = [...setCodes].flatMap(setCode => {
      const cardsHasSameSetCode = cardsHasSameName.filter(card => card.setCode === setCode)
      if (cardsHasSameSetCode.length <= 1) return [];
      cardsHasSameSetCode.shift()
      return cardsHasSameSetCode
    })

    await prisma.card.deleteMany({
      where: {
        uuid: {
          in: [...deleteTargets.map(card => card.uuid), ...deleteTargets.filter(card => card.otherFaceUuid).map(card => card.otherFaceUuid as string)]
        }
      }
    })
  }
}

main()