# Excalidraw Flow Diagram Instructions

## Quick Setup

1. Go to https://excalidraw.com
2. Click "Open" → "Load from file"
3. Upload `EXCALIDRAW_FLOW.excalidraw`

## Manual Recreation

If the file doesn't load, recreate using these steps:

### Upload Flow (Vertical)

1. **User Uploads File** (Blue box, top)
   - Position: (100, 50)
   - Size: 200x80
   - Color: Light blue (#a5d8ff)

2. **Create Merkle Commitment** (Yellow box)
   - Position: (100, 170)
   - Size: 200x60
   - Color: Yellow (#ffd43b)
   - Arrow from User Upload

3. **Seal Encryption + Policy** (Blue box)
   - Position: (100, 270)
   - Size: 200x60
   - Color: Light blue (#74c0fc)
   - Arrow from Merkle

4. **Upload to Walrus - Get Blob ID** (Green box)
   - Position: (100, 370)
   - Size: 200x60
   - Color: Green (#51cf66)
   - Arrow from Seal

5. **Create On-Chain Receipt (Sui)** (Red box, bottom)
   - Position: (100, 470)
   - Size: 200x60
   - Color: Red (#ff8787)
   - Arrow from Walrus

### Verification Flow (Right Side)

1. **User Provides Proof** (400, 50)
2. **Parse & Validate** (400, 150)
3. **Verify ZK Proof** (400, 250)
4. **Fetch from Walrus** (400, 350)
5. **Decrypt with Seal** (400, 450)
6. **Display Content** (400, 550)

### Transaction Building (Left Side)

1. **Collect Data** (-200, 200)
2. **Validate Inputs** (-200, 300)
3. **Create Transaction** (-200, 400)
4. **Serialize Arguments** (-200, 500)
5. **Build moveCall** (-200, 600)
6. **Return Transaction** (-200, 700)

## Color Scheme

- **User Actions**: Light Blue (#a5d8ff)
- **ZK Operations**: Yellow (#ffd43b)
- **Encryption**: Blue (#74c0fc)
- **Storage**: Green (#51cf66)
- **Blockchain**: Red (#ff8787)
- **Validation**: Orange (#ffa94d)

## Text Labels

Use 16-20px font size, centered text in each box.

## Arrows

- Use solid arrows pointing downward for main flow
- Use dashed arrows for data dependencies
- Label arrows with action names if needed

