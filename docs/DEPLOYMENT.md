# Production Deployment Guide — RuleFreeze

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
- **External Reachability Blocker:** The host UFW firewall default incoming policy is `DROP/DENY` (`ufw status verbose`). Ports `22`, `80`, `443`, and project subdomains on Nginx are explicitly permitted. Port `48820` is blocked to external public internet traffic by host UFW firewall rules. (Per prompt instructions: *"Do not open firewall ports or change network security configuration without authorization"*).

### Managing the PM2 Process
```bash
# View process status
pm2 show rulefreeze-web

# Inspect logs
pm2 logs rulefreeze-web --lines 50

# Restart after code or environment updates
cd /root/X
pm2 restart rulefreeze-web --update-env

# Stop process
pm2 stop rulefreeze-web
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
