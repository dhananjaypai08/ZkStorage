/**
 * Merkle Tree Commitment Utilities
 * Creates cryptographic commitments for data integrity verification
 */

export interface MerkleTree {
  root: string
  leaves: string[]
  depth: number
  nodes: string[][]
}

export interface MerkleProof {
  leaf: string
  leafIndex: number
  siblings: string[]
  pathIndices: number[]
}

/**
 * Hash data using SHA-256
 */
async function sha256(data: Uint8Array): Promise<string> {
  // Create a new ArrayBuffer to avoid SharedArrayBuffer type issues
  const buffer = new ArrayBuffer(data.length)
  new Uint8Array(buffer).set(data)
  const hashBuffer = await crypto.subtle.digest("SHA-256", buffer)
  const hashArray = new Uint8Array(hashBuffer)
  return Array.from(hashArray)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("")
}

/**
 * Hash two nodes together (for internal tree nodes)
 */
async function hashPair(left: string, right: string): Promise<string> {
  // Sort to ensure consistent ordering
  const combined = left < right ? left + right : right + left
  const data = new TextEncoder().encode(combined)
  return sha256(data)
}

/**
 * Create a Merkle tree from data chunks
 */
export async function createMerkleTree(chunks: Uint8Array[]): Promise<MerkleTree> {
  if (chunks.length === 0) {
    throw new Error("Cannot create Merkle tree from empty chunks")
  }

  // Hash all leaf nodes
  const leaves = await Promise.all(chunks.map((chunk) => sha256(chunk)))

  // Pad to power of 2 if needed
  let paddedLeaves = [...leaves]
  while (paddedLeaves.length & (paddedLeaves.length - 1)) {
    paddedLeaves.push(paddedLeaves[paddedLeaves.length - 1])
  }

  // Build tree bottom-up
  const nodes: string[][] = [paddedLeaves]
  let currentLevel = paddedLeaves

  while (currentLevel.length > 1) {
    const nextLevel: string[] = []
    for (let i = 0; i < currentLevel.length; i += 2) {
      const hash = await hashPair(currentLevel[i], currentLevel[i + 1])
      nextLevel.push(hash)
    }
    nodes.push(nextLevel)
    currentLevel = nextLevel
  }

  return {
    root: currentLevel[0],
    leaves,
    depth: nodes.length - 1,
    nodes,
  }
}

/**
 * Create a commitment from raw file data
 */
export async function createCommitment(data: Uint8Array): Promise<{
  commitment: string
  tree: MerkleTree
}> {
  // Split data into chunks (16KB each)
  const CHUNK_SIZE = 16 * 1024
  const chunks: Uint8Array[] = []

  for (let i = 0; i < data.length; i += CHUNK_SIZE) {
    chunks.push(data.slice(i, Math.min(i + CHUNK_SIZE, data.length)))
  }

  // If single chunk or empty, still create a tree
  if (chunks.length === 0) {
    chunks.push(new Uint8Array(0))
  }

  const tree = await createMerkleTree(chunks)

  return {
    commitment: tree.root,
    tree,
  }
}

/**
 * Generate a Merkle proof for a specific leaf
 */
export function generateProof(tree: MerkleTree, leafIndex: number): MerkleProof {
  if (leafIndex < 0 || leafIndex >= tree.leaves.length) {
    throw new Error("Leaf index out of bounds")
  }

  const siblings: string[] = []
  const pathIndices: number[] = []
  let idx = leafIndex

  // Walk up the tree
  for (let level = 0; level < tree.depth; level++) {
    const isRightNode = idx % 2 === 1
    const siblingIdx = isRightNode ? idx - 1 : idx + 1

    if (siblingIdx < tree.nodes[level].length) {
      siblings.push(tree.nodes[level][siblingIdx])
      pathIndices.push(isRightNode ? 0 : 1)
    }

    idx = Math.floor(idx / 2)
  }

  return {
    leaf: tree.leaves[leafIndex],
    leafIndex,
    siblings,
    pathIndices,
  }
}

/**
 * Verify a Merkle proof
 */
export async function verifyProof(
  root: string,
  proof: MerkleProof
): Promise<boolean> {
  let current = proof.leaf

  for (let i = 0; i < proof.siblings.length; i++) {
    const sibling = proof.siblings[i]
    const pathIndex = proof.pathIndices[i]

    if (pathIndex === 0) {
      current = await hashPair(sibling, current)
    } else {
      current = await hashPair(current, sibling)
    }
  }

  return current === root
}

/**
 * Hash file directly (single hash, no tree)
 */
export async function hashFile(data: Uint8Array): Promise<string> {
  return sha256(data)
}

/**
 * Create commitment with metadata
 */
export async function createCommitmentWithMetadata(
  data: Uint8Array,
  metadata: {
    retentionDays: number
    consentSigned: boolean
    timestamp: number
  }
): Promise<{
  commitment: string
  metadataHash: string
  combinedCommitment: string
}> {
  const { commitment } = await createCommitment(data)

  // Hash the metadata
  const metadataBytes = new TextEncoder().encode(JSON.stringify(metadata))
  const metadataHash = await sha256(metadataBytes)

  // Combine data commitment with metadata hash
  const combinedCommitment = await hashPair(commitment, metadataHash)

  return {
    commitment,
    metadataHash,
    combinedCommitment,
  }
}

/**
 * Convert hex string to bytes
 */
export function hexToBytes(hex: string): Uint8Array {
  const bytes = new Uint8Array(hex.length / 2)
  for (let i = 0; i < hex.length; i += 2) {
    bytes[i / 2] = parseInt(hex.substring(i, i + 2), 16)
  }
  return bytes
}

/**
 * Convert bytes to hex string
 */
export function bytesToHex(bytes: Uint8Array): string {
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("")
}
