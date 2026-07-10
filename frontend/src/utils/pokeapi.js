import { megaEvolutionList, parseEvolutionDetails, regionalFormsMap } from './helpers';
import { otherdimensionPokedex, pokemonChineseNames } from './pokemonNames';

const regionalInsertions = {
  20: [10091, 10092],
  26: [10100],
  28: [10101, 10102],
  38: [10103, 10104],
  51: [10105, 10106],
  53: [10107, 10108, 10161, 863],
  59: [10229, 10230],
  76: [10109, 10110, 10111],
  78: [10162, 10163],
  80: [10164, 10165],
  83: [10166, 865],
  89: [10112, 10113],
  101: [10231, 10232],
  103: [10114],
  105: [10115],
  110: [10167],
  122: [10168, 866],
  128: [10250, 10251, 10252],
  146: [10169, 10170, 10171],
  157: [10233],
  195: [10253, 980],
  199: [10172],
  211: [10234, 904],
  215: [10235, 903],
  222: [10173, 864],
  264: [10174, 10175, 862],
  503: [10236],
  549: [10237],
  550: [10247, 902],
  555: [10176, 10177, 10178],
  562: [10179, 867],
  571: [10238, 10239],
  618: [10180],
  628: [10240],
  706: [10241, 10242],
  713: [10243],
  724: [10244],
};

const movedEvolutions = new Set([862, 863, 864, 865, 866, 867, 902, 903, 904, 980]);

const createRegionalEntry = (id, baseId) => {
  if (pokemonChineseNames[id]) {
    return {
      id: id,
      baseId: baseId,
      name: `pokemon-${id}`,
      chineseName: pokemonChineseNames[id],
      image: `https://cdn.jsdelivr.net/gh/PokeAPI/sprites@master/sprites/pokemon/other/official-artwork/${id}.png`
    };
  }

  let suffix = '';
  for (const game in regionalFormsMap) {
    const mapping = regionalFormsMap[game];
    for (const bid in mapping.forms) {
      if (mapping.forms[bid] === id) {
        suffix = mapping.nameSuffix;
        break;
      }
    }
    if (suffix) break;
  }

  const baseName = pokemonChineseNames[baseId] || '';
  const chineseName = baseName ? (baseName + suffix) : undefined;
  
  return {
    id: id,
    baseId: baseId,
    name: `pokemon-${id}`,
    chineseName: chineseName,
    image: `https://cdn.jsdelivr.net/gh/PokeAPI/sprites@master/sprites/pokemon/other/official-artwork/${id}.png`
  };
};

const isFormAllowedInGame = (id, selectedGame) => {
  if (selectedGame === 'all') return true;
  if (selectedGame === 'bdsp') return false;

  const uniqueEvolutionGames = {
    862: ['ss', 'sv'], // Obstagoon
    863: ['ss', 'sv'], // Perrserker
    864: ['ss', 'sv'], // Cursola
    865: ['ss', 'sv'], // Sirfetch'd
    866: ['ss', 'sv'], // Mr. Rime
    867: ['ss', 'sv'], // Runerigus
    902: ['la', 'sv'], // Basculegion
    903: ['la', 'sv'], // Sneasler
    904: ['la', 'sv', 'za'], // Overqwil
    980: ['sv'] // Clodsire
  };

  if (uniqueEvolutionGames[id]) {
    return uniqueEvolutionGames[id].includes(selectedGame);
  }

  if (id < 10000) return true;

  const isAlolan = id >= 10091 && id <= 10115;
  const isGalarian = id >= 10161 && id <= 10180;
  const isHisuian = (id >= 10229 && id <= 10244) || id === 10247;
  const isPaldean = id >= 10250 && id <= 10253;

  if (selectedGame === 'la') {
    return isHisuian || id === 10103 || id === 10104;
  }
  if (selectedGame === 'ss') {
    return isGalarian || isAlolan;
  }
  if (selectedGame === 'lgpe') {
    return isAlolan;
  }
  if (selectedGame === 'sv') {
    return isAlolan || isGalarian || isHisuian || isPaldean;
  }
  return true;
};

const organizePokedexList = (list, selectedGame) => {
  if (selectedGame === 'bdsp') {
    return list;
  }

  const itemMap = {};
  list.forEach(p => {
    itemMap[p.id] = p;
  });

  const newList = [];
  list.forEach(p => {
    if (movedEvolutions.has(p.id)) {
      return;
    }

    newList.push(p);

    const lookupKey = p.baseId || p.id;
    if (regionalInsertions[lookupKey]) {
      const inserts = regionalInsertions[lookupKey];
      inserts.forEach(insertId => {
        if (insertId === p.id) {
          return;
        }

        if (!isFormAllowedInGame(insertId, selectedGame)) {
          return;
        }

        if (itemMap[insertId]) {
          if (movedEvolutions.has(insertId)) {
            newList.push(itemMap[insertId]);
          }
        } else {
          let baseId = lookupKey;
          for (const game in regionalFormsMap) {
            const mapping = regionalFormsMap[game];
            for (const bid in mapping.forms) {
              if (mapping.forms[bid] === insertId) {
                baseId = parseInt(bid);
                break;
              }
            }
          }
          const entry = createRegionalEntry(insertId, baseId);
          entry.entryNumber = (itemMap[baseId] && itemMap[baseId].entryNumber !== undefined)
            ? itemMap[baseId].entryNumber
            : p.entryNumber;
          newList.push(entry);
        }
      });
    }
  });

  return newList;
};

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

export const fetchAllPokemonList = async (selectedGame = 'all') => {
  const cacheKey = `all_pokemon_list_${selectedGame}_v14`;
  const cached = cacheGet(cacheKey);
  if (cached) return cached;

  try {
    // Fetch up to Generation 9 (currently 1025 Pokemon)
    const response = await fetch('https://pokeapi.co/api/v2/pokemon?limit=1025');
    const data = await response.json();
    
    const regionalMapping = regionalFormsMap[selectedGame];

    let processedList = data.results.map((p) => {
      // Extract ID from url e.g., "https://pokeapi.co/api/v2/pokemon/1/"
      const parts = p.url.split('/').filter(Boolean);
      const baseId = parseInt(parts[parts.length - 1], 10);
      
      let displayId = baseId;
      let chineseName = undefined;

      if (regionalMapping && regionalMapping.forms[baseId]) {
        displayId = regionalMapping.forms[baseId];
        chineseName = pokemonChineseNames[displayId] || ((pokemonChineseNames[baseId] || p.name) + regionalMapping.nameSuffix);
      }

      return {
        id: displayId,
        baseId: baseId,
        name: p.name,
        chineseName: chineseName,
        image: `https://cdn.jsdelivr.net/gh/PokeAPI/sprites@master/sprites/pokemon/other/official-artwork/${displayId}.png`,
        types: [] // Will be populated dynamically or via batch details
      };
    });

    processedList = organizePokedexList(processedList, selectedGame);

    cacheSet(cacheKey, processedList);
    return processedList;
  } catch (error) {
    console.error('Error fetching all pokemon list:', error);
    return [];
  }
};

export const fetchPokemonDetails = async (idOrName) => {
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

export const fetchPokemonSpecies = async (id) => {
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

export const fetchPokemonEncounters = async (id) => {
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

export const fetchEvolutionChain = async (url, selectedGame = 'all') => {
  if (!url) return null;
  const parts = url.split('/').filter(Boolean);
  const chainId = parts[parts.length - 1];
  
  // Incorporate selectedGame into cacheKey
  const cacheKey = `evolution_chain_${chainId}_${selectedGame}_v18`;
  const cached = cacheGet(cacheKey);
  if (cached) return cached;

  try {
    const response = await fetch(url);
    if (!response.ok) throw new Error('Evolution chain not found');
    const data = await response.json();

    const rootSpeciesId = parseInt(data.chain.species.url.split('/').filter(Boolean).pop());
    const baseIds = new Set([rootSpeciesId]);
    const evolvedIds = new Set();

    const findBaseForms = (node) => {
      if (node.evolves_to && node.evolves_to.length > 0) {
        node.evolves_to.forEach(branch => {
          branch.evolution_details.forEach(det => {
            if (det.base_form) {
              baseIds.add(parseInt(det.base_form.url.split('/').filter(Boolean).pop()));
            }
            if (det.evolved_form) {
              evolvedIds.add(parseInt(det.evolved_form.url.split('/').filter(Boolean).pop()));
            }
          });
          findBaseForms(branch);
        });
      }
    };
    findBaseForms(data.chain);

    evolvedIds.forEach(id => {
      baseIds.delete(id);
    });

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

    const getPokemonDisplayName = (id, defaultName) => {
      if (pokemonChineseNames[id]) return pokemonChineseNames[id];
      for (const game in regionalFormsMap) {
        const mapping = regionalFormsMap[game];
        for (const baseId in mapping.forms) {
          if (mapping.forms[baseId] === id) {
            return (pokemonChineseNames[baseId] || defaultName) + mapping.nameSuffix;
          }
        }
      }
      return defaultName;
    };

    const mapNode = (id, defaultName) => {
      return { displayId: id, name: getPokemonDisplayName(id, defaultName) };
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

            let condition = parseEvolutionDetails([bestDet]);
            const forbiddenZAIds = [10168, 10100, 10241, 10243]; // Galarian Mr. Mime, Alolan Raichu, Hisuian Sliggoo, Hisuian Avalugg
            if (selectedGame === 'za' && forbiddenZAIds.includes(evolvedId)) {
              condition = 'ZA禁止進化';
            } else {
              const hasRegionEvolution = node.evolves_to.some(b => 
                b.evolution_details.some(det => det.region !== null && det.region !== undefined)
              );
              if (hasRegionEvolution) {
                if (bestDet.region) {
                  const regionMap = {
                    'kanto': '關都', 'johto': '城都', 'hoenn': '豐緣', 'sinnoh': '神奧',
                    'unova': '合眾', 'kalos': '卡洛斯', 'alola': '阿羅拉', 'galar': '伽勒爾',
                    'hisui': '洗翠', 'paldea': '帕底亞'
                  };
                  const rName = regionMap[bestDet.region.name] || bestDet.region.name;
                  condition += ` (在${rName}地區)`;
                } else {
                  condition += ' (在其他地區)';
                }
              }
            }

            const newPath = [...currentPath, {
              id: nodeMapped.displayId,
              baseId: evolvedId,
              name: nodeMapped.name,
              image: `https://cdn.jsdelivr.net/gh/PokeAPI/sprites@master/sprites/pokemon/other/official-artwork/${nodeMapped.displayId}.png`,
              condition: condition
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
        image: `https://cdn.jsdelivr.net/gh/PokeAPI/sprites@master/sprites/pokemon/other/official-artwork/${nodeMapped.displayId}.png`,
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

    const allBaseIdsInPaths = new Set();
    uniquePaths.forEach(p => p.forEach(n => allBaseIdsInPaths.add(n.baseId)));
    
    const speciesMap = {};
    await Promise.all(Array.from(allBaseIdsInPaths).map(async (id) => {
      if (id < 10000) {
        speciesMap[id] = await fetchPokemonSpecies(id);
      }
    }));

    const finalPaths = [];
    uniquePaths.forEach(p => {
      finalPaths.push(p);

      p.forEach((node) => {
        const speciesData = speciesMap[node.baseId];
        if (speciesData && speciesData.varieties) {
          speciesData.varieties.forEach(v => {
            const vName = v.name;
            let condition = '';
            if (vName.includes('-mega')) {
              condition = '超級進化';
            } else if (vName.includes('-gmax')) {
              condition = '超極巨化';
            } else if (vName.includes('-primal')) {
              condition = '原始回歸';
            }

            if (condition) {
              const specialId = v.id;
              
              let displayName = '';
              const baseChineseName = pokemonChineseNames[node.baseId] || vName.split('-')[0];
              if (vName.endsWith('-mega-x')) {
                displayName = `超級${baseChineseName} X`;
              } else if (vName.endsWith('-mega-y')) {
                displayName = `超級${baseChineseName} Y`;
              } else if (vName.includes('-mega')) {
                displayName = `超級${baseChineseName}`;
              } else if (vName.includes('-gmax')) {
                displayName = `超極巨化${baseChineseName}`;
              } else if (vName.includes('-primal')) {
                displayName = `原始回歸${baseChineseName}`;
              } else {
                displayName = getPokemonDisplayName(specialId, vName);
              }

              const newPath = [
                node,
                {
                  id: specialId,
                  baseId: node.baseId,
                  name: displayName,
                  image: `https://cdn.jsdelivr.net/gh/PokeAPI/sprites@master/sprites/pokemon/other/official-artwork/${specialId}.png`,
                  condition: condition
                }
              ];
              
              finalPaths.push(newPath);
            }
          });
        }
      });
    });

    const finalUniquePaths = [];
    const finalSignatures = new Set();
    finalPaths.forEach(p => {
      const sig = p.map(n => `${n.id}-${n.condition}`).join('|');
      if (!finalSignatures.has(sig)) {
        finalSignatures.add(sig);
        finalUniquePaths.push(p);
      }
    });

    // Incorporate selectedGame into cacheKey for v13
    cacheSet(cacheKey, finalUniquePaths);
    return finalUniquePaths;
  } catch (error) {
    console.error('Error fetching evolution chain:', error);
    return null;
  }
};

export const fetchPokemonByType = async (typeName) => {
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
        image: `https://cdn.jsdelivr.net/gh/PokeAPI/sprites@master/sprites/pokemon/other/official-artwork/${id}.png`
      };
    }); // Removed filter(p => p.id <= 1025) to allow alternate forms to match types

    cacheSet(cacheKey, list);
    return list;
  } catch (error) {
    console.error(`Error fetching pokemon by type ${typeName}:`, error);
    return [];
  }
};

export const fetchPokedex = async (pokedexName, selectedGame = 'all') => {
  if (pokedexName === 'mega') {
    return megaEvolutionList.map((p, index) => ({
      id: p.id,
      baseId: p.baseId,
      name: p.name,
      chineseName: p.displayName,
      entryNumber: index + 1,
      image: `https://cdn.jsdelivr.net/gh/PokeAPI/sprites@master/sprites/pokemon/other/official-artwork/${p.id >= 100000 ? p.baseId : p.id}.png`,
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
      image: `https://cdn.jsdelivr.net/gh/PokeAPI/sprites@master/sprites/pokemon/other/official-artwork/${p.id}.png`
    }));
  }

  const cacheKey = `pokedex_list_${pokedexName}_${selectedGame}_v14`;
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
      chineseName = pokemonChineseNames[displayId] || ((pokemonChineseNames[id] || baseName) + regionalMapping.nameSuffix);
    }

    return {
      id: displayId,
      baseId: baseId,
      name: baseName,
      chineseName,
      entryNumber: entryNumber,
      image: `https://cdn.jsdelivr.net/gh/PokeAPI/sprites@master/sprites/pokemon/other/official-artwork/${displayId}.png`
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

      let list = Array.from(mergedMap.values());
      list = organizePokedexList(list, selectedGame);
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

    let list = data.pokemon_entries.map((entry) => {
      const parts = entry.pokemon_species.url.split('/').filter(Boolean);
      const id = parseInt(parts[parts.length - 1], 10);
      return mapEntry(id, entry.pokemon_species.name, entry.entry_number);
    }).filter(p => p.baseId <= 1025);

    list = organizePokedexList(list, selectedGame);

    cacheSet(cacheKey, list);
    return list;
  } catch (error) {
    console.error(`Error fetching pokedex ${pokedexName}:`, error);
    return [];
  }
};
