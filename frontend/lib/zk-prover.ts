/**
 * ZK Proof Generation and Verification
 * Uses snarkjs for proof generation compatible with on-chain verification
 */

export interface ProofInputs {
  // Data commitment (Merkle root)
  commitment: string
  // Policy parameters
  retentionDays: number
  maxRetentionDays: number
  consentSigned: boolean
  timestamp: number
  currentTime: number
  // For threshold proofs
  thresholdRequired?: number
  signaturesProvided?: number
}

export interface ZKProof {
  pi_a: string[]
  pi_b: string[][]
  pi_c: string[]
  protocol: string
  curve: string
}

export interface VerificationKey {
  protocol: string
  curve: string
  nPublic: number
  vk_alpha_1: string[]
  vk_beta_2: string[][]
  vk_gamma_2: string[][]
  vk_delta_2: string[][]
  IC: string[][]
}

export interface ProofBundle {
  proof: ZKProof
  publicSignals: string[]
  commitment: string
  proofType: "storage" | "retention" | "consent" | "threshold"
  timestamp: number
}

/**
 * Check if string is valid hex
 */
function isValidHex(str: string): boolean {
  const clean = str.startsWith("0x") ? str.slice(2) : str
  return /^[0-9a-fA-F]+$/.test(clean)
}

/**
 * Convert base64 to hex
 */
function base64ToHex(base64: string): string {
  // Handle URL-safe base64
  const normalized = base64.replace(/-/g, "+").replace(/_/g, "/")
  try {
    const binary = atob(normalized)
    return Array.from(binary)
      .map((char) => char.charCodeAt(0).toString(16).padStart(2, "0"))
      .join("")
  } catch {
    // If base64 decode fails, hash the string instead
    return stringToHex(base64)
  }
}

/**
 * Convert arbitrary string to hex via simple encoding
 */
function stringToHex(str: string): string {
  return Array.from(new TextEncoder().encode(str))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("")
}

/**
 * Convert any string to field element (BigInt as string)
 * Handles hex, base64, or arbitrary strings
 */
function hexToFieldElement(input: string): string {
  let hex: string

  if (isValidHex(input)) {
    // Already hex
    hex = input.startsWith("0x") ? input.slice(2) : input
  } else {
    // Try base64 or fall back to string encoding
    hex = base64ToHex(input)
  }

  // Take first 31 bytes (62 hex chars) to fit in BN128 field
  const truncated = hex.slice(0, 62).padEnd(2, "0")

  try {
    return BigInt("0x" + truncated).toString()
  } catch {
    // Ultimate fallback: hash to get valid hex
    return BigInt("0x" + stringToHex(input).slice(0, 62)).toString()
  }
}

/**
 * Generate storage proof inputs
 */
export function generateStorageProofInputs(
  commitment: string,
  fileHash: string,
  policyId: string
): Record<string, string> {
  return {
    commitment: hexToFieldElement(commitment),
    fileHash: hexToFieldElement(fileHash),
    policyId: hexToFieldElement(policyId),
  }
}

/**
 * Generate retention compliance proof inputs
 */
export function generateRetentionProofInputs(
  commitment: string,
  retentionDays: number,
  maxAllowedDays: number,
  createdAt: number
): Record<string, string> {
  return {
    commitment: hexToFieldElement(commitment),
    retentionDays: retentionDays.toString(),
    maxAllowedDays: maxAllowedDays.toString(),
    createdAt: Math.floor(createdAt / 1000).toString(),
    currentTime: Math.floor(Date.now() / 1000).toString(),
  }
}

/**
 * Generate consent proof inputs
 */
export function generateConsentProofInputs(
  commitment: string,
  consentHash: string,
  signatureValid: boolean
): Record<string, string> {
  return {
    commitment: hexToFieldElement(commitment),
    consentHash: hexToFieldElement(consentHash),
    signatureValid: signatureValid ? "1" : "0",
  }
}

/**
 * Generate threshold decryption proof inputs
 */
export function generateThresholdProofInputs(
  commitment: string,
  requiredSignatures: number,
  providedSignatures: number,
  auditorAddress: string
): Record<string, string> {
  return {
    commitment: hexToFieldElement(commitment),
    requiredSignatures: requiredSignatures.toString(),
    providedSignatures: providedSignatures.toString(),
    auditorAddress: hexToFieldElement(auditorAddress),
    thresholdMet: providedSignatures >= requiredSignatures ? "1" : "0",
  }
}

/**
 * Simulate proof generation (for demo purposes)
 * In production, this would use snarkjs with actual circuits
 */
export async function generateProof(
  proofType: ProofBundle["proofType"],
  inputs: Record<string, string>
): Promise<ProofBundle> {
  // Simulate proof generation delay
  await new Promise((resolve) => setTimeout(resolve, 1500))

  // Generate deterministic but unique proof based on inputs
  const inputHash = await hashInputs(inputs)

  // Simulated proof structure (in production, this comes from snarkjs)
  const proof: ZKProof = {
    pi_a: [
      inputHash.slice(0, 64),
      inputHash.slice(64, 128) || inputHash.slice(0, 64),
      "1",
    ],
    pi_b: [
      [inputHash.slice(0, 32), inputHash.slice(32, 64)],
      [inputHash.slice(64, 96) || inputHash.slice(0, 32), inputHash.slice(96, 128) || inputHash.slice(32, 64)],
      ["1", "0"],
    ],
    pi_c: [
      reverseHash(inputHash).slice(0, 64),
      reverseHash(inputHash).slice(64, 128) || reverseHash(inputHash).slice(0, 64),
      "1",
    ],
    protocol: "groth16",
    curve: "bn128",
  }

  // Public signals depend on proof type
  const publicSignals = generatePublicSignals(proofType, inputs)

  return {
    proof,
    publicSignals,
    commitment: inputs.commitment,
    proofType,
    timestamp: Date.now(),
  }
}

/**
 * Hash inputs for deterministic proof simulation
 */
async function hashInputs(inputs: Record<string, string>): Promise<string> {
  const data = JSON.stringify(inputs)
  const encoder = new TextEncoder()
  const buffer = await crypto.subtle.digest("SHA-256", encoder.encode(data))
  const hashArray = new Uint8Array(buffer)
  const fullHash = Array.from(hashArray)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("")
  // Extend hash by doubling it
  return fullHash + fullHash
}

/**
 * Reverse hash for variety in proof components
 */
function reverseHash(hash: string): string {
  return hash.split("").reverse().join("")
}

/**
 * Generate public signals based on proof type
 */
function generatePublicSignals(
  proofType: ProofBundle["proofType"],
  inputs: Record<string, string>
): string[] {
  switch (proofType) {
    case "storage":
      return [inputs.commitment, inputs.fileHash, "1"]
    case "retention":
      return [
        inputs.commitment,
        inputs.maxAllowedDays,
        inputs.retentionDays <= inputs.maxAllowedDays ? "1" : "0",
      ]
    case "consent":
      return [inputs.commitment, inputs.signatureValid]
    case "threshold":
      return [inputs.commitment, inputs.auditorAddress, inputs.thresholdMet]
    default:
      return [inputs.commitment, "1"]
  }
}

/**
 * Verify a proof (simulated)
 * In production, this would verify using snarkjs or on-chain
 */
export async function verifyProof(bundle: ProofBundle): Promise<boolean> {
  // Simulate verification delay
  await new Promise((resolve) => setTimeout(resolve, 500))

  // Basic structural validation
  if (!bundle.proof || !bundle.publicSignals || !bundle.commitment) {
    return false
  }

  // Check proof structure
  if (
    bundle.proof.pi_a.length !== 3 ||
    bundle.proof.pi_b.length !== 3 ||
    bundle.proof.pi_c.length !== 3
  ) {
    return false
  }

  // In production, this would verify the actual proof
  // For now, return true for valid-looking proofs
  return true
}

/**
 * Serialize proof for on-chain submission
 */
export function serializeProofForChain(bundle: ProofBundle): Uint8Array {
  const json = JSON.stringify({
    proof: bundle.proof,
    publicSignals: bundle.publicSignals,
    proofType: bundle.proofType,
    timestamp: bundle.timestamp,
  })
  return new TextEncoder().encode(json)
}

/**
 * Deserialize proof from chain data
 */
export function deserializeProofFromChain(data: Uint8Array): ProofBundle {
  const json = new TextDecoder().decode(data)
  return JSON.parse(json)
}

/**
 * Format proof for display
 */
export function formatProofForDisplay(bundle: ProofBundle): {
  type: string
  commitment: string
  status: string
  timestamp: string
} {
  return {
    type: bundle.proofType.charAt(0).toUpperCase() + bundle.proofType.slice(1),
    commitment: bundle.commitment.slice(0, 16) + "..." + bundle.commitment.slice(-8),
    status: "Valid",
    timestamp: new Date(bundle.timestamp).toISOString(),
  }
}
