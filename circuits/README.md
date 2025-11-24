# ZK Circuits for zkStorage

This directory contains Circom circuits for generating zero-knowledge proofs used in the zkStorage system.

## Circuits

### 1. Storage Proof (`storage_proof.circom`)
Proves that specific data was stored with a given commitment and policy without revealing the actual content.

**Public Inputs:**
- `commitment`: Merkle root of the stored data
- `policyHash`: Hash of the storage policy

**Private Inputs:**
- `fileHash`: Hash of the actual file
- `policyId`: Policy identifier
- `timestamp`: Storage timestamp

### 2. Retention Proof (`retention_proof.circom`)
Proves that data retention period complies with regulations without revealing the actual retention value.

**Public Inputs:**
- `commitment`: Data commitment
- `maxAllowedDays`: Maximum allowed retention

**Private Inputs:**
- `retentionDays`: Actual retention period
- `createdAt`: Creation timestamp
- `currentTime`: Current timestamp

### 3. Consent Proof (`consent_proof.circom`)
Proves valid consent was obtained without revealing the consent document or PII.

**Public Inputs:**
- `commitment`: Data commitment
- `consentHash`: Hash of consent requirements

**Private Inputs:**
- `consentDocument`: Consent document hash
- `signatureValid`: Signature validity flag
- `signerAddress`: Signer's address
- `consentTimestamp`: When consent was given

### 4. Threshold Proof (`threshold_proof.circom`)
Proves quorum approval for decryption without revealing which key holders signed.

**Public Inputs:**
- `commitment`: Data commitment
- `requiredThreshold`: Required signature count
- `auditorAddressHash`: Authorized auditor hash

**Private Inputs:**
- `signaturesProvided`: Number of signatures
- `keyHolderSignatures`: Array of signature flags
- `auditorAddress`: Auditor's address

## Setup

### Prerequisites
- Circom 2.1.0+
- snarkjs
- Node.js 18+

### Installation

```bash
# Install circom
curl -Ls https://scrypt.io/scripts/setup-circom.sh | sh

# Install snarkjs
npm install -g snarkjs
```

### Compile Circuits

```bash
# Compile storage proof circuit
circom storage_proof.circom --r1cs --wasm --sym -o build/

# Generate trusted setup (powers of tau)
snarkjs powersoftau new bn128 12 pot12_0000.ptau -v
snarkjs powersoftau contribute pot12_0000.ptau pot12_0001.ptau --name="First contribution" -v
snarkjs powersoftau prepare phase2 pot12_0001.ptau pot12_final.ptau -v

# Generate proving and verification keys
snarkjs groth16 setup build/storage_proof.r1cs pot12_final.ptau storage_proof_0000.zkey
snarkjs zkey contribute storage_proof_0000.zkey storage_proof_final.zkey --name="Second contribution" -v
snarkjs zkey export verificationkey storage_proof_final.zkey verification_key.json
```

### Generate Proof

```bash
# Create input.json with your values
echo '{"commitment": "123", "policyHash": "456", "fileHash": "789", "policyId": "111", "timestamp": "1700000000"}' > input.json

# Generate witness
cd build/storage_proof_js
node generate_witness.js storage_proof.wasm ../../input.json witness.wtns

# Generate proof
snarkjs groth16 prove ../../storage_proof_final.zkey witness.wtns proof.json public.json
```

### Verify Proof

```bash
snarkjs groth16 verify ../../verification_key.json public.json proof.json
```

## On-Chain Verification

The proofs can be verified on-chain using the Move verifier contract in `/contracts/sources/proof_verifier.move`. The verification key is embedded in the contract for gas-efficient verification.

## Security Considerations

1. **Trusted Setup**: Production deployments should use a multi-party computation (MPC) ceremony for the trusted setup.

2. **Circuit Auditing**: All circuits should be audited before production use.

3. **Input Validation**: Ensure all inputs are properly validated before proof generation.

4. **Key Management**: Proving keys should be securely stored and managed.
