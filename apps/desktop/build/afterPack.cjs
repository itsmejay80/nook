const { execFileSync } = require('node:child_process');
const path = require('node:path');

exports.default = async function afterPack({ appOutDir, packager, electronPlatformName }) {
  if (electronPlatformName !== 'darwin') return;
  const appName = packager.appInfo.productFilename;
  const appPath = path.join(appOutDir, `${appName}.app`);
  execFileSync('codesign', ['--force', '--deep', '--sign', '-', appPath], { stdio: 'inherit' });
};
