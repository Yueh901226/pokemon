const fs = require('fs');
// Mock parseEvolutionDetails for testing
const parseEvolutionDetails = (det) => 'test-condition';

const fetchEvolutionChain = async (url) => {
  const response = await fetch(url);
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

  const buildPaths = (node, currentPath, currentBaseId) => {
    if (!node.evolves_to || node.evolves_to.length === 0) {
      paths.push(currentPath);
      return;
    }

    let hasEvolutionForThisBase = false;

    node.evolves_to.forEach(branch => {
      const defaultEvolvedId = getId(branch.species.url);
      
      branch.evolution_details.forEach(det => {
        const reqBaseId = det.base_form ? getId(det.base_form.url) : currentBaseId;
        const evolvedId = det.evolved_form ? getId(det.evolved_form.url) : defaultEvolvedId;

        if (reqBaseId === currentPath[currentPath.length - 1].id) {
          hasEvolutionForThisBase = true;
          const newPath = [...currentPath, {
            id: evolvedId,
            name: det.evolved_form ? det.evolved_form.name : branch.species.name,
            image: `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/${evolvedId}.png`,
            condition: parseEvolutionDetails([det])
          }];
          buildPaths(branch, newPath, currentBaseId);
        }
      });
    });

    if (!hasEvolutionForThisBase) {
      paths.push(currentPath);
    }
  };

  baseIds.forEach(baseId => {
    buildPaths(data.chain, [{
      id: baseId,
      name: data.chain.species.name,
      image: `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/${baseId}.png`,
      condition: ''
    }], baseId);
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

  return uniquePaths;
};

// Test Eevee chain
fetchEvolutionChain('https://pokeapi.co/api/v2/evolution-chain/67/').then(res => {
  console.log(JSON.stringify(res, null, 2));
});
