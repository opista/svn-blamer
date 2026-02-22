module.exports = {
    "*.{js,ts,mts,cts,jsx,tsx,mjs,cjs}": [
        "eslint --fix",
        "prettier --cache --write --ignore-unknown",
    ],
    "*.{json,md,yml,yaml}": "prettier --cache --write --ignore-unknown",
    "*.{ts,mts,cts,tsx}": () => "tsc --noEmit -p tsconfig.lint.json"
};
