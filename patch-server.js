import fs from 'fs';
let code = fs.readFileSync('src/server.ts', 'utf8');

code = code.replace(
  "import { streamPatterns } from './streamPatterns.js';",
  "import { streamPatterns } from './streamPatterns.js';\nimport { configure as configureKaizoku } from 'kaizoku-core';"
);

const injectPoint = "async function main() {";
code = code.replace(
  injectPoint,
  injectPoint + "\n    configureKaizoku({ tmdbApiKey: (getEnv('TMDB_API_KEY') && getEnv('TMDB_API_KEY') !== 'your_tmdb_api_key_here') ? getEnv('TMDB_API_KEY') : 'fake_key' });"
);

fs.writeFileSync('src/server.ts', code);
