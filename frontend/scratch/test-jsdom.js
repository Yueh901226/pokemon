import { JSDOM, VirtualConsole } from 'jsdom';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const htmlPath = path.resolve(__dirname, '..', '..', 'pokemon-pokedex.html');
const htmlContent = fs.readFileSync(htmlPath, 'utf8');

const virtualConsole = new VirtualConsole();
virtualConsole.on("error", (err) => {
  console.error("JSDOM Error:", err);
});
virtualConsole.on("warn", (warn) => {
  console.warn("JSDOM Warning:", warn);
});
virtualConsole.on("log", (log) => {
  console.log("JSDOM Log:", log);
});

console.log("Loading HTML in JSDOM...");
const dom = new JSDOM(htmlContent, {
  runScripts: "dangerously",
  resources: "usable",
  url: "file:///C:/Users/tikus/Desktop/pokemon/pokemon-pokedex.html",
  virtualConsole
});

// Wait a second for script execution
setTimeout(() => {
  console.log("HTML Body after 1s:", dom.window.document.body.innerHTML);
}, 1000);
