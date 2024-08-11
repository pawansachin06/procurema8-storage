module.exports = {
  apps: [
    {
      name: 'pro8-storage',
      script: './index.js',
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: '500M',
      port: "3011",
    }
  ]
}
