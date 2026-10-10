// Sestaví hru do jediného HTML souboru (funguje i po dvojkliku bez serveru).
import { build } from 'esbuild';
import { readFileSync, writeFileSync, mkdirSync } from 'fs';

const res = await build({
  entryPoints: ['src/main.js'], bundle: true, minify: true, format: 'iife', write: false, target: 'es2020',
  loader: { '.webm': 'base64', '.jpg': 'base64' },
});
const js = res.outputFiles[0].text.replace(/<\/script/g, '<\\/script');
const html = readFileSync('src/index.html', 'utf8').replace('<script type="module" src="./main.js"></script>', () => `<script>${js}</script>`);
mkdirSync('dist', { recursive: true });
writeFileSync('dist/index.html', html);
console.log('dist/index.html', (html.length / 1024).toFixed(0) + ' kB');

// Varianta pro Claude Artifact: bez vlastního <html>/<head>/<body>, obal doplní platforma.
const head = html.match(/<head>([\s\S]*?)<\/head>/)[1].replace(/<meta[^>]*>\s*/g, '');
const body = html.match(/<body>([\s\S]*)<\/body>/)[1];
if (process.env.ARTIFACT_OUT) writeFileSync(process.env.ARTIFACT_OUT, head + body);
