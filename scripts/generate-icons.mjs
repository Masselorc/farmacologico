// Gera os ícones PNG mínimos da PWA (192 e 512) sem dependências externas.
// Execução única de setup: `npm run generate-icons`.
import { mkdirSync, writeFileSync } from 'node:fs'
import { deflateSync } from 'node:zlib'

const CRC_TABLE = (() => {
  const table = new Int32Array(256)
  for (let n = 0; n < 256; n++) {
    let c = n
    for (let k = 0; k < 8; k++) {
      c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1
    }
    table[n] = c
  }
  return table
})()

function crc32(buffer) {
  let crc = -1
  for (let i = 0; i < buffer.length; i++) {
    crc = CRC_TABLE[(crc ^ buffer[i]) & 0xff] ^ (crc >>> 8)
  }
  return (crc ^ -1) >>> 0
}

function chunk(type, data) {
  const length = Buffer.alloc(4)
  length.writeUInt32BE(data.length)
  const typeAndData = Buffer.concat([Buffer.from(type, 'ascii'), data])
  const crc = Buffer.alloc(4)
  crc.writeUInt32BE(crc32(typeAndData))
  return Buffer.concat([length, typeAndData, crc])
}

function encodePng(size, pixels) {
  const signature = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])
  const ihdr = Buffer.alloc(13)
  ihdr.writeUInt32BE(size, 0)
  ihdr.writeUInt32BE(size, 4)
  ihdr[8] = 8 // bit depth
  ihdr[9] = 6 // color type RGBA
  const raw = Buffer.alloc(size * (size * 4 + 1))
  for (let y = 0; y < size; y++) {
    raw[y * (size * 4 + 1)] = 0 // filter none
    pixels.copy(
      raw,
      y * (size * 4 + 1) + 1,
      y * size * 4,
      (y + 1) * size * 4,
    )
  }
  const idat = deflateSync(raw, { level: 9 })
  return Buffer.concat([
    signature,
    chunk('IHDR', ihdr),
    chunk('IDAT', idat),
    chunk('IEND', Buffer.alloc(0)),
  ])
}

function drawIcon(size) {
  const pixels = Buffer.alloc(size * size * 4)
  const bg = [15, 118, 110, 255] // #0f766e
  const fg = [230, 250, 246, 255]
  const radius = size * 0.22
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const idx = (y * size + x) * 4
      // cantos arredondados
      const cx = Math.min(x, size - 1 - x)
      const cy = Math.min(y, size - 1 - y)
      const outsideCorner =
        cx < radius && cy < radius &&
        (radius - cx) ** 2 + (radius - cy) ** 2 > radius ** 2
      if (outsideCorner) {
        pixels[idx + 3] = 0
        continue
      }
      const inBar =
        x >= size * 0.25 && x <= size * 0.75 &&
        y >= size * 0.46 && y <= size * 0.54
      const color = inBar ? fg : bg
      pixels[idx] = color[0]
      pixels[idx + 1] = color[1]
      pixels[idx + 2] = color[2]
      pixels[idx + 3] = color[3]
    }
  }
  return pixels
}

const outDir = new URL('../public/icons/', import.meta.url)
mkdirSync(outDir, { recursive: true })

for (const size of [192, 512]) {
  const png = encodePng(size, drawIcon(size))
  writeFileSync(new URL(`pwa-${size}x${size}.png`, outDir), png)
  console.log(`ícone gerado: public/icons/pwa-${size}x${size}.png (${png.length} bytes)`)
}
