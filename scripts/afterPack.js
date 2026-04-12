const { execSync } = require('child_process')
const path = require('path')

exports.default = async function afterPack({ appOutDir, electronPlatformName }) {
  if (electronPlatformName !== 'linux') return

  const sandboxPath = path.join(appOutDir, 'chrome-sandbox')

  try {
    execSync(`sudo chown root:root "${sandboxPath}"`)
    execSync(`sudo chmod 4755 "${sandboxPath}"`)
    console.log('✓ chrome-sandbox permissions set (setuid root)')
  } catch (e) {
    console.warn('⚠ Could not set chrome-sandbox permissions (sudo required):')
    console.warn(`  sudo chown root:root "${sandboxPath}"`)
    console.warn(`  sudo chmod 4755 "${sandboxPath}"`)
  }
}
