const path = require('node:path');
const { execSync } = require('node:child_process');

exports.default = async function (context) {
  if (context.electronPlatformName === 'darwin') {
    const appPath = path.join(
      context.appOutDir,
      `${context.packager.appInfo.productFilename}.app`
    );
    console.log(`Applying ad-hoc code signature to ${appPath}...`);
    execSync(`codesign --force --deep --sign - "${appPath}"`, {
      stdio: 'inherit',
    });
  }
};
