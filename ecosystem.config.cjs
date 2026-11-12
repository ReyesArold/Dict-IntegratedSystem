// PM2 process definition for the DICT Abra Express + SQLite backend.
// Used by `npm run pm2:start`, `start.bat` and the Windows auto-start scripts.
module.exports = {
  apps: [
    {
      name: 'dict-abra-backend',
      script: 'server/index.js',
      cwd: __dirname,
      instances: 1,
      exec_mode: 'fork',
      autorestart: true,
      watch: false,
      env: {
        NODE_ENV: 'production',
        PORT: 5000,
        HOST: '192.168.1.235',
      },
      env_production: {
        NODE_ENV: 'production',
        PORT: 5000,
        HOST: '192.168.1.235',
      },
      log_file: './logs/dict-abra-backend.log',
      error_file: './logs/dict-abra-backend-error.log',
      out_file: './logs/dict-abra-backend-out.log',
      merge_logs: true,
      time: true,
      watch: false,
    },
  ],
};
