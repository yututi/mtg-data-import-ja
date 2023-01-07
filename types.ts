export type Set = {
  name: string
  code: string
}

export type Card = {
  uuid: string
  asciiName: string
  name: string
  manaCost: string
  colorIdentity: string[]
  manaValue: number
  faceName: string
  foreignData: ForeignData[]
  hasAlternativeDeckLimit: boolean
  legalities: any
  loyalty: string
  power: string
  toughness: string
  printings: string[]
  supertypes: string[]
  subtypes: string[]
  types: string[]
  text: string
  rarity: string
  otherFaceId: string
  identifiers: { [key: string]: string }
  setCode: string
}

export type ForeignData = {
  language: string
  name: string
  text: string
  type: string
}