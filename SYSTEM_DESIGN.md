# zkStorage System Design Flow

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                         USER INTERFACE                          │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐     │
│  │  Upload  │  │ Receipt  │  │  Verify  │  │   Home   │     │
│  │   Page   │  │   Page   │  │   Page   │  │   Page   │     │
│  └────┬─────┘  └────┬─────┘  └────┬─────┘  └────┬─────┘     │
└───────┼──────────────┼──────────────┼──────────────┼──────────┘
        │              │              │              │
        └──────────────┴──────────────┴──────────────┘
                          │
        ┌─────────────────┴─────────────────┐
        │     Sui Wallet Integration        │
        │  (Connect, Sign Transactions)     │
        └─────────────────┬─────────────────┘
                          │
```

## Upload Flow

```
┌─────────────┐
│ User Selects│
│    File     │
└──────┬──────┘
       │
       ▼
┌─────────────────┐
│ Configure Policy │
│ - Retention Days │
│ - Consent Flag   │
└──────┬──────────┘
       │
       ▼
┌──────────────────────┐
│ Create Merkle        │
│ Commitment           │
│ (from plaintext)     │
└──────┬───────────────┘
       │
       ▼
┌──────────────────────┐
│ Seal Encryption      │
│ - Generate Key       │
│ - Encrypt Data       │
│ - Create Policy      │
└──────┬───────────────┘
       │
       ▼
┌──────────────────────┐
│ Upload to Walrus     │
│ - Encrypted Blob     │
│ - Get Blob ID        │
└──────┬───────────────┘
       │
       ▼
┌──────────────────────┐
│ Create On-Chain      │
│ Receipt (Sui)        │
│ - Commitment         │
│ - Blob ID            │
│ - Policy ID          │
│ - Retention Days     │
└──────┬───────────────┘
       │
       ▼
┌──────────────────────┐
│ Store Policy in      │
│ localStorage         │
│ (for later decrypt)  │
└──────────────────────┘
```

## Verification Flow

```
┌─────────────┐
│ User Provides│
│   Proof JSON │
└──────┬───────┘
       │
       ▼
┌──────────────────────┐
│ Parse & Validate     │
│ Proof Structure      │
└──────┬───────────────┘
       │
       ▼
┌──────────────────────┐
│ Verify ZK Proof      │
│ (snarkjs/circuit)    │
└──────┬───────────────┘
       │
       ▼
┌──────────────────────┐
│ Fetch Blob from      │
│ Walrus (using BlobID)│
└──────┬───────────────┘
       │
       ▼
┌──────────────────────┐
│ Deserialize Envelope│
│ (ciphertext + meta)  │
└──────┬───────────────┘
       │
       ▼
┌──────────────────────┐
│ Decrypt with Seal    │
│ - Check Policy       │
│ - Verify Access      │
│ - Decrypt Data       │
└──────┬───────────────┘
       │
       ▼
┌──────────────────────┐
│ Display Decrypted    │
│ Content (if image)   │
│ or Download Link     │
└──────────────────────┘
```

## On-Chain Receipt Creation

```
┌─────────────┐
│ User Clicks │
│ "Create     │
│ Receipt"    │
└──────┬──────┘
       │
       ▼
┌──────────────────────┐
│ Build Transaction    │
│ - Package ID         │
│ - Module:            │
│   storage_receipt    │
│ - Function:          │
│   create_and_        │
│   transfer_receipt   │
└──────┬───────────────┘
       │
       ▼
┌──────────────────────┐
│ Serialize Arguments │
│ - commitment:        │
│   vector<u8>         │
│ - blob_id:           │
│   vector<u8>         │
│ - policy_id:         │
│   vector<u8>         │
│ - retention_days:    │
│   u64                │
│ - consent_signed:    │
│   bool               │
│ - clock: 0x6         │
└──────┬───────────────┘
       │
       ▼
┌──────────────────────┐
│ Wallet Popup Opens   │
│ (Sui Wallet)         │
└──────┬───────────────┘
       │
       ▼
┌──────────────────────┐
│ User Signs           │
│ Transaction          │
└──────┬───────────────┘
       │
       ▼
┌──────────────────────┐
│ Transaction Executed│
│ on Sui Testnet       │
└──────┬───────────────┘
       │
       ▼
┌──────────────────────┐
│ Receipt Object       │
│ Created & Transferred│
│ to User              │
└──────────────────────┘
```

## Data Flow Diagram

```
┌──────────────┐
│  Plaintext   │
│    File      │
└──────┬───────┘
       │
       ├─────────────────┐
       │                 │
       ▼                 ▼
┌──────────────┐  ┌──────────────┐
│   Merkle     │  │   Seal       │
│  Commitment  │  │  Encryption  │
│  (ZK Proof)  │  │  (Policy)    │
└──────┬───────┘  └──────┬───────┘
       │                 │
       │                 ▼
       │          ┌──────────────┐
       │          │  Encrypted   │
       │          │    Blob      │
       │          └──────┬───────┘
       │                 │
       │                 ▼
       │          ┌──────────────┐
       │          │   Walrus     │
       │          │  Storage     │
       │          │  (Blob ID)   │
       │          └──────┬───────┘
       │                 │
       └─────────────────┘
                 │
                 ▼
         ┌──────────────┐
         │  On-Chain    │
         │  Receipt     │
         │  (Sui)       │
         │              │
         │  Contains:   │
         │  - Commitment│
         │  - Blob ID   │
         │  - Policy ID │
         │  - Retention│
         └──────────────┘
```

## Component Architecture

```
┌─────────────────────────────────────────────────────────┐
│                    Frontend (Next.js)                    │
├─────────────────────────────────────────────────────────┤
│                                                          │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐ │
│  │   Pages      │  │  Components  │  │    Lib       │ │
│  │              │  │              │  │              │ │
│  │ - upload     │  │ - Wallet     │  │ - sui.ts     │ │
│  │ - verify     │  │   Display    │  │ - seal.ts    │ │
│  │ - receipt    │  │ - Hero       │  │ - walrus.ts  │ │
│  │ - home       │  │ - UI         │  │ - zk-prover  │ │
│  └──────────────┘  └──────────────┘  └──────────────┘ │
│                                                          │
└─────────────────────────────────────────────────────────┘
                          │
        ┌─────────────────┼─────────────────┐
        │                 │                 │
        ▼                 ▼                 ▼
┌──────────────┐  ┌──────────────┐  ┌──────────────┐
│   Sui        │  │   Walrus     │  │   Seal       │
│  Blockchain  │  │  Storage     │  │  Encryption  │
│              │  │              │  │              │
│ - Receipts   │  │ - Blobs      │  │ - Policies   │
│ - Proof      │  │ - Metadata   │  │ - Keys       │
│   Verifier   │  │              │  │              │
└──────────────┘  └──────────────┘  └──────────────┘
```

## Security Flow

```
┌─────────────────────────────────────────────────────────┐
│                    Security Layers                       │
├─────────────────────────────────────────────────────────┤
│                                                          │
│  1. Seal Encryption                                      │
│     └─> AES-256-GCM with policy-based access            │
│                                                          │
│  2. Walrus Storage                                       │
│     └─> Encrypted blob stored on decentralized network  │
│                                                          │
│  3. Merkle Commitment                                    │
│     └─> Cryptographic hash of plaintext (for ZK proofs)  │
│                                                          │
│  4. Zero-Knowledge Proofs                                │
│     └─> Prove compliance without revealing data         │
│                                                          │
│  5. On-Chain Receipt                                     │
│     └─> Immutable record on Sui blockchain              │
│                                                          │
└─────────────────────────────────────────────────────────┘
```

## Transaction Building Process

```
User Action
    │
    ▼
┌──────────────────┐
│ Collect Data     │
│ - commitment     │
│ - blobId         │
│ - policyId       │
│ - retentionDays  │
└────────┬─────────┘
         │
         ▼
┌──────────────────┐
│ Validate Inputs  │
│ - Type checks    │
│ - Non-empty      │
│ - Valid ranges   │
└────────┬─────────┘
         │
         ▼
┌──────────────────┐
│ Create Transaction│
│ - new Transaction()│
│ - Set package ID │
│ - Set target     │
└────────┬─────────┘
         │
         ▼
┌──────────────────┐
│ Serialize Args   │
│ - vector<u8>     │
│   (from strings) │
│ - u64            │
│   (from number)  │
│ - bool           │
│   (from boolean) │
└────────┬─────────┘
         │
         ▼
┌──────────────────┐
│ Build moveCall   │
│ - target string  │
│ - arguments[]    │
└────────┬─────────┘
         │
         ▼
┌──────────────────┐
│ Return Transaction│
│ (ready for wallet)│
└──────────────────┘
```

## Error Handling Flow

```
Transaction Build
    │
    ├─> Invalid Params
    │   └─> Show Error Toast
    │
    ├─> Package Not Found
    │   └─> Check Network
    │       └─> Show Network Error
    │
    ├─> Serialization Error
    │   └─> Show Build Error
    │
    └─> Success
        └─> Open Wallet Popup
            │
            ├─> User Rejects
            │   └─> Silent Fail
            │
            ├─> Network Mismatch
            │   └─> Show Network Error
            │
            └─> Success
                └─> Show Success Toast
                    └─> Display Receipt ID
```

