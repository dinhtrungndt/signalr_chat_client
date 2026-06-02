const { spawnSync } = require('child_process');

const shouldObfuscate = process.env.ENABLE_OBFUSCATION === 'true';

if (!shouldObfuscate) {
    console.log('[postbuild] Skip obfuscation. Set ENABLE_OBFUSCATION=true to enable.');
    process.exit(0);
}

const commandArgs = [
    'javascript-obfuscator',
    'build/static/js',
    '--output',
    'build/static/js',
    '--compact',
    'true',
    '--string-array',
    'true',
    '--string-array-encoding',
    'rc4',
    '--target',
    'browser'
];

const result = spawnSync('npx', commandArgs, {
    stdio: 'inherit',
    shell: true
});

if (result.status !== 0) {
    console.error('[postbuild] Obfuscation failed. Build artifacts remain unobfuscated.');
    process.exit(result.status || 1);
}