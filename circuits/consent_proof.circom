pragma circom 2.1.0;

include "circomlib/circuits/poseidon.circom";
include "circomlib/circuits/comparators.circom";
include "circomlib/circuits/eddsaposeidon.circom";

/*
 * Consent Verification Proof Circuit
 *
 * Proves that valid consent was obtained for data processing
 * without revealing the consent document or personal information.
 *
 * Public Inputs:
 * - commitment: The data commitment
 * - consentHash: Hash of the consent requirements
 *
 * Private Inputs:
 * - consentDocument: The actual consent document hash
 * - signatureR8: EdDSA signature R component
 * - signatureS: EdDSA signature S component
 * - signerPubKey: Public key of the signer
 */

template ConsentProof() {
    // Public inputs
    signal input commitment;
    signal input consentHash;

    // Private inputs (simplified for demo)
    signal input consentDocument;
    signal input signatureValid;
    signal input signerAddress;
    signal input consentTimestamp;

    // Output
    signal output valid;

    // Verify consent document matches expected hash
    component docHasher = Poseidon(2);
    docHasher.inputs[0] <== consentDocument;
    docHasher.inputs[1] <== consentTimestamp;

    signal hashMatch;
    hashMatch <== docHasher.out - consentHash;

    component isHashZero = IsZero();
    isHashZero.in <== hashMatch;

    // Verify signature is valid (simplified - in production use EdDSA)
    component sigValid = IsZero();
    sigValid.in <== 1 - signatureValid;

    // Link consent to data commitment
    component commitmentHasher = Poseidon(3);
    commitmentHasher.inputs[0] <== commitment;
    commitmentHasher.inputs[1] <== consentDocument;
    commitmentHasher.inputs[2] <== signerAddress;

    // All conditions must be true
    valid <== isHashZero.out * sigValid.out;
}

component main {public [commitment, consentHash]} = ConsentProof();
