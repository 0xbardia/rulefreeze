module.exports = {
  apps: [
    {
      name: "rulefreeze-web",
      cwd: "/root/X",
      script: "node_modules/next/dist/bin/next",
      args: "start -H 127.0.0.1 -p 48820",
      env: {
        NODE_ENV: "production",
        PORT: "48820",
        HOST: "127.0.0.1",
        PUBLIC_CONTRACT_ADDRESS: "0xeAaF5090d59d5fBf1D32a07A30D866E3469CF826",
        PUBLIC_GENLAYER_RPC_URL: "https://studio.genlayer.com/api",
        PUBLIC_GENLAYER_CHAIN_ID: "61999",
      },
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: "500M",
    },
  ],
};
