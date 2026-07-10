const regionalFormsMap = {}; const pokemonChineseNames = {211: '千針魚', 904: '萬針魚'}; const parseEvolutionDetails = () => ''; const cacheGet = () => null; const cacheSet = () => null; const megaEvolutionList = []; const otherdimensionPokedex = [];
const regionalFormsMap = {}; const pokemonChineseNames = {211: '千針魚', 904: '萬針魚'}; const parseEvolutionDetails = () => ''; const cacheGet = () => null; const cacheSet = () => null; const megaEvolutionList = []; const otherdimensionPokedex = [];
// LocalStorage Cache Helper
const cacheGet = (key) => {
  try {
    const item = localStorage.getItem(`pokedex_cache_${key}`);
    return item ? JSON.parse(item) : null;
  } catch (e) {
    return null;
  }
};

const cacheSet = (key, data) => {
  try {
    localStorage.setItem(`pokedex_cache_${key}`, JSON.stringify(data));
  } catch (e) {
    // If quota exceeded, clear cache and retry
    if (e.name === 'QuotaExceededError') {
      localStorage.clear();
      try {
        localStorage.setItem(`pokedex_cache_${key}`, JSON.stringify(data));
      } catch (retryError) {
        console.warn('LocalStorage is completely full, skipping cache save');
      }
    }
  }
};

const fetchAllPokemonList = async (selectedGame = 'all') => {
  const cacheKey = `all_pokemon_list_${selectedGame}_v3`;
  const cached = cacheGet(cacheKey);
  if (cached) return cached;

  try {
    // Fetch up to Generation 9 (currently 1025 Pokemon)
    const response = await fetch('https://pokeapi.co/api/v2/pokemon?limit=1025');
    const data = await response.json();
    
    const regionalMapping = regionalFormsMap[selectedGame];

    const processedList = data.results.map((p) => {
      // Extract ID from url e.g., "https://pokeapi.co/api/v2/pokemon/1/"
      const parts = p.url.split('/').filter(Boolean);
      const baseId = parseInt(parts[parts.length - 1], 10);
      
      let displayId = baseId;
      let chineseName = undefined;

      if (regionalMapping && regionalMapping.forms[baseId]) {
        displayId = regionalMapping.forms[baseId];
        chineseName = (pokemonChineseNames[baseId] || p.name) + regionalMapping.nameSuffix;
      }

      return {
        id: displayId,
        baseId: baseId,
        name: p.name,
        chineseName: chineseName,
        image: `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/${displayId}.png`,
        types: [] // Will be populated dynamically or via batch details
      };
    });

    cacheSet(cacheKey, processedList);
    return processedList;
  } catch (error) {
    console.error('Error fetching all pokemon list:', error);
    return [];
  }
};

const fetchPokemonDetails = async (idOrName) => {
  const cacheKey = `pokemon_detail_${idOrName}`;
  const cached = cacheGet(cacheKey);
  if (cached && cached.speciesId) return cached;

  try {
    const response = await fetch(`https://pokeapi.co/api/v2/pokemon/${idOrName}`);
    if (!response.ok) throw new Error('Pokemon not found');
    const data = await response.json();

    const speciesParts = data.species.url.split('/').filter(Boolean);
    const speciesId = parseInt(speciesParts[speciesParts.length - 1], 10);

    const detail = {
      id: data.id,
      name: data.name,
      speciesId: speciesId,
      image: data.sprites.other['official-artwork'].front_default || data.sprites.front_default,
      types: data.types.map(t => t.type.name),
      stats: data.stats.map(s => ({
        name: s.stat.name,
        value: s.base_stat
      })),
      height: data.height / 10, // decimeters to meters
      weight: data.weight / 10, // hectograms to kg
      abilities: data.abilities.map(a => ({
        name: a.ability.name,
        isHidden: a.is_hidden
      })),
      cries: data.cries ? (data.cries.latest || data.cries.legacy) : null
    };

    cacheSet(cacheKey, detail);
    return detail;
  } catch (error) {
    console.error(`Error fetching details for ${idOrName}:`, error);
    return null;
  }
};

const fetchPokemonSpecies = async (id) => {
  const cacheKey = `pokemon_species_${id}`;
  const cached = cacheGet(cacheKey);
  if (cached && cached.varieties) return cached;

  try {
    const response = await fetch(`https://pokeapi.co/api/v2/pokemon-species/${id}`);
    if (!response.ok) throw new Error('Pokemon species not found');
    const data = await response.json();

    // Get description
    let description = '';
    // Try to find Traditional Chinese or Simplified Chinese
    const zhHantEntry = data.flavor_text_entries.find(e => e.language.name === 'zh-Hant');
    const zhHansEntry = data.flavor_text_entries.find(e => e.language.name === 'zh-Hans');
    const enEntry = data.flavor_text_entries.find(e => e.language.name === 'en');

    if (zhHantEntry) {
      description = zhHantEntry.flavor_text;
    } else if (zhHansEntry) {
      description = zhHansEntry.flavor_text;
    } else if (enEntry) {
      description = enEntry.flavor_text;
    } else if (data.flavor_text_entries.length > 0) {
      description = data.flavor_text_entries[0].flavor_text;
    }

    // Clean up description format (remove newlines and form feeds)
    description = description.replace(/[\n\f\r]/g, ' ');

    // Get official Chinese name
    let chineseName = '';
    const zhHantNameEntry = data.names?.find(n => n.language.name === 'zh-Hant' || n.language.name === 'zh-hant');
    const zhHansNameEntry = data.names?.find(n => n.language.name === 'zh-Hans' || n.language.name === 'zh-hans');
    if (zhHantNameEntry) {
      chineseName = zhHantNameEntry.name;
    } else if (zhHansNameEntry) {
      chineseName = zhHansNameEntry.name;
    }

    const species = {
      description,
      chineseName,
      evolutionChainUrl: data.evolution_chain?.url || null,
      genera: data.genera || [],
      varieties: (data.varieties || []).map(v => {
        const parts = v.pokemon.url.split('/').filter(Boolean);
        const id = parseInt(parts[parts.length - 1], 10);
        return {
          id,
          name: v.pokemon.name,
          isDefault: v.is_default
        };
      })
    };

    cacheSet(cacheKey, species);
    return species;
  } catch (error) {
    console.error(`Error fetching species for ${id}:`, error);
    return { description: '暫無此寶可夢的詳細描述。', evolutionChainUrl: null };
  }
};

const fetchPokemonEncounters = async (id) => {
  const cacheKey = `encounters_${id}_v1`;
  const cached = cacheGet(cacheKey);
  if (cached) return cached;

  try {
    const response = await fetch(`https://pokeapi.co/api/v2/pokemon/${id}/encounters`);
    if (!response.ok) return [];
    const data = await response.json();
    cacheSet(cacheKey, data);
    return data;
  } catch (error) {
    console.error(`Error fetching encounters for ${id}:`, error);
    return [];
  }
};

const fetchEvolutionChain = async (url, selectedGame = 'all') => {
  if (!url) return null;
  const parts = url.split('/').filter(Boolean);
  const chainId = parts[parts.length - 1];
  
  // Incorporate selectedGame into cacheKey
  const cacheKey = `evolution_chain_${chainId}_${selectedGame}_v11`;
  const cached = cacheGet(cacheKey);
  if (cached) return cached;

  try {
    const response = await fetch(url);
    if (!response.ok) throw new Error('Evolution chain not found');
    const data = await response.json();

    const rootSpeciesId = parseInt(data.chain.species.url.split('/').filter(Boolean).pop());
    const baseIds = new Set([rootSpeciesId]);

    const findBaseForms = (node) => {
      if (node.evolves_to && node.evolves_to.length > 0) {
        node.evolves_to.forEach(branch => {
          branch.evolution_details.forEach(det => {
            if (det.base_form) {
              baseIds.add(parseInt(det.base_form.url.split('/').filter(Boolean).pop()));
            }
          });
          findBaseForms(branch);
        });
      }
    };
    findBaseForms(data.chain);

    const paths = [];
    const getId = (u) => parseInt(u.split('/').filter(Boolean).pop());

    const gameToVersionGroupMap = {
      'la': 'legends-arceus',
      'sv': 'scarlet-violet',
      'za': 'legends-za',
      'swsh': 'sword-shield',
      'bdsp': 'brilliant-diamond-shining-pearl',
      'lgpe': 'lets-go-pikachu-lets-go-eevee'
    };
    const targetVersionGroup = gameToVersionGroupMap[selectedGame];

    const regionalMapping = regionalFormsMap[selectedGame];
    const mapNode = (id, defaultName) => {
      if (regionalMapping && regionalMapping.forms[id]) {
        const displayId = regionalMapping.forms[id];
        const chineseName = (pokemonChineseNames[id] || defaultName) + regionalMapping.nameSuffix;
        return { displayId, name: chineseName };
      }
      return { displayId: id, name: pokemonChineseNames[id] || defaultName };
    };

    const buildPaths = (node, currentPath) => {
      if (!node.evolves_to || node.evolves_to.length === 0) {
        paths.push(currentPath);
        return;
      }

      let hasEvolutionForThisBase = false;

      node.evolves_to.forEach(branch => {
        const defaultEvolvedId = getId(branch.species.url);
        
        const validDets = branch.evolution_details.filter(det => {
          const reqBaseId = det.base_form ? getId(det.base_form.url) : currentPath[currentPath.length - 1].baseId;
          return reqBaseId === currentPath[currentPath.length - 1].baseId;
        });

        if (validDets.length > 0) {
          hasEvolutionForThisBase = true;
          
          // Group by evolvedId to handle branches, but pick the best condition for each
          const groupedByEvolved = {};
          validDets.forEach(det => {
            const evolvedId = det.evolved_form ? getId(det.evolved_form.url) : defaultEvolvedId;
            if (!groupedByEvolved[evolvedId]) groupedByEvolved[evolvedId] = [];
            groupedByEvolved[evolvedId].push(det);
          });

          for (const eId in groupedByEvolved) {
            const evolvedId = parseInt(eId);
            const dets = groupedByEvolved[eId];
            
            // Pick best det based on selected game
            let bestDet = dets[0];
            if (targetVersionGroup) {
              const matchedDet = dets.find(d => d.version_group && d.version_group.name === targetVersionGroup);
              if (matchedDet) {
                bestDet = matchedDet;
              }
            }

            const defaultName = bestDet.evolved_form ? bestDet.evolved_form.name : branch.species.name;
            const nodeMapped = mapNode(evolvedId, defaultName);

            const newPath = [...currentPath, {
              id: nodeMapped.displayId,
              baseId: evolvedId,
              name: nodeMapped.name,
              image: `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/${nodeMapped.displayId}.png`,
              condition: parseEvolutionDetails([bestDet])
            }];
            buildPaths(branch, newPath);
          }
        }
      });

      if (!hasEvolutionForThisBase) {
        paths.push(currentPath);
      }
    };

    baseIds.forEach(baseId => {
      const nodeMapped = mapNode(baseId, data.chain.species.name);
      buildPaths(data.chain, [{
        id: nodeMapped.displayId,
        baseId: baseId,
        name: nodeMapped.name,
        image: `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/${nodeMapped.displayId}.png`,
        condition: ''
      }]);
    });

    const uniquePaths = [];
    const pathSignatures = new Set();
    
    paths.forEach(p => {
      const sig = p.map(n => `${n.id}-${n.condition}`).join('|');
      if (!pathSignatures.has(sig)) {
        pathSignatures.add(sig);
        uniquePaths.push(p);
      }
    });

    cacheSet(cacheKey, uniquePaths);
    return uniquePaths;
  } catch (error) {
    console.error('Error fetching evolution chain:', error);
    return null;
  }
};

const fetchPokemonByType = async (typeName) => {
  const cacheKey = `pokemon_type_${typeName}_v2`;
  const cached = cacheGet(cacheKey);
  if (cached) return cached;

  try {
    const response = await fetch(`https://pokeapi.co/api/v2/type/${typeName}`);
    if (!response.ok) throw new Error('Type not found');
    const data = await response.json();

    const list = data.pokemon.map((p) => {
      const parts = p.pokemon.url.split('/').filter(Boolean);
      const id = parseInt(parts[parts.length - 1], 10);
      return {
        id,
        name: p.pokemon.name,
        image: `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/${id}.png`
      };
    }); // Removed filter(p => p.id <= 1025) to allow alternate forms to match types

    cacheSet(cacheKey, list);
    return list;
  } catch (error) {
    console.error(`Error fetching pokemon by type ${typeName}:`, error);
    return [];
  }
};

const fetchPokedex = async (pokedexName, selectedGame = 'all') => {
  if (pokedexName === 'mega') {
    return megaEvolutionList.map((p, index) => ({
      id: p.id,
      baseId: p.baseId,
      name: p.name,
      chineseName: p.displayName,
      entryNumber: index + 1,
      image: `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/${p.id >= 100000 ? p.baseId : p.id}.png`,
      isMega: true,
      isMockMega: p.isMockMega,
      types: p.types
    }));
  }

  if (pokedexName === 'otherdimension') {
    return otherdimensionPokedex.map((p, index) => ({
      id: p.id,
      name: p.name,
      entryNumber: index + 1,
      image: `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/${p.id}.png`
    }));
  }

  const cacheKey = `pokedex_list_${pokedexName}_${selectedGame}_v3`;
  const cached = cacheGet(cacheKey);
  if (cached) return cached;

  // Process mapping based on selectedGame
  const regionalMapping = regionalFormsMap[selectedGame];

  const mapEntry = (id, baseName, entryNumber) => {
    let displayId = id;
    let chineseName = undefined;
    let baseId = id;

    if (regionalMapping && regionalMapping.forms[id]) {
      displayId = regionalMapping.forms[id];
      chineseName = (pokemonChineseNames[id] || baseName) + regionalMapping.nameSuffix;
    }

    return {
      id: displayId,
      baseId: baseId,
      name: baseName,
      chineseName,
      entryNumber: entryNumber,
      image: `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/${displayId}.png`
    };
  };

  if (pokedexName === 'kalos') {
    try {
      const parts = ['kalos-central', 'kalos-coastal', 'kalos-mountain'];
      const promises = parts.map(name => fetch(`https://pokeapi.co/api/v2/pokedex/${name}`).then(res => res.json()));
      const results = await Promise.all(promises);
      
      const mergedMap = new Map();
      let index = 1;

      results.forEach(data => {
        data.pokemon_entries.forEach(entry => {
          const parts = entry.pokemon_species.url.split('/').filter(Boolean);
          const id = parseInt(parts[parts.length - 1], 10);
          if (id <= 1025 && !mergedMap.has(id)) {
            mergedMap.set(id, mapEntry(id, entry.pokemon_species.name, index++));
          }
        });
      });

      const list = Array.from(mergedMap.values());
      cacheSet(cacheKey, list);
      return list;
    } catch (error) {
      console.error('Error fetching merged Kalos pokedex:', error);
      return [];
    }
  }

  try {
    const response = await fetch(`https://pokeapi.co/api/v2/pokedex/${pokedexName}`);
    if (!response.ok) throw new Error('Pokedex not found');
    const data = await response.json();

    const list = data.pokemon_entries.map((entry) => {
      const parts = entry.pokemon_species.url.split('/').filter(Boolean);
      const id = parseInt(parts[parts.length - 1], 10);
      return mapEntry(id, entry.pokemon_species.name, entry.entry_number);
    }).filter(p => p.baseId <= 1025);

    cacheSet(cacheKey, list);
    return list;
  } catch (error) {
    console.error(`Error fetching pokedex ${pokedexName}:`, error);
    return [];
  }
};

fetchEvolutionChain('https://pokeapi.co/api/v2/evolution-chain/106/').then(console.log);