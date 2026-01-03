# Hybrid-Transparency-core│
```
├── circuits/                     <-- KINGDOM 1: The Truth (Member 1)
│   ├── src/
│   │   └── main.nr               <-- (Standard entry point)
│   ├── Prover.toml               <-- (Test inputs)
│   └── Nargo.toml                <-- (Config)
│
├── contracts/                    <-- KINGDOM 2: The Trap (Member 2)
│   ├── contracts/
│   │   ├── Verifier.sol          <-- (The "Public" Anchor Contract)
│   │   └── Lock.sol              <-- (Delete this later)
│   ├── scripts/
│   │   └── deploy.ts             <-- (Deploys Verifier to Localhost)
│   ├── hardhat.config.ts         <-- (Configured for Localhost network)
│   └── package.json
│
├── web-citizen/                  <-- KINGDOM 3: The Public (Member 3)
│   ├── app/
│   │   ├── wallet/               <-- (Stores User Secret in LocalStorage)
│   │   │   └── page.tsx
│   │   └── verify/               <-- (Queries Verifier.sol on Localhost)
│   │       └── page.tsx
│   ├── components/
│   │   └── Credentials.json      <-- (Mock Identity for testing)
│   ├── utils/
│   │   ├── zk-proof.ts           <-- (Generates Proofs using Circuit, calls Edwards conversion)
│   │   ├── merkle.ts             <-- (fetch inclusion proof for user’s credential)
│   │   ├── chain.ts              <-- (Read-only contract queries: Merkle root, events)
│   │   ├── status.ts             <-- (Check if credential hash is revoked or anchored)
│   │   └── crypto.ts             <-- (ECDSA → Edwards conversion utility, imported by wallet/proof)
│   └── package.json
│
├── web-admin/                    <-- KINGDOM 4: The Government (Member 4)
│   ├── app/
│   │   ├── issuer/               <-- (The "Portal" UI)
│   │   │   └── page.tsx
│   │   └── api/                  <-- NEW: API Route to handle DB writes
│   │       ├──  register/       <-- (Writes to DB)
│   │       │  └── route.ts 
│   │       └── get-path/       <-- NEW: User calls this to get their "Inclusion Proof"
│   │             └── route.ts
│   ├── utils/
│   │   ├── db.json               <-- NEW: The "Private Chain" Database
│   │   ├── anchor.ts          <-- NEW: The Script to "Sync" Root to Contract
│   │   ├── chain.ts		<-- Connect to Contract (Read Events / Write Revocations)
│   │   ├── merkle.ts  		<-- Admin needs to see the Tree Root
│   │   ├── revoke.ts   	<-- Admin's main weapon (Ban hammer      
│   │   └── crypto.ts             <-- (ECDSA → Edwards conversion utility, imported by wallet)  
│   └── package.json
│
├── .gitignore                    <-- Critical (.env, node_modules)
└── README.md

Diagram of the system: https://app.eraser.io/workspace/YftjwOIfE3uFNa5aTSfs?origin=share 

Wait for futher update on setup instructions, thank you.
```
