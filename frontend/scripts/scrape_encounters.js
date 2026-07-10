import fs from 'fs';

const DELAY_MS = 1000;
const OUTPUT_FILE = './src/assets/encounters.json';

const gameIdMap = {
  'SV': 'sv', 'S': 'sv', 'V': 'sv', 'SVT': 'sv',
  'LA': 'la',
  'BDSP': 'bdsp', 'BD': 'bdsp', 'SP': 'bdsp',
  'SWSH': 'ss', 'SWSHE': 'ss', 'SwSh': 'ss', 'Sw': 'ss', 'Sh': 'ss',
  'LPLE': 'lgpe', 'PE': 'lgpe', 'P': 'lgpe', 'E': 'lgpe',
  'ZA': 'za', 'ZAM': 'za'
};

function parseTemplateParams(line) {
  let depth = 0;
  let current = '';
  let params = [];
  line = line.replace(/^{{/, '').replace(/}}$/, '');
  for (let i = 0; i < line.length; i++) {
    if (line[i] === '[' && line[i+1] === '[') { depth++; current += '[['; i++; }
    else if (line[i] === ']' && line[i+1] === ']') { depth--; current += ']]'; i++; }
    else if (line[i] === '{' && line[i+1] === '{') { depth++; current += '{{'; i++; }
    else if (line[i] === '}' && line[i+1] === '}') { depth--; current += '}}'; i++; }
    else if (line[i] === '|' && depth === 0) { params.push(current); current = ''; }
    else { current += line[i]; }
  }
  params.push(current);
  return params;
}

function cleanLocation(loc) {
  return loc.replace(/\[\[([^\]]+)\]\]/g, (match, p1) => {
    const parts = p1.split('|');
    return parts[parts.length - 1];
  }).replace(/{{tt\|([^|]+)\|[^}]+}}/g, '$1')
    .replace(/{{[^}]+}}/g, '')
    .replace(/<[^>]+>/g, '')
    .trim();
}

async function fetchSimplifiedNames() {
  console.log('Fetching Simplified Chinese names from PokeAPI...');
  const query = `
    query {
      pokemon_v2_pokemonspecies(where: {id: {_lte: 1025}}) {
        id
        pokemon_v2_pokemonspeciesnames(where: {pokemon_v2_language: {name: {_eq: "zh-Hans"}}}) {
          name
        }
      }
    }
  `;
  const res = await fetch('https://beta.pokeapi.co/graphql/v1beta', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ query })
  });
  const data = await res.json();
  const map = {};
  for (const s of data.data.pokemon_v2_pokemonspecies) {
    if (s.pokemon_v2_pokemonspeciesnames.length > 0) {
      map[s.id] = s.pokemon_v2_pokemonspeciesnames[0].name;
    }
  }
  return map;
}

async function scrapeEncounters() {
  const zhHansNames = await fetchSimplifiedNames();
  const result = {};
  const ids = Object.keys(zhHansNames).map(Number).sort((a,b)=>a-b);
  
  console.log(`Starting to scrape ${ids.length} pokemon with ${DELAY_MS}ms delay...`);

  for (let i = 0; i < ids.length; i++) {
    const id = ids[i];
    const name = zhHansNames[id];
    if (!name) continue;

    try {
      const url = `https://wiki.52poke.com/api.php?action=query&prop=revisions&titles=${encodeURIComponent(name)}&redirects=1&rvprop=content&rvslots=main&format=json`;
      const res = await fetch(url);
      const data = await res.json();
      
      const pages = data.query?.pages;
      if (!pages) continue;
      
      const pageId = Object.keys(pages)[0];
      if (pageId === '-1') {
        console.log(`Failed on ${name} (ID: ${id}) - Not found`);
        continue;
      }

      const text = pages[pageId].revisions[0].slots.main['*'];
      
      const startIdx = text.indexOf('==获得方式==') !== -1 ? text.indexOf('==获得方式==') : text.indexOf('==獲得方式==');
      if (startIdx === -1) continue;
      
      const nextSectionIdx = text.indexOf('==', startIdx + 8);
      const obtainText = nextSectionIdx !== -1 ? text.substring(startIdx, nextSectionIdx) : text.substring(startIdx);

      const lines = obtainText.split('\n');
      const encounters = {};

      for (const line of lines) {
        if (line.includes('{{获得方式/main') || line.includes('{{Catch/main') || line.includes('{{Catch/entry')) {
          const params = parseTemplateParams(line.trim());
          const positional = params.filter(p => !p.includes('='));
          
          if (positional.length >= 6) {
            const versionAbbr = positional[3];
            const locationRaw = positional[5];
            
            if (versionAbbr && locationRaw) {
              const mappedGame = gameIdMap[versionAbbr];
              if (mappedGame) {
                if (!encounters[mappedGame]) encounters[mappedGame] = [];
                const cleanedLoc = cleanLocation(locationRaw);
                if (cleanedLoc && !encounters[mappedGame].includes(cleanedLoc)) {
                  encounters[mappedGame].push(cleanedLoc);
                }
              }
            }
          }
        }
      }
      
      if (Object.keys(encounters).length > 0) {
        result[id] = encounters;
      }

      if (i % 20 === 0) {
        console.log(`Progress: ${i}/${ids.length} (${name})`);
        fs.writeFileSync(OUTPUT_FILE, JSON.stringify(result, null, 2)); // Save progress periodically
      }

      await new Promise(r => setTimeout(r, DELAY_MS));
    } catch (e) {
      console.error(`Failed on ${name} (ID: ${id})`, e.message);
    }
  }

  fs.writeFileSync(OUTPUT_FILE, JSON.stringify(result, null, 2));
  console.log(`Scraping complete. Saved to ${OUTPUT_FILE}`);
}

scrapeEncounters();
