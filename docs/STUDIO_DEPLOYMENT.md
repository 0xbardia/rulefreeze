# Manual GenLayer Studio Deployment Guide

This guide walks you through deploying the canonical RuleFreeze contract on GenLayer Studionet.

---

## 1. Canonical Source File & Checksum

- **Source File Path:** `X/contracts/main.py`
- **SHA-256 Source Checksum (current `contracts/main.py`, contract 1.0.1):**
  ```
  f3b8b9ef09dd21755435e2bc55b5d0db84af5b93348c6655ea7ee9d520cc8177
  ```
- **Historical source** for `0xC8a83C62da126891aB8F60e6D5E171480aE91c23` was `42cc031d0ba76e704e0b67c2df366139104e860fc41c71d79df082738d0e0396`. Do not treat that address as a deployment of the current file.
- **Constructor Arguments:** None (`__init__()` has zero arguments).
- **Identifiers:** contract `1.0.1`, schema `2`, evaluation policy `rulefreeze-eval-v1.1`.
- **Studionet deployment of this source:** `0xeAaF5090d59d5fBf1D32a07A30D866E3469CF826`, transaction `0xed921c7720ba1c5bbf0d603a49d225f60100e654bf6a1018ede9792f311fef5f`. The historical contract `0xC8a83C62da126891aB8F60e6D5E171480aE91c23` remains the 1.0.0 deployment.

---

## 2. Step-by-Step Deployment Instructions

1. **Open GenLayer Studio:**
   Navigate to [https://studio.genlayer.com](https://studio.genlayer.com) in a Web3-compatible browser with MetaMask or Rabby installed.

2. **Connect Wallet:**
   Connect your wallet to GenLayer Studionet.
   - Network Name: `GenLayer Studionet`
   - RPC URL: `https://studio.genlayer.com/api`
   - Chain ID: `61999` (hex: `0xf22f`)
   - Currency Symbol: `GEN`

3. **Create Contract File:**
   - In the Studio file explorer, click **New Contract** or create `main.py`.
   - Copy the entire contents of `/root/X/contracts/main.py` and paste them into the editor.
   - Ensure the dependency header is intact at the top:
     `# { "Depends": "py-genlayer:1jb45aa8ynh2a9c9xn3b7qqh8sm5q93hwfp7jqmwsfhh8jpz09h6" }`

4. **Compile:**
   Click **Compile** in the Studio interface. Verify that compilation succeeds with zero errors.

5. **Deploy:**
   - Click **Deploy Contract**.
   - Confirm constructor arguments: none required.
   - Confirm transaction in your wallet. (Studionet is gasless; gas fee is 0 GEN).
   - Wait for consensus confirmation.

6. **Copy Deployed Contract Address:**
   Once confirmed, copy the resulting 20-byte hex address (e.g. `0x1a2b...`).

---

## 3. Configuring RuleFreeze Frontend

After obtaining your deployed contract address:

1. **Set Environment Variable:**
   Edit `/root/X/.env` or export in shell:
   ```bash
   PUBLIC_CONTRACT_ADDRESS="0xYourDeployedAddressHere"
   ```

2. **Restart Application:**
   ```bash
   cd /root/X
   pm2 restart rulefreeze-web --update-env
   ```

3. **Verify in Browser:**
   Visit `http://94.156.237.122:48820/diagnostics` (or `http://127.0.0.1:48820/diagnostics`).
   - Confirm the contract status shows **CONFIGURED (LIVE)**.
   - Confirm `get_policy()` and `get_event_count()` return data successfully.
