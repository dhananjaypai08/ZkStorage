#!/bin/bash

# Compile and setup all ZK circuits for zkStorage
set -e

echo "🔧 Compiling ZK circuits..."

# Create build directory
mkdir -p build

# List of circuits to compile
circuits=("storage_proof" "retention_proof" "consent_proof" "threshold_proof")

# Compile each circuit
for circuit in "${circuits[@]}"; do
    echo ""
    echo "📦 Compiling ${circuit}..."
    circom ${circuit}.circom --r1cs --wasm --sym -o build/ -l node_modules

    if [ $? -eq 0 ]; then
        echo "✅ ${circuit} compiled successfully"
    else
        echo "❌ Failed to compile ${circuit}"
        exit 1
    fi
done

# Check if Powers of Tau file exists
if [ ! -f "build/pot12_final.ptau" ]; then
    echo ""
    echo "🔐 Generating Powers of Tau (this may take a few minutes)..."
    cd build

    # Generate Powers of Tau for bn128 curve with 2^12 constraints
    snarkjs powersoftau new bn128 12 pot12_0000.ptau -v
    snarkjs powersoftau contribute pot12_0000.ptau pot12_0001.ptau --name="First contribution" -e="random text" -v
    snarkjs powersoftau prepare phase2 pot12_0001.ptau pot12_final.ptau -v

    # Cleanup intermediate files
    rm pot12_0000.ptau pot12_0001.ptau

    cd ..
    echo "✅ Powers of Tau ceremony completed"
else
    echo ""
    echo "✅ Powers of Tau file already exists, skipping generation"
fi

# Generate proving and verification keys for each circuit
echo ""
echo "🔑 Generating proving and verification keys..."

for circuit in "${circuits[@]}"; do
    echo ""
    echo "Generating keys for ${circuit}..."

    # Setup
    snarkjs groth16 setup build/${circuit}.r1cs build/pot12_final.ptau build/${circuit}_0000.zkey

    # Contribute to phase 2
    snarkjs zkey contribute build/${circuit}_0000.zkey build/${circuit}_final.zkey --name="Second contribution" -e="random text" -v

    # Export verification key
    snarkjs zkey export verificationkey build/${circuit}_final.zkey build/${circuit}_verification_key.json

    # Cleanup intermediate zkey
    rm build/${circuit}_0000.zkey

    echo "✅ Keys generated for ${circuit}"
done

echo ""
echo "🎉 All circuits compiled and keys generated successfully!"
echo ""
echo "Build artifacts are in ./build/"
echo "- *.wasm: Circuit WASM files"
echo "- *_final.zkey: Proving keys"
echo "- *_verification_key.json: Verification keys"
