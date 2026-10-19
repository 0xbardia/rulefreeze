module.exports = {
  apps: [
    {
      name: "rulefreeze-web",
      cwd: "/root/X",
      script: "node_modules/next/dist/bin/next",
      args: "start -H 0.0.0.0 -p 48820",
      env: {
        NODE_ENV: "production",
        PORT: "48820",
        HOST: "0.0.0.0",
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
