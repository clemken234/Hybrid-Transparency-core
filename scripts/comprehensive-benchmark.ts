/**
 * Hybrid Transparency — ZK Pipeline Comprehensive Benchmark
 * ──────────────────────────────────────────────────────────
 * Profiles the three-phase Zero-Knowledge lifecycle (witness generation,
 * UltraHonk proof generation, off-chain verification) across the full
 * mock citizen dataset. Outputs thesis-ready statistical metrics.
 *
 * Prerequisites (one-time, from repo root):
 *   cd web-citizen && npm install --save-dev tsx
 *
 * Run (from repo root):
 *   cd web-citizen && npx tsx ../scripts/comprehensive-benchmark.ts
 */

import { performance } from 'perf_hooks';
import process from 'process';
import { Noir } from '@noir-lang/noir_js';
import { Barretenberg, UltraHonkBackend } from '@aztec/bb.js';

// ── Existing codebase imports ─────────────────────────────────────────────────
import mockCitizens from '../web-citizen/src/lib/mockData';
import {
  stringToFieldHex,
  fieldHexToBytes,
  computePrivateLicenseData,
  createFinalMerkleLeaf,
} from '../web-citizen/src/lib/commitment';
import circuit from '../web-citizen/src/utils/hybrid_transparency.json';
// ─────────────────────────────────────────────────────────────────────────────

const TREE_DEPTH = 20;
const ZERO_LEAF  = '0x' + '00'.repeat(32);

// ---------------------------------------------------------------------------
// Sparse Poseidon2 Merkle Tree
// ---------------------------------------------------------------------------
// hashPair is intentionally private in commitment.ts (not exported), so we
// call bb.poseidon2Hash directly here using the exported fieldHexToBytes helper.

async function poseidonPair(
  bb: any,
  left: string,
  right: string,
): Promise<string> {
  const { hash } = await bb.poseidon2Hash({
    inputs: [fieldHexToBytes(left), fieldHexToBytes(right)],
  });
  return (
    '0x' +
    Array.from(hash as Uint8Array)
      .map((b: number) => b.toString(16).padStart(2, '0'))
      .join('')
  );
}

/** Precompute the zero-hash for every tree level (bottom → root). */
async function buildZeroHashes(bb: any): Promise<string[]> {
  const zeros: string[] = [ZERO_LEAF];
  for (let i = 1; i <= TREE_DEPTH; i++) {
    zeros.push(await poseidonPair(bb, zeros[i - 1], zeros[i - 1]));
  }
  return zeros;
}

interface TreeData {
  root:  string;
  paths: string[][];   // paths[i] = TREE_DEPTH sibling hashes for leaf i
}

/**
 * Build a sparse Poseidon2 Merkle tree over the provided leaves.
 * Only nodes on the paths from real leaves to the root are computed;
 * all others default to the precomputed zero-hash for their level.
 */
async function buildSparseMerkleTree(
  bb: any,
  leaves: string[],
  zeros: string[],
): Promise<TreeData> {
  // layers[level] maps node-index → hash at that level (bottom = 0)
  const layers: Map<number, string>[] = [new Map()];
  for (let i = 0; i < leaves.length; i++) layers[0].set(i, leaves[i]);

  for (let level = 1; level <= TREE_DEPTH; level++) {
    const prev    = layers[level - 1];
    const curr    = new Map<number, string>();
    const parents = new Set<number>();
    for (const idx of prev.keys()) parents.add(idx >> 1);
    for (const p of parents) {
      const left  = prev.get(p * 2)     ?? zeros[level - 1];
      const right = prev.get(p * 2 + 1) ?? zeros[level - 1];
      curr.set(p, await poseidonPair(bb, left, right));
    }
    layers.push(curr);
  }

  const root = layers[TREE_DEPTH].get(0) ?? zeros[TREE_DEPTH];

  // Extract the sibling-path for each leaf
  const paths: string[][] = [];
  for (let leafIdx = 0; leafIdx < leaves.length; leafIdx++) {
    const path: string[] = [];
    let idx = leafIdx;
    for (let level = 0; level < TREE_DEPTH; level++) {
      const siblingIdx = idx % 2 === 0 ? idx + 1 : idx - 1;
      path.push(layers[level].get(siblingIdx) ?? zeros[level]);
      idx = idx >> 1;
    }
    paths.push(path);
  }

  return { root, paths };
}

// ---------------------------------------------------------------------------
// Benchmark helpers
// ---------------------------------------------------------------------------

/** Deterministic field-element secret derived from licenseID (no localStorage in Node). */
function citizenSecret(licenseID: string): string {
  return stringToFieldHex(licenseID);
}

interface PhaseTimings {
  witnessMs: number;
  proofMs:   number;
  verifyMs:  number;
}

function stats(arr: number[]): { Min: string; Max: string; Average: string } {
  const sum = arr.reduce((a, b) => a + b, 0);
  return {
    Min:     (Math.min(...arr)       / 1000).toFixed(3) + 's',
    Max:     (Math.max(...arr)       / 1000).toFixed(3) + 's',
    Average: (sum / arr.length / 1000).toFixed(3) + 's',
  };
}

// ---------------------------------------------------------------------------
// Main benchmark loop
// ---------------------------------------------------------------------------

async function main(): Promise<void> {
  console.log('\n╔═══════════════════════════════════════════════════════════════════╗');
  console.log('║    HYBRID TRANSPARENCY — ZK PIPELINE COMPREHENSIVE BENCHMARK      ║');
  console.log('╚═══════════════════════════════════════════════════════════════════╝\n');

  // ── One-time WASM boot ────────────────────────────────────────────────────
  console.log('⚙️  Booting Barretenberg WASM engine...');
  let bb: any = null;
  bb = await Barretenberg.new();

  // ── Pre-computation phase (not benchmarked — setup cost only) ─────────────
  console.log('⚙️  Precomputing Poseidon2 zero-hash chain (depth = 20)...');
  const zeros = await buildZeroHashes(bb);

  console.log('⚙️  Computing Poseidon2 identity leaves for all citizens...');
  const secrets:              string[] = [];
  const privateLicenseHashes: string[] = [];
  const leaves:               string[] = [];

  for (const citizen of mockCitizens) {
    const { subject, ltoSignature } = citizen;
    const secret = citizenSecret(subject.licenseID);
    const pld    = await computePrivateLicenseData(
      bb,
      subject.licenseID,   subject.firstName, subject.lastName,  subject.dateOfBirth,
      subject.licenseType, subject.expirationDate, subject.restrictions,
      subject.conditions,  subject.bloodType, subject.address,   ltoSignature,
    );
    // createFinalMerkleLeaf hashes: poseidon(poseidon(secret, pld), stringToFieldHex(firstName))
    const leaf = await createFinalMerkleLeaf(bb, secret, pld, subject.firstName);
    secrets.push(secret);
    privateLicenseHashes.push(pld);
    leaves.push(leaf);
  }

  console.log(
    `⚙️  Building sparse Poseidon2 Merkle tree` +
    ` (${mockCitizens.length} leaves, depth = ${TREE_DEPTH})...`,
  );
  const { root: merkleRoot, paths: merklePaths } = await buildSparseMerkleTree(bb, leaves, zeros);
  console.log(`    → Root: ${merkleRoot.slice(0, 18)}…${merkleRoot.slice(-6)}\n`);

  // ── Per-citizen ZK lifecycle loop ─────────────────────────────────────────
  const results: PhaseTimings[] = [];
  const total = mockCitizens.length;

  for (let i = 0; i < total; i++) {
    const citizen = mockCitizens[i];
    const label   = `${citizen.subject.firstName} ${citizen.subject.lastName}` +
                    ` (${citizen.subject.licenseID})`;
    console.log(`⚡ Processing Batch Item ${i + 1}/${total} — ${label}`);

    try {
      // Instantiate fresh Noir and backend per identity to isolate state
      const noir    = new Noir(circuit as any);
      const backend = new UltraHonkBackend((circuit as any).bytecode as string, bb);

      // Circuit inputs — public_name must match the stringToFieldHex encoding
      // used internally by createFinalMerkleLeaf when building the leaf hash.
      const inputs = {
        secret:               secrets[i],
        private_license_data: privateLicenseHashes[i],
        merkle_path:          merklePaths[i],           // exactly TREE_DEPTH elements
        leaf_index:           i.toString(),
        public_name:          stringToFieldHex(citizen.subject.firstName),
        public_merkle_root:   merkleRoot,
      };

      // ── PHASE A: Witness Generation (constraint solving) ──────────────────
      const t0 = performance.now();
      const { witness } = await noir.execute(inputs);
      const witnessMs   = performance.now() - t0;
      console.log(`   [A] Witness generation : ${(witnessMs / 1000).toFixed(3)} s`);

      // ── PHASE B: UltraHonk Proof Generation (cryptographic commitment) ────
      const t1 = performance.now();
      const proofData   = await backend.generateProof(witness);
      const proofMs     = performance.now() - t1;
      console.log(`   [B] Proof generation   : ${(proofMs   / 1000).toFixed(3)} s`);

      // ── PHASE C: Off-Chain Verification ───────────────────────────────────
      const t2 = performance.now();
      const valid    = await backend.verifyProof(proofData);
      const verifyMs = performance.now() - t2;
      console.log(`   [C] Verification       : ${(verifyMs  / 1000).toFixed(3)} s  [valid = ${valid}]\n`);

      results.push({ witnessMs, proofMs, verifyMs });

    } catch (err: any) {
      console.error(
        `   ❌ FAILED for ${citizen.subject.licenseID}: ${err?.message ?? String(err)}\n`,
      );
      continue;
    }
  }

  // ── Thesis metrics summary ─────────────────────────────────────────────────
  if (results.length === 0) {
    console.error('❌ No successful transactions to compile statistics from.');
    process.exit(1);
  }

  const wArr = results.map(r => r.witnessMs);
  const pArr = results.map(r => r.proofMs);
  const vArr = results.map(r => r.verifyMs);
  const tArr = results.map(r => r.witnessMs + r.proofMs + r.verifyMs);
  const meanTotal = (tArr.reduce((a, b) => a + b, 0) / tArr.length / 1000).toFixed(3) + 's';

  console.log('\n╔═══════════════════════════════════════════════════════════════════╗');
  console.log('║              BENCHMARK RESULTS  —  THESIS METRICS                ║');
  console.log('╚═══════════════════════════════════════════════════════════════════╝\n');

  console.table({
    'Transactions Processed':        {
      Min: '—', Max: '—', Average: '—',
      'Value / Note': `${results.length} / ${total} succeeded`,
    },
    'Phase A — Witness Generation':  { ...stats(wArr), 'Value / Note': 'constraint solving'       },
    'Phase B — Proof Generation':    { ...stats(pArr), 'Value / Note': 'UltraHonk SNARK commit'   },
    'Phase C — Proof Verification':  { ...stats(vArr), 'Value / Note': 'off-chain boolean result' },
    'Mean Total System Latency':     {
      Min: '—', Max: '—', Average: meanTotal,
      'Value / Note': 'per identity (A + B + C)',
    },
  });

  console.log('\n✅ Benchmark complete.\n');
}

main().catch((err) => {
  console.error('\n💀 Fatal benchmark error:', err);
  process.exit(1);
});
