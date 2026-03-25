const sharp = require('sharp')
const fs = require('fs')
const path = require('path')
const { execSync } = require('child_process')
const os = require('os')

const SVG_PATH = path.join(__dirname, '../build/icon.svg')
const BUILD_DIR = path.join(__dirname, '../build')

// Sizes required for a proper .ico (Windows)
const ICO_SIZES = [16, 24, 32, 48, 64, 128, 256]

// Sizes required for .icns (macOS iconset spec)
const ICNS_SIZES = [
  { size: 16,   name: 'icon_16x16.png' },
  { size: 32,   name: 'icon_16x16@2x.png' },
  { size: 32,   name: 'icon_32x32.png' },
  { size: 64,   name: 'icon_32x32@2x.png' },
  { size: 128,  name: 'icon_128x128.png' },
  { size: 256,  name: 'icon_128x128@2x.png' },
  { size: 256,  name: 'icon_256x256.png' },
  { size: 512,  name: 'icon_256x256@2x.png' },
  { size: 512,  name: 'icon_512x512.png' },
  { size: 1024, name: 'icon_512x512@2x.png' },
]

async function buildIcon() {
  console.log('Building Banette icons...')

  const { default: pngToIco } = await import('png-to-ico')
  const svgBuffer = fs.readFileSync(SVG_PATH)

  // --- icon.png (512x512, Linux + electron-builder fallback) ---
  await sharp(svgBuffer).resize(512, 512).png().toFile(path.join(BUILD_DIR, 'icon.png'))
  console.log('  icon.png (512x512) ✓')

  // --- icon.ico (Windows) ---
  const icoBuffers = []
  for (const size of ICO_SIZES) {
    const buf = await sharp(svgBuffer).resize(size, size).png().toBuffer()
    icoBuffers.push(buf)
    console.log(`  ico ${size}x${size} ✓`)
  }
  const icoBuffer = await pngToIco(icoBuffers)
  fs.writeFileSync(path.join(BUILD_DIR, 'icon.ico'), icoBuffer)
  console.log('  icon.ico ✓')

  // --- icon.icns (macOS) ---
  if (os.platform() === 'darwin') {
    const iconsetDir = path.join(BUILD_DIR, 'icon.iconset')
    if (!fs.existsSync(iconsetDir)) fs.mkdirSync(iconsetDir)

    for (const { size, name } of ICNS_SIZES) {
      await sharp(svgBuffer).resize(size, size).png().toFile(path.join(iconsetDir, name))
      console.log(`  icns ${name} ✓`)
    }

    execSync(`iconutil -c icns "${iconsetDir}" -o "${path.join(BUILD_DIR, 'icon.icns')}"`)
    fs.rmSync(iconsetDir, { recursive: true })
    console.log('  icon.icns ✓')
  } else {
    console.log('  icon.icns skipped (macOS only)')
  }

  console.log('\nDone.')
}

buildIcon().catch((err) => {
  console.error(err)
  process.exit(1)
})
