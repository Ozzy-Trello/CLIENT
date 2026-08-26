// Canonical PM2 config for the production client.
// The deploy script drives it via OZZY_CLIENT_CWD / OZZY_CLIENT_PORT so the
// same definition serves both blue and green instances (ozzy-client-<port>).
const cwd = process.env.OZZY_CLIENT_CWD || __dirname;
const port = process.env.OZZY_CLIENT_PORT || "3300";

module.exports = {
  apps: [
    {
      name: `ozzy-client-${port}`,
      cwd,
      script: "npm",
      args: `run start -- -p ${port}`,
      env: {
        NODE_ENV: "production",
        PORT: port,
      },
      max_memory_restart: "1G",
      kill_timeout: 10000,
    },
  ],
};
