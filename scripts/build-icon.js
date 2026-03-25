const sharp = require('sharp')
const fs = require('fs')
const path = require('path')

const SVG_PATH = path.join(__dirname, '../build/icon.svg')
const BUILD_DIR = path.join(__dirname, '../build')

const ICO_SIZES = [16, 32, 48, 64, 128, 256]

async function buildIcon() {
  console.log('Building Banette icons...')

  const { default: pngToIco } = await import('png-to-ico')
  const svgBuffer = fs.readFileSync(SVG_PATH)

  // Generate PNG at max size for general use
  await sharp(svgBuffer)
    .resize(512, 512)
    .png()
    .toFile(path.join(BUILD_DIR, 'icon.png'))
  console.log('  icon.png (512x512) ✓')

  // Generate each PNG size for ICO
  const pngBuffers = []
  for (const size of ICO_SIZES) {
    const buf = await sharp(svgBuffer)
      .resize(size, size)
      .png()
      .toBuffer()
    pngBuffers.push(buf)
    console.log(`  ${size}x${size} ✓`)
  }

  // Build ICO
  const icoBuffer = await pngToIco(pngBuffers)
  fs.writeFileSync(path.join(BUILD_DIR, 'icon.ico'), icoBuffer)
  console.log('  icon.ico ✓')

  console.log('Done.')
}

buildIcon().catch((err) => {
  console.error(err)
  process.exit(1)
})
