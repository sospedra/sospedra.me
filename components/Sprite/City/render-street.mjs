import { fileURLToPath } from 'node:url'
import sharp from 'sharp'

const source = fileURLToPath(
  new URL('../../../public/images/street.svg', import.meta.url),
)

const variants = [
  ['../../../public/images/street-home.webp', 72],
  ['../../../public/images/street-home@2x.webp', 144],
]

await Promise.all(
  variants.map(([output, density]) =>
    sharp(source, { density })
      .webp({ effort: 6, lossless: true })
      .toFile(fileURLToPath(new URL(output, import.meta.url))),
  ),
)
