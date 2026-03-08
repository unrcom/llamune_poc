module.exports = {
  apps: [{
    name: 'llamune_poc',
    script: '/Users/mini/dev/llamune_poc/start.sh',
    interpreter: '/bin/bash',
    cwd: '/Users/mini/dev/llamune_poc',
    out_file: '/Users/mini/dev/llamune_poc/logs/poc.log',
    error_file: '/Users/mini/dev/llamune_poc/logs/poc.log',
    merge_logs: true,
  }]
}
