import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { execSync } from 'child_process';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const distDir = path.join(__dirname, 'dist');
const assetsDir = path.join(distDir, 'assets');

console.log('Starting custom Vite build for single HTML file output...');
try {
  // Execute custom build utilizing IIFE rollup format config
  execSync('npx vite build --config vite.single.config.js', { stdio: 'inherit', cwd: __dirname });
  console.log('Build completed successfully.');
} catch (error) {
  console.error('Build execution failed:', error.message);
  process.exit(1);
}

// 1. Read index.html
let html = fs.readFileSync(path.join(distDir, 'index.html'), 'utf8');

// 2. Find and inline JS (which contains the bundled CSS)
const jsPath = path.join(assetsDir, 'index.js');
if (fs.existsSync(jsPath)) {
  let jsContent = fs.readFileSync(jsPath, 'utf8');
  
  // Remove the script tag from the <head> (because classic inline scripts execute synchronously
  // and we must wait for <div id="app"> to exist in the DOM).
  const jsRegex = /<script type="module"[^>]*src="\/assets\/index\.js"><\/script>/;
  html = html.replace(jsRegex, '');
  
  // Inline the script right before </body> so the DOM is fully loaded before execution!
  html = html.replace('</body>', `<script>${jsContent}</script></body>`);
  console.log(`Inlined IIFE JS at the bottom of <body>: index.js`);
} else {
  console.error(`JS file not found at: ${jsPath}`);
  process.exit(1);
}

// 3. Save to a single html file in the workspace root or dist
const outputPath = path.join(distDir, 'pokemon-pokedex-single.html');
fs.writeFileSync(outputPath, html, 'utf8');
console.log(`Successfully generated single HTML file: ${outputPath}`);

// Also copy it to the parent directory (project root) so the user can easily find it!
const rootOutputPath = path.resolve(__dirname, '..', 'pokemon-pokedex.html');
fs.writeFileSync(rootOutputPath, html, 'utf8');
console.log(`Successfully copied single HTML file to project root: ${rootOutputPath}`);
