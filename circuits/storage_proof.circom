pragma circom 2.1.0;

include "circomlib/circuits/poseidon.circom";
include "circomlib/circuits/comparators.circom";

/*
 * Storage Proof Circuit
 *
 * Proves that a file with a specific hash was stored with a given policy,
 * without revealing the actual file content.
 *
 * Public Inputs:
 * - commitment: The Merkle root/commitment of the stored data
 * - policyHash: Hash of the storage policy
 *
 * Private Inputs:
 * - fileHash: Hash of the actual file content
 * - policyId: The policy identifier
 * - timestamp: When the data was stored
 */

template StorageProof() {
    // Public inputs
    signal input commitment;
    signal input policyHash;

    // Private inputs
    signal input fileHash;
    signal input policyId;
    signal input timestamp;

    // Output signal (1 if valid)
    signal output valid;

    // Compute the commitment from file hash and policy
    component hasher = Poseidon(3);
    hasher.inputs[0] <== fileHash;
    hasher.inputs[1] <== policyId;
    hasher.inputs[2] <== timestamp;

    // Verify commitment matches
    signal commitmentMatch;
    commitmentMatch <== hasher.out - commitment;

    // Commitment must match (difference should be 0)
    component isZero = IsZero();
    isZero.in <== commitmentMatch;

    // Compute policy hash
    component policyHasher = Poseidon(2);
    policyHasher.inputs[0] <== policyId;
    policyHasher.inputs[1] <== timestamp;

    // Verify policy hash matches
    signal policyMatch;
    policyMatch <== policyHasher.out - policyHash;

    component isPolicyZero = IsZero();
    isPolicyZero.in <== policyMatch;

    // Both must match for valid proof
    valid <== isZero.out * isPolicyZero.out;
}

component main {public [commitment, policyHash]} = StorageProof();
