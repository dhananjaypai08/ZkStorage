# zkStorage - Verifiable Private Storage

A production-grade application combining Next.js, Walrus decentralized storage, Seal encryption with policies, and zero-knowledge proofs on Sui blockchain.

## Overview

zkStorage enables users to:

1. **Upload & Encrypt**: Store files encrypted with Seal policies on Walrus
2. **Generate Commitments**: Create Merkle commitments from plaintext data
3. **Produce ZK Receipts**: Generate proofs of compliance without revealing content
4. **Verify On-Chain**: Check proofs against Sui smart contracts

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                         Frontend (Next.js)                       │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────────┐    │
│  │  Upload  │  │ Receipt  │  │  Verify  │  │   Video Hero  │    │
│  │   Page   │  │   Page   │  │   Page   │  │   (GSAP)      │    │
│  └────┬─────┘  └────┬─────┘  └────┬─────┘  └──────────────┘    │
│       │             │             │                              │
│  ┌────┴─────────────┴─────────────┴────────────────────────┐   │
│  │              Library Utilities                            │   │
│  │  ┌────────┐ ┌────────┐ ┌────────┐ ┌─────────┐ ┌───────┐ │   │
│  │  │ Walrus │ │  Seal  │ │ Merkle │ │ZK Prover│ │  Sui  │ │   │
│  │  └────────┘ └────────┘ └────────┘ └─────────┘ └───────┘ │   │
│  └─────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────┘
                              │
        ┌─────────────────────┼─────────────────────┐
        ▼                     ▼                     ▼
┌──────────────┐    ┌──────────────────┐    ┌──────────────┐
│    Walrus    │    │   Sui Testnet    │    │   snarkjs    │
│   Storage    │    │  Smart Contracts │    │  ZK Proofs   │
└──────────────┘    └──────────────────┘    └──────────────┘
```

## Features

### Frontend
- **Cinematic Hero**: Liquid metal video background with SVG masking
- **GSAP Animations**: Page transitions with wipe, logo spin, and shine effects
- **Modern UI**: Tailwind CSS with glassmorphism and gradient effects
- **Responsive**: Mobile-first design

### Storage & Encryption
- **Walrus Integration**: Decentralized blob storage with retention periods
- **Seal Encryption**: Policy-based access control with threshold decryption
- **Merkle Commitments**: Cryptographic data integrity verification

### Zero-Knowledge Proofs
- **Storage Proof**: Verify data was stored correctly
- **Retention Proof**: Prove TTL compliance without revealing duration
- **Consent Proof**: Demonstrate valid consent exists
- **Threshold Proof**: Prove quorum approval for auditor access

### Smart Contracts (Sui Move)
- **StorageReceipt**: On-chain record linking commitment, blob, and policy
- **ProofVerifier**: Validates ZK proofs and updates receipts
- **ComplianceLedger**: Permanent audit trail for compliance records

## Quick Start

### Prerequisites
- Node.js 18+
- Sui CLI
- Git

### Installation

```bash
# Clone the repository
cd ZkStorage

# Install frontend dependencies
cd frontend
npm install

# Start development server
npm run dev
```

### Deploy Smart Contracts

```bash
# Switch to Sui testnet
sui client switch --env testnet

# Get testnet SUI
sui client faucet

# Deploy contracts
cd contracts
chmod +x scripts/deploy.sh
./scripts/deploy.sh
```

### Configure Frontend

Update `frontend/lib/sui.ts` with your deployed package ID:

```typescript
const PACKAGE_ID = "0x<your-deployed-package-id>"
```

## Project Structure

```
ZkStorage/
├── frontend/                 # Next.js application
│   ├── app/                  # App router pages
│   │   ├── page.tsx          # Home page with hero
│   │   ├── upload/           # File upload & encryption
│   │   ├── receipt/          # ZK proof generation
│   │   └── verify/           # On-chain verification
│   ├── components/           # React components
│   │   ├── Hero.tsx          # Video hero section
│   │   ├── TransitionOverlay.tsx
│   │   └── ui/               # UI components
│   └── lib/                  # Utility libraries
│       ├── walrus.ts         # Walrus SDK wrapper
│       ├── seal.ts           # Seal encryption
│       ├── merkle.ts         # Merkle tree utilities
│       ├── zk-prover.ts      # ZK proof generation
│       └── sui.ts            # Sui client
├── contracts/                # Move smart contracts
│   ├── sources/
│   │   ├── storage_receipt.move
│   │   ├── proof_verifier.move
│   │   └── compliance_ledger.move
│   └── scripts/
│       └── deploy.sh
└── circuits/                 # Circom ZK circuits
    ├── storage_proof.circom
    ├── retention_proof.circom
    ├── consent_proof.circom
    └── threshold_proof.circom
```

## Usage Flow

### 1. Upload & Encrypt

1. Navigate to `/upload`
2. Drag & drop a file (max 10MB)
3. Configure retention period and consent
4. Click "Encrypt & Upload"
5. Receive blob ID, commitment, and policy ID

### 2. Generate ZK Receipt

1. Navigate to `/receipt` (or click from upload result)
2. Enter commitment hash
3. Select proof type (storage, retention, consent, threshold)
4. Click "Generate ZK Proof"
5. Download the proof JSON

### 3. Verify On-Chain

1. Navigate to `/verify`
2. Paste or upload proof JSON
3. Click "Verify Proof"
4. See verification status and on-chain record

## Proof Types

| Type | Public Inputs | Private Inputs | Use Case |
|------|---------------|----------------|----------|
| Storage | commitment, policyHash | fileHash, policyId, timestamp | Verify data stored correctly |
| Retention | commitment, maxDays | retentionDays, createdAt | Prove TTL compliance |
| Consent | commitment, consentHash | document, signature | Show valid consent |
| Threshold | commitment, threshold | signatures, auditor | Prove quorum approval |

## API Reference

### Walrus

```typescript
// Upload encrypted data
const result = await uploadToWalrus(encryptedData, epochs)
// Returns: { blobId, suiObjectId, endEpoch, cost }

// Retrieve data
const data = await retrieveFromWalrus(blobId)
```

### Seal

```typescript
// Create policy
const policy = createPolicy({
  type: "time-lock",
  retentionDays: 30,
  consentRequired: true
})

// Encrypt
const envelope = await encryptWithSeal(data, policy)
```

### ZK Proofs

```typescript
// Generate proof
const proof = await generateProof("storage", {
  commitment: "0x...",
  fileHash: "0x...",
  policyId: "0x..."
})

// Verify
const isValid = await verifyProof(proof)
```

## Configuration

### Environment Variables

Create `.env.local` in the frontend directory:

```env
NEXT_PUBLIC_SUI_NETWORK=testnet
NEXT_PUBLIC_WALRUS_AGGREGATOR=https://aggregator.walrus-testnet.walrus.space
NEXT_PUBLIC_WALRUS_PUBLISHER=https://publisher.walrus-testnet.walrus.space
```

## Security Considerations

1. **Trusted Setup**: ZK circuits require a trusted setup ceremony for production
2. **Key Management**: Seal encryption keys should be securely managed
3. **Input Validation**: All user inputs are validated before processing
4. **Client-Side Encryption**: Data is encrypted before leaving the browser

## Testing

```bash
# Frontend tests
cd frontend
npm run test

# Move tests
cd contracts
sui move test
```

## Deployment

### Vercel (Frontend)

```bash
cd frontend
vercel
```

### Sui Mainnet (Contracts)

1. Update `Move.toml` with mainnet addresses
2. Ensure sufficient SUI for gas
3. Run deploy script with mainnet configuration

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Submit a pull request

## License

MIT License - see LICENSE file

## Resources

- [Walrus Documentation](https://docs.walrus.site)
- [Seal SDK](https://seal.mystenlabs.com)
- [Sui Move](https://docs.sui.io/concepts/sui-move-concepts)
- [Circom](https://docs.circom.io)
- [snarkjs](https://github.com/iden3/snarkjs)

## Support

For issues and feature requests, please use the GitHub issue tracker.
