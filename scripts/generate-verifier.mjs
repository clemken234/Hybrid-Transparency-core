/**
 * Generates HonkVerifier.sol from the compiled circuit artifact.
 * Uses native bb@0.58.0 binary via WSL (Windows) or direct path (Linux/Mac).
 * Run from repo root: node scripts/generate-verifier.mjs
 *
 * Requires:
 *   - WSL Ubuntu with ~/bb-bin/bb (version 0.58.0) installed, OR
 *   - bb binary on PATH (Linux/Mac)
 *
 * Install bb in WSL:
 *   curl -L https://github.com/AztecProtocol/aztec-packages/releases/download/aztec-packages-v0.58.0/barretenberg-x86_64-linux-gnu.tar.gz | tar -xz -C ~/bb-bin/
 *   sudo apt-get install -y libc++1-18 libc++abi1-18 jq
 */
import { execFileSync, execSync, spawnSync } from 'child_process';
import { mkdirSync, existsSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import { homedir, platform } from 'os';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '..');

const circuitPath = resolve(ROOT, 'circuits/target/hybrid_transparency.json');
const vkPath = resolve(ROOT, 'circuits/target/vk');
const outPath = resolve(ROOT, 'contracts/contracts/HonkVerifier.sol');
mkdirSync(resolve(ROOT, 'contracts/contracts'), { recursive: true });

const isWindows = platform() === 'win32';

function toWslPath(winPath) {
  // C:\foo\bar → /mnt/c/foo/bar
  return winPath.replace(/\\/g, '/').replace(/^([A-Za-z]):/, (_, d) => `/mnt/${d.toLowerCase()}`);
}

function run(cmd, args) {
  console.log(`> ${cmd} ${args.join(' ')}`);
  execFileSync(cmd, args, { stdio: 'inherit' });
}

if (isWindows) {
  // Use WSL to invoke native bb binary
  const wslCircuit = toWslPath(circuitPath);
  const wslVk = toWslPath(vkPath);
  const wslOut = toWslPath(outPath);
  const wslCrs = `~/.bb-crs`;

  const script = [
    `mkdir -p ${wslCrs}`,
    `echo "Step 1: write_vk_ultra_honk..."`,
    `~/bb-bin/bb write_vk_ultra_honk -b "${wslCircuit}" -o "${wslVk}" -c ${wslCrs}`,
    `echo "VK size: $(wc -c < '${wslVk}') bytes"`,
    `echo "Step 2: contract_ultra_honk..."`,
    `~/bb-bin/bb contract_ultra_honk -k "${wslVk}" -o "${wslOut}"`,
  ].join(' && ');

  console.log('Running bb via WSL...');
  const result = spawnSync('wsl', ['-d', 'Ubuntu', '-e', 'bash', '-c', script], { stdio: 'inherit', shell: false });
  if (result.status !== 0) {
    process.exit(result.status ?? 1);
  }
} else {
  // Linux/Mac: use bb directly
  const crsPath = resolve(homedir(), '.bb-crs');
  mkdirSync(crsPath, { recursive: true });

  const bb = execSync('which bb', { encoding: 'utf8' }).trim() || 'bb';

  console.log('Step 1: write_vk_ultra_honk...');
  run(bb, ['write_vk_ultra_honk', '-b', circuitPath, '-o', vkPath, '-c', crsPath]);

  console.log('Step 2: contract_ultra_honk...');
  run(bb, ['contract_ultra_honk', '-k', vkPath, '-o', outPath]);
}

if (!existsSync(outPath)) {
  console.error('ERROR: HonkVerifier.sol was not created');
  process.exit(1);
}

console.log(`\n✅ HonkVerifier.sol → ${outPath}`);
console.log('Next: deploy HonkVerifier.sol, then call LTORegistry.setVerifier(address).');
