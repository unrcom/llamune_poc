module.exports = {
  apps: [
    {
      name: 'poc-back-1',
      script: '/Users/mini/dev/llamune_poc/start.sh',
      interpreter: '/bin/bash',
      cwd: '/Users/mini/dev/llamune_poc',
      out_file: '/Users/mini/dev/llamune_poc/logs/poc-back-1.log',
      error_file: '/Users/mini/dev/llamune_poc/logs/poc-back-1.log',
      merge_logs: true,
      env: {
        INSTANCE_ID_ARG: 'poc-back-1',
        PORT: '8000',
      },
    },
  ]
}
