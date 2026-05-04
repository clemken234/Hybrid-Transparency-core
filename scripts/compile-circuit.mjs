/**
 * Recompile Noir circuit using noir_wasm@0.36.0.
 * Works on Windows by using a virtual in-memory FileManager.
 *
 * Run: node scripts/compile-circuit.mjs
 */
import { readFileSync, writeFileSync, readdirSync, mkdirSync } from 'fs';
import { resolve, dirname, join } from 'path';
import { fileURLToPath } from 'url';

const __dir = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dir, '..');
const circuitsDir = resolve(ROOT, 'circuits');

const noirWasmPath = resolve(ROOT, 'web-citizen/node_modules/@noir-lang/noir_wasm/dist/node/main.js');
const noirWasmUrl = new URL('file:///' + noirWasmPath.replace(/\\/g, '/'));

console.log('Loading noir_wasm@0.36.0...');
const { compile_program, createFileManager } = await import(noirWasmUrl);
// Extract FileManager class from a dummy instance (not re-exported at top level)
const FileManager = createFileManager('/').constructor;

// Build a virtual FS that stores files in memory using POSIX paths.
// noir_wasm panics on Windows absolute paths — bypass by using relative root '/'.
const vfs = new Map();

function normKey(p) {
  return p.replace(/\\/g, '/').replace(/\/+/g, '/');
}

// Stage Nargo.toml + all .nr source files into memory
function stageDir(baseDir, relPrefix) {
  for (const entry of readdirSync(join(baseDir, relPrefix), { withFileTypes: true })) {
    const rel = join(relPrefix, entry.name);
    if (entry.isDirectory()) stageDir(baseDir, rel);
    else if (entry.name.endsWith('.nr')) {
      const content = readFileSync(join(baseDir, rel));
      const fwdKey = normKey(rel); // e.g. 'src/main.nr'
      const base = entry.name;       // e.g. 'main.nr'
      vfs.set(fwdKey, content);         // 'src/main.nr'
      vfs.set('/' + fwdKey, content);   // '/src/main.nr'
      vfs.set(base, content);           // 'main.nr'
      vfs.set('/' + base, content);     // '/main.nr'
    }
  }
}

const nargoToml = readFileSync(join(circuitsDir, 'Nargo.toml'));
vfs.set('Nargo.toml', nargoToml);
vfs.set('/Nargo.toml', nargoToml);
stageDir(circuitsDir, 'src');

console.log('Staged files:', [...vfs.keys()]);

// Create a virtual filesystem adapter using the in-memory map.
// On Windows, path.join('/', 'src/main.nr') = '\\src\\main.nr' (absolute).
// The wasm compiler calls fm.writeFile with those absolute-looking paths,
// which the FileManager rejects. We build a patched FM subclass that
// strips any leading backslash/slash before the isAbsolute check.
const virtualFs = {
  existsSync: (p) => {
    const key = normKey(p);
    return vfs.has(key) || vfs.has(key.replace(/^[/\\]+/, ''));
  },
  readFile: async (p, enc) => {
    const key = normKey(p);
    const data = vfs.get(key) ?? vfs.get(key.replace(/^[/\\]+/, ''));
    if (!data) throw new Error(`VFS: not found: ${key}\nKeys: ${[...vfs.keys()].join(', ')}`);
    if (enc) return Buffer.from(data).toString(enc);
    return Buffer.from(data);
  },
  writeFile: async (p, data) => { vfs.set(normKey(p), data); },
  mkdir: async () => {},
  rename: async (from, to) => {
    const key = normKey(from);
    const data = vfs.get(key);
    if (data) { vfs.set(normKey(to), data); vfs.delete(key); }
  },
  readdir: async (p, opts) => {
    // p = '/src' or '\src'. Normalize → 'src'
    const dirKey = normKey(p).replace(/^[/\\]+/, '');
    const entries = [];
    const seen = new Set();
    for (const k of vfs.keys()) {
      if (k.startsWith('/')) continue; // skip slash-prefixed duplicates
      if (k.startsWith(dirKey + '/')) {
        const rest = k.slice(dirKey.length + 1);
        if (rest && !rest.includes('/') && !seen.has(rest)) {
          seen.add(rest);
          // Return full POSIX path so getSources uses it as sourceFile.path
          entries.push('/' + k);
        }
      }
    }
    return entries;
  },
};

const fm = new FileManager(virtualFs, '/');

// Patch writeFile to strip Windows absolute-looking leading slashes/backslashes
// before the internal isAbsolute check fires.
const _origWrite = fm.writeFile.bind(fm);
fm.writeFile = async (name, stream) => {
  // Strip leading separator(s) that Windows path.join produces for '/' root
  const cleaned = name.replace(/^[/\\]+/, '');
  return _origWrite(cleaned, stream);
};

function toStream(buf) {
  return new ReadableStream({
    start(ctrl) { ctrl.enqueue(new Uint8Array(buf)); ctrl.close(); }
  });
}

for (const [key, data] of vfs.entries()) {
  await fm.writeFile(key, toStream(data));
}

console.log('Compiling circuit...');
const compiled = await compile_program(fm);

const outDir = resolve(ROOT, 'circuits/target');
mkdirSync(outDir, { recursive: true });
const circuitJson = JSON.stringify(compiled.program, null, 2);
writeFileSync(join(outDir, 'hybrid_transparency.json'), circuitJson);
writeFileSync(resolve(ROOT, 'web-citizen/src/utils/hybrid_transparency.json'), circuitJson);

console.log(`✅ Compiled (Noir ${compiled.program.noir_version})`);
console.log(`   → circuits/target/hybrid_transparency.json`);
console.log(`   → web-citizen/src/utils/hybrid_transparency.json`);
