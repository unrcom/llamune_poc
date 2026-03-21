module.exports = {
  apps: [
    {
      name: 'poc-front-1',
      script: 'npm',
      args: 'run dev -- --port 5173 --host',
      cwd: '/Users/mini/dev/llamune_poc/web',
      out_file: '/Users/mini/dev/llamune_poc/logs/poc-front-1.log',
      error_file: '/Users/mini/dev/llamune_poc/logs/poc-front-1.log',
      merge_logs: true,
    },
    {
      name: 'poc-front-2',
      script: 'npm',
      args: 'run dev -- --port 5174 --host',
      cwd: '/Users/mini/dev/llamune_poc/web',
      out_file: '/Users/mini/dev/llamune_poc/logs/poc-front-2.log',
      error_file: '/Users/mini/dev/llamune_poc/logs/poc-front-2.log',
      merge_logs: true,
    },
  ]
}
