# Production Deployment & Operations Guide — RuleFreeze

RuleFreeze supports two production deployment environments:
1. Linux Virtual Server with PM2 (Currently active on this server).
2. Vercel Serverless Hosting.

---

## 1. Linux Server with PM2 (Current Target)

### Current Live Status
- **Host IP:** `94.156.237.122`
- **Configured Port:** `48820`
- **Binding Address:** `0.0.0.0:48820`
- **PM2 Process Name:** `rulefreeze-web`
- **Verified Local Endpoint:** `http://127.0.0.1:48820`
- **Verified Host IP Endpoint:** `http://94.156.237.122:48820` (accessible from host network)
- **External Reachability:** Nginx terminates TLS on domain `rulefreeze.bydx.fun` and reverse-proxies to `127.0.0.1:48820`.

### Standard Process Management
```bash
# View process status
pm2 show rulefreeze-web

# Inspect logs
pm2 logs rulefreeze-web --lines 50

# Restart after code or environment updates
cd /root/X
pm2 restart rulefreeze-web --update-env
```

---

## 2. Verified Rollback Procedure

Do NOT execute destructive commands such as deleting Nginx configuration (`rm /etc/nginx/...`) or deleting the PM2 process (`pm2 delete rulefreeze-web`). Those are intentional shutdown/uninstall operations, not rollbacks.

A true rollback restores the service to a prior verified working release using repository assets:

### Step-by-Step Rollback Drill
1. **Identify the target prior working revision:**
   ```bash
   cd /root/X
   git log --oneline -n 10
   # Identify prior verified commit hash or release tag (e.g. v1.0.0 / commit SHA)
   ```

2. **Restore prior working source tree:**
   ```bash
   git checkout <PREVIOUS_COMMIT_OR_TAG>
   ```

3. **Install locked dependencies cleanly:**
   ```bash
   npm ci
   ```

4. **Rebuild production artifacts:**
   ```bash
   npm run build
   ```
   *(Note: Next.js generates unique Turbopack build IDs per build run; checking out prior git commits reproduces functional compatibility and code parity, not identical numeric build hashes).*

5. **Restart application process:**
   ```bash
   pm2 restart rulefreeze-web --update-env
   ```

6. **Verify health and live endpoints:**
   ```bash
   curl -f http://127.0.0.1:48820/api/health
   curl -f http://127.0.0.1:48820/api/public-config
   curl -f https://rulefreeze.bydx.fun/api/health
   ```

---

## 3. Intentional Shutdown / Uninstall (NOT A ROLLBACK)

Only execute these commands when intentionally taking RuleFreeze permanently offline:
```bash
# Stop application process
pm2 stop rulefreeze-web

# Remove from PM2 process list (only on decommissioning)
# pm2 delete rulefreeze-web
```

---

## 2. Vercel Deployment

RuleFreeze was engineered specifically for zero-friction Vercel deployment:
- **No Writable Filesystem Dependency:** All state is persisted either on-chain (GenLayer) or client-side (browser IndexedDB).
- **Stateless Server Routes:** `/api/public-config` and `/api/health` execute within standard serverless function timeouts (< 3s).
- **No Background Indexer or PM2 Dependency:** The frontend talks directly to the GenLayer Studionet RPC and injected browser wallet.
- **Framework Compatible Environment Variables:**
  - `PUBLIC_CONTRACT_ADDRESS`: Deployed GenLayer contract address
  - `PUBLIC_GENLAYER_RPC_URL`: `https://studio.genlayer.com/api`
  - `PUBLIC_GENLAYER_CHAIN_ID`: `61999`

### Steps to Deploy to Vercel:
1. Connect repository or run `vercel` CLI with project root `X`.
2. Configure project settings:
   - Framework Preset: `Next.js`
   - Build Command: `next build`
   - Output Directory: `.next`
3. Add Environment Variables in Vercel Dashboard:
   - `PUBLIC_CONTRACT_ADDRESS` = `0x...` (your deployed contract)
   - `PUBLIC_GENLAYER_RPC_URL` = `https://studio.genlayer.com/api`
   - `PUBLIC_GENLAYER_CHAIN_ID` = `61999`
4. Deploy and verify the live deployment URL.
