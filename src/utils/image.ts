import sharp from "sharp"

const ratio = 488 / 680
const SIZE = {
  LG: {
    h: 680,
    w: 488
  },
  MD: {
    h: 300,
    w: Math.floor(300 * ratio)
  },
  SM: {
    h: 209,
    w: 150
  }
} as const

export const resizeToSm = (input: Buffer) => {
  return sharp(input)
    .resize(SIZE.SM.w, SIZE.SM.h)
    .webp()
    .toBuffer()
}
export const resizeToMd = (input: Buffer) => {
  return sharp(input)
    .resize(SIZE.MD.w, SIZE.MD.h)
    .webp()
    .toBuffer()
}
export const resizeToLg = (input: Buffer) => {
  return sharp(input)
    .resize(SIZE.LG.w, SIZE.LG.h)
    .webp()
    .toBuffer()
}