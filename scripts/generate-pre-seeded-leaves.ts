/**
 * Hybrid Transparency — Pre-Seeded Leaf Generator
 * ─────────────────────────────────────────────────
 * Computes finalized Poseidon2 Merkle leaf hashes for every mock citizen in
 * the dataset using the exact same two-step arithmetization as the production
 * register flow (register/page.tsx) and Noir circuit — without running any
 * UltraHonk proving cycle.
 *
 * Outputs:
 *   Format A — JSON array  : bulk-ingestible leaf array for the admin backend.
 *   Format B — Markdown    : human-readable index → name → leaf mapping.
 *   File     — scripts/pre-seeded-leaves.json
 *
 * Prerequisites (one-time, from repo root):
 *   cd web-citizen && npm install   # ensures @aztec/bb.js is present
 *
 * Run (from repo root):
 *   cd web-citizen && npx tsx ../scripts/generate-pre-seeded-leaves.ts
 */

import * as fs from 'fs';
import * as path from 'path';
import process from 'process';
import { Barretenberg } from '@aztec/bb.js';

// ── Existing codebase imports ──────────────────────────────────────────────
import mockCitizens from '../web-citizen/src/lib/mockData';
import mockSecrets   from '../web-citizen/src/lib/MockSecret';
import {
  computePrivateLicenseData,
  createFinalMerkleLeaf,
  clampToField,
} from '../web-citizen/src/lib/commitment';
// ──────────────────────────────────────────────────────────────────────────

// ─── Types ─────────────────────────────────────────────────────────────────
type LeafRecord = {
  index:     number;
  publicName: string;
  leafHash:  string;
};

// ─── Main ───────────────────────────────────────────────────────────────────
async function main(): Promise<void> {
  console.log('='.repeat(70));
  console.log(' Hybrid Transparency — Pre-Seeded Leaf Generator');
  console.log(`  Dataset size : ${mockCitizens.length} citizens`);
  console.log('='.repeat(70));
  console.log('');

  // Boot a single shared Barretenberg WASM instance for the entire run.
  // This avoids the overhead of re-initialising the engine per citizen.
  console.log('⚙️  Booting Barretenberg WASM engine...');
  let bb: any = null;
  bb = await Barretenberg.new();
  console.log('✅ Engine ready.\n');

  const records: LeafRecord[] = [];

  for (let i = 0; i < mockCitizens.length; i++) {
    const citizenRecord = mockCitizens[i];
    const { subject, ltoSignature } = citizenRecord;

    // Mirror register/page.tsx:55-57 exactly.
    const secretObj = mockSecrets[i] ?? mockSecrets[0];
    const secret    = clampToField(secretObj.secret);
    const fullName  = `${subject.firstName} ${subject.lastName}`;

    // Step 1: sequential-fold all 11 private license fields → private_license_data
    const privateLicenseData = await computePrivateLicenseData(
      bb,
      subject.licenseID,
      subject.firstName,
      subject.lastName,
      subject.dateOfBirth,
      subject.licenseType,
      subject.expirationDate,
      subject.restrictions,
      subject.conditions,
      subject.bloodType,
      subject.address,
      ltoSignature,
    );

    // Step 2: temp_hash = Poseidon2(secret, private_license_data)
    //         final_leaf = Poseidon2(temp_hash, stringToFieldHex(public_name))
    const leafHash = await createFinalMerkleLeaf(bb, secret, privateLicenseData, fullName);

    records.push({ index: i, publicName: fullName, leafHash });

    // Rolling progress indicator every 10 entries.
    if ((i + 1) % 10 === 0 || i === mockCitizens.length - 1) {
      console.log(`  [${String(i + 1).padStart(3, ' ')}/${mockCitizens.length}] processed`);
    }
  }

  // ── Tear-down ────────────────────────────────────────────────────────────
  await (bb as any).destroy?.();

  // ════════════════════════════════════════════════════════════════════════
  // FORMAT A — Clean JSON Array (admin bulk-insert ready)
  // ════════════════════════════════════════════════════════════════════════
  const leafArray: string[] = records.map(r => r.leafHash);

  console.log('\n' + '─'.repeat(70));
  console.log('FORMAT A  —  JSON Leaf Array (bulk-insert payload)');
  console.log('─'.repeat(70));
  console.log(JSON.stringify(leafArray, null, 2));

  // ════════════════════════════════════════════════════════════════════════
  // FORMAT B — Markdown Tracking Layout
  // ════════════════════════════════════════════════════════════════════════
  const mdLines: string[] = [
    '─'.repeat(70),
    'FORMAT B  —  Markdown Leaf Tracking',
    '─'.repeat(70),
  ];
  for (const r of records) {
    mdLines.push(`Index [${r.index}] | Name: ${r.publicName} -> Leaf: ${r.leafHash}`);
  }
  const mdBlock = mdLines.join('\n');
  console.log('\n' + mdBlock);

  // ════════════════════════════════════════════════════════════════════════
  // FILE OUTPUT — scripts/pre-seeded-leaves.json
  // ════════════════════════════════════════════════════════════════════════
  const outputPath = path.resolve(__dirname, 'pre-seeded-leaves.json');
  const filePayload = {
    generatedAt:  new Date().toISOString(),
    totalLeaves:  records.length,
    leafArray,
    leafMapping:  records.map(r => ({
      index:      r.index,
      publicName: r.publicName,
      leafHash:   r.leafHash,
    })),
  };

  fs.writeFileSync(outputPath, JSON.stringify(filePayload, null, 2), 'utf-8');

  console.log('\n' + '='.repeat(70));
  console.log(`✅ Done. ${records.length} leaves generated.`);
  console.log(`📄 Written to: ${outputPath}`);
  console.log('='.repeat(70) + '\n');
}

main().catch(err => {
  console.error('❌ Leaf generation failed:', err);
  process.exit(1);
});
