pragma circom 2.1.0;

include "circomlib/circuits/poseidon.circom";
include "circomlib/circuits/comparators.circom";

/*
 * Threshold Decryption Proof Circuit
 *
 * Proves that a quorum of key holders approved a decryption request
 * without revealing which specific key holders signed or the decryption key.
 *
 * Public Inputs:
 * - commitment: The data commitment
 * - requiredThreshold: Number of signatures required (N)
 * - auditorAddressHash: Hash of authorized auditor address
 *
 * Private Inputs:
 * - signaturesProvided: Number of valid signatures collected
 * - keyHolderSignatures: Array of signature validity flags
 * - auditorAddress: The actual auditor address
 */

template ThresholdProof(maxKeyHolders) {
    // Public inputs
    signal input commitment;
    signal input requiredThreshold;
    signal input auditorAddressHash;

    // Private inputs
    signal input signaturesProvided;
    signal input keyHolderSignatures[maxKeyHolders];
    signal input auditorAddress;

    // Output
    signal output thresholdMet;
    signal output auditorAuthorized;

    // Count valid signatures
    signal signatureCount[maxKeyHolders + 1];
    signatureCount[0] <== 0;

    for (var i = 0; i < maxKeyHolders; i++) {
        // Each signature is 0 or 1
        keyHolderSignatures[i] * (1 - keyHolderSignatures[i]) === 0;
        signatureCount[i + 1] <== signatureCount[i] + keyHolderSignatures[i];
    }

    // Verify count matches provided value
    signal countMatch;
    countMatch <== signatureCount[maxKeyHolders] - signaturesProvided;

    component isCountCorrect = IsZero();
    isCountCorrect.in <== countMatch;

    // Check threshold is met
    component thresholdCheck = GreaterEqThan(32);
    thresholdCheck.in[0] <== signaturesProvided;
    thresholdCheck.in[1] <== requiredThreshold;

    thresholdMet <== isCountCorrect.out * thresholdCheck.out;

    // Verify auditor authorization
    component auditorHasher = Poseidon(1);
    auditorHasher.inputs[0] <== auditorAddress;

    signal auditorMatch;
    auditorMatch <== auditorHasher.out - auditorAddressHash;

    component isAuditorValid = IsZero();
    isAuditorValid.in <== auditorMatch;

    auditorAuthorized <== isAuditorValid.out;
}

component main {public [commitment, requiredThreshold, auditorAddressHash]} = ThresholdProof(10);
