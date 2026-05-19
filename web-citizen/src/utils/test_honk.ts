import { UltraHonkBackend } from '@aztec/bb.js';
import circuit from './hybrid_transparency.json';
const bytecode = Buffer.from(circuit.bytecode, 'base64');
const backend = new UltraHonkBackend(bytecode);
console.log(backend);
