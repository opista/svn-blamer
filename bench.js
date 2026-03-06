const { performance } = require('perf_hooks');

const EXTENSION_NAME = 'SVN Blame';
const message = 'Fetching log for revision #12345';
const icon = 'loading~spin';

function original(message, icon) {
    const text = [icon ? `$(${icon})` : "", `${EXTENSION_NAME}:`, message];
    return text.filter(Boolean).join(" ");
}

function optimized(message, icon) {
    return `${icon ? `$(${icon}) ` : ""}${EXTENSION_NAME}: ${message}`;
}

const iterations = 1000000;

let start = performance.now();
for (let i = 0; i < iterations; i++) {
    original(message, icon);
    original(message, undefined);
}
const originalTime = performance.now() - start;

start = performance.now();
for (let i = 0; i < iterations; i++) {
    optimized(message, icon);
    optimized(message, undefined);
}
const optimizedTime = performance.now() - start;

console.log(`Original: ${originalTime.toFixed(2)}ms`);
console.log(`Optimized: ${optimizedTime.toFixed(2)}ms`);
console.log(`Improvement: ${((originalTime - optimizedTime) / originalTime * 100).toFixed(2)}%`);
