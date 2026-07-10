<script setup>
import { ref, computed, onMounted, onUnmounted, watch, nextTick } from 'vue';
import { fetchAllPokemonList, fetchPokemonByType, fetchPokedex } from './utils/pokeapi';
import { capitalize, generations, gamePokedexConfig } from './utils/helpers';
import { pokemonChineseNames } from './utils/pokemonNames';
import Header from './components/Header.vue';
import PokemonCard from './components/PokemonCard.vue';
import DetailModal from './components/DetailModal.vue';
import Loader from './components/Loader.vue';

// State Management
const masterPokemonList = ref([]);
const typeFilteredList = ref(null);
const displayedList = ref([]);
const loading = ref(true);
const loadingMore = ref(false);

const searchQuery = ref('');
const selectedType = ref(localStorage.getItem('pokedex_selected_type') || '');
const selectedType2 = ref(localStorage.getItem('pokedex_selected_type2') || '');
const selectedGen = ref(localStorage.getItem('pokedex_selected_gen') || 'all');
const sortBy = ref(localStorage.getItem('pokedex_selected_sort') || 'id-asc');
const showFavoritesOnly = ref(localStorage.getItem('pokedex_selected_favorites') === 'true');

// Game and Pokedex Filter state
const selectedGame = ref(localStorage.getItem('pokedex_selected_game') || 'all');
const selectedPokedex = ref(localStorage.getItem('pokedex_selected_pokedex') || 'national');
const activePokedexList = ref(null);

const favorites = ref(new Set());
const caught = ref({});
const showUncaughtOnly = ref(false);
const selectedPokemonId = ref(null);
const theme = ref('dark');

// Zoom compensation: keep header fixed when user uses Ctrl+scroll / Ctrl+/-
// On desktop, visualViewport.scale is always 1. Correct method: devicePixelRatio / initialDPR
const initialDPR = window.devicePixelRatio || 1;
const zoomScale = ref(1);

const updateZoom = () => {
  const ratio = (window.devicePixelRatio || 1) / initialDPR;
  zoomScale.value = ratio;
};

// CSS `zoom` property counteracts browser zoom on layout level (no gap issues unlike transform)
const headerStyle = computed(() => {
  const scale = zoomScale.value;
  if (Math.abs(scale - 1) < 0.01) return {}; // no significant change, skip
  return {
    zoom: String(1 / scale),
  };
});

// Pagination state
const currentPage = ref(1);
const pageSize = 100;

// Scroll trigger reference
const loadMoreTrigger = ref(null);
let observer = null;

// Initialize Theme
const initTheme = () => {
  const savedTheme = localStorage.getItem('pokedex_theme') || 'dark';
  theme.value = savedTheme;
  document.documentElement.setAttribute('data-theme', savedTheme);
};

const toggleTheme = () => {
  const newTheme = theme.value === 'dark' ? 'light' : 'dark';
  theme.value = newTheme;
  localStorage.setItem('pokedex_theme', newTheme);
  document.documentElement.setAttribute('data-theme', newTheme);
};

// Initialize Favorites
const initFavorites = () => {
  try {
    const saved = localStorage.getItem('pokedex_favorites');
    if (saved) {
      favorites.value = new Set(JSON.parse(saved));
    }
  } catch (e) {
    console.error('Error loading favorites:', e);
  }
};

// Initialize Caught status (per selectedPokedex key)
const caughtStorageKey = computed(() => `pokedex_caught_${selectedPokedex.value || 'national'}`);

const initCaught = () => {
  try {
    const saved = localStorage.getItem(caughtStorageKey.value);
    caught.value = saved ? JSON.parse(saved) : {};
  } catch (e) {
    console.error('Error loading caught:', e);
    caught.value = {};
  }
};

// Re-load caught state when the active pokedex changes
watch(caughtStorageKey, () => {
  initCaught();
});

const toggleCaught = (id) => {
  if (caught.value[id]) {
    delete caught.value[id];
  } else {
    caught.value[id] = true;
  }
  // Trigger reactivity
  caught.value = { ...caught.value };
  localStorage.setItem(caughtStorageKey.value, JSON.stringify(caught.value));
};

const toggleFavorite = (id) => {
  if (favorites.value.has(id)) {
    favorites.value.delete(id);
  } else {
    favorites.value.add(id);
  }
  localStorage.setItem('pokedex_favorites', JSON.stringify(Array.from(favorites.value)));
};



// Game and Pokedex Loading Handler
watch([selectedGame, selectedPokedex], async () => {
  localStorage.setItem('pokedex_selected_game', selectedGame.value);
  localStorage.setItem('pokedex_selected_pokedex', selectedPokedex.value);
  loading.value = true;
  masterPokemonList.value = await fetchAllPokemonList(selectedGame.value);
  if (selectedGame.value !== 'all') {
    if (selectedPokedex.value === 'bdsp-national') {
      // BDSP National Dex = Gen 1-4 (Pokemon #1–493)
      activePokedexList.value = masterPokemonList.value
        .filter(p => p.id >= 1 && p.id <= 493)
        .sort((a, b) => a.id - b.id);
    } else if (selectedPokedex.value !== 'national') {
      activePokedexList.value = await fetchPokedex(selectedPokedex.value, selectedGame.value);
    } else {
      // Fetch union of all regional sub-pokedexes for the selected game
      const config = gamePokedexConfig.find(g => g.id === selectedGame.value);
      const subDexes = config?.pokedexes.filter(d => d.value !== 'national' && d.value !== 'bdsp-national') || [];
      
      const promises = subDexes.map(d => fetchPokedex(d.value, selectedGame.value));
      const results = await Promise.all(promises);
      
      const mergedMap = new Map();
      results.forEach(list => {
        list.forEach(p => {
          if (!mergedMap.has(p.id)) {
            mergedMap.set(p.id, {
              id: p.id,
              baseId: p.baseId,
              name: p.name,
              chineseName: p.chineseName,
              image: p.image
            });
          }
        });
      });
      activePokedexList.value = Array.from(mergedMap.values()).sort((a, b) => a.id - b.id);
    }
  } else {
    activePokedexList.value = null;
  }
  resetPagination();
  loading.value = false;
});

// Type loading handler
watch(selectedType, async (newType) => {
  localStorage.setItem('pokedex_selected_type', newType || '');
  loading.value = true;
  if (newType) {
    typeFilteredList.value = await fetchPokemonByType(newType);
  } else {
    typeFilteredList.value = null;
  }
  resetPagination();
  loading.value = false;
});

const typeFilteredList2 = ref(null);
watch(selectedType2, async (newType) => {
  localStorage.setItem('pokedex_selected_type2', newType || '');
  loading.value = true;
  if (newType) {
    typeFilteredList2.value = await fetchPokemonByType(newType);
  } else {
    typeFilteredList2.value = null;
  }
  resetPagination();
  loading.value = false;
});

// Watch filtering states to recalculate list
watch([searchQuery, selectedGen, sortBy, showFavoritesOnly, showUncaughtOnly, caught], () => {
  localStorage.setItem('pokedex_selected_gen', selectedGen.value);
  localStorage.setItem('pokedex_selected_sort', sortBy.value);
  localStorage.setItem('pokedex_selected_favorites', String(showFavoritesOnly.value));
  resetPagination();
});

// Core Filtering and Sorting Logic
const finalFilteredList = computed(() => {
  // 1. Choose source list
  let list = activePokedexList.value ? [...activePokedexList.value] : [...masterPokemonList.value];

  // If type filter is active, filter the list by type
  if (selectedType.value && typeFilteredList.value) {
    const typeIds = new Set(typeFilteredList.value.map(p => p.id));
    if (selectedType2.value && typeFilteredList2.value) {
      const type2Ids = new Set(typeFilteredList2.value.map(p => p.id));
      list = list.filter(p => typeIds.has(p.id) && type2Ids.has(p.id));
    } else {
      list = list.filter(p => typeIds.has(p.id));
    }
  }

  // 2. Filter by Generation Boundaries (Only when on "All Games" National Pokedex)
  if (selectedGame.value === 'all') {
    const genConfig = generations.find(g => g.value === selectedGen.value);
    if (genConfig && selectedGen.value !== 'all') {
      list = list.filter(p => (p.baseId || p.id) >= genConfig.start && (p.baseId || p.id) <= genConfig.end);
    }
  }

  // 3. Filter by Search Query
  if (searchQuery.value) {
    const q = searchQuery.value.trim().toLowerCase();
    list = list.filter(p => {
      const zhName = pokemonChineseNames[p.id] || p.chineseName || '';
      return (
        p.name.toLowerCase().includes(q) || 
        String(p.id).includes(q) ||
        zhName.includes(q)
      );
    });
  }

  // 4. Filter by Favorites Only
  if (showFavoritesOnly.value) {
    list = list.filter(p => favorites.value.has(p.id));
  }

  // 5. Filter by Uncaught Only
  if (showUncaughtOnly.value) {
    list = list.filter(p => !caught.value[p.id]);
  }

  // 5. Sorting
  const sorted = [...list];
  const useEntryNumber = list.length > 0 && list[0].entryNumber !== undefined;

  if (sortBy.value === 'id-asc') {
    if (useEntryNumber) {
      sorted.sort((a, b) => a.entryNumber - b.entryNumber);
    } else {
      sorted.sort((a, b) => a.id - b.id);
    }
  } else if (sortBy.value === 'id-desc') {
    if (useEntryNumber) {
      sorted.sort((a, b) => b.entryNumber - a.entryNumber);
    } else {
      sorted.sort((a, b) => b.id - a.id);
    }
  } else if (sortBy.value === 'name-asc') {
    sorted.sort((a, b) => a.name.localeCompare(b.name));
  } else if (sortBy.value === 'name-desc') {
    sorted.sort((a, b) => b.name.localeCompare(a.name));
  }

  return sorted;
});

const hasMore = computed(() => {
  return displayedList.value.length < finalFilteredList.value.length;
});

// Pagination details
const resetPagination = () => {
  currentPage.value = 1;
  displayedList.value = finalFilteredList.value.slice(0, pageSize);
  checkScrollHeight();
};

const handleScroll = () => {
  if (loadingMore.value || !hasMore.value) return;
  const scrollHeight = document.documentElement.scrollHeight;
  const scrollTop = window.scrollY || document.documentElement.scrollTop;
  const clientHeight = window.innerHeight;
  
  if (scrollTop + clientHeight >= scrollHeight - 350) {
    loadMoreItems();
  }
};

const checkScrollHeight = () => {
  nextTick(() => {
    if (hasMore.value && document.documentElement.scrollHeight <= window.innerHeight + 100) {
      loadMoreItems();
    }
  });
};

const loadMoreItems = () => {
  if (loadingMore.value || !hasMore.value) return;
  
  loadingMore.value = true;
  setTimeout(() => {
    const start = currentPage.value * pageSize;
    const end = start + pageSize;
    const nextBatch = finalFilteredList.value.slice(start, end);
    displayedList.value.push(...nextBatch);
    currentPage.value++;
    loadingMore.value = false;
    checkScrollHeight();
  }, 100);
};

onMounted(async () => {
  initTheme();
  initFavorites();
  initCaught();
  
  loading.value = true;
  
  // Load master Pokémon list
  masterPokemonList.value = await fetchAllPokemonList(selectedGame.value);
  
  // Load initial Game/Pokedex filters if saved in localStorage
  if (selectedGame.value !== 'all') {
    if (selectedPokedex.value === 'bdsp-national') {
      // BDSP National Dex = Gen 1-4 (Pokemon #1–493)
      activePokedexList.value = masterPokemonList.value
        .filter(p => p.id >= 1 && p.id <= 493)
        .sort((a, b) => a.id - b.id);
    } else if (selectedPokedex.value !== 'national') {
      activePokedexList.value = await fetchPokedex(selectedPokedex.value, selectedGame.value);
    } else {
      const config = gamePokedexConfig.find(g => g.id === selectedGame.value);
      const subDexes = config?.pokedexes.filter(d => d.value !== 'national' && d.value !== 'bdsp-national') || [];
      const promises = subDexes.map(d => fetchPokedex(d.value, selectedGame.value));
      const results = await Promise.all(promises);
      const mergedMap = new Map();
      results.forEach(list => {
        list.forEach(p => {
          if (!mergedMap.has(p.id)) {
            mergedMap.set(p.id, {
              id: p.id,
              baseId: p.baseId,
              name: p.name,
              chineseName: p.chineseName,
              image: p.image
            });
          }
        });
      });
      activePokedexList.value = Array.from(mergedMap.values()).sort((a, b) => a.id - b.id);
    }
  }

  // Load initial Type filters if saved in localStorage
  if (selectedType.value) {
    typeFilteredList.value = await fetchPokemonByType(selectedType.value);
  }
  if (selectedType2.value) {
    typeFilteredList2.value = await fetchPokemonByType(selectedType2.value);
  }

  resetPagination();
  loading.value = false;

  window.addEventListener('scroll', handleScroll);
  // `resize` fires on Ctrl+/- zoom in Chrome/Edge; devicePixelRatio changes with zoom
  window.addEventListener('resize', updateZoom);
  updateZoom(); // initialize in case page loads at non-100% zoom
  checkScrollHeight();
});

onUnmounted(() => {
  window.removeEventListener('scroll', handleScroll);
  window.removeEventListener('resize', updateZoom);
});

const openDetail = (id) => {
  selectedPokemonId.value = id;
};

const closeDetail = () => {
  selectedPokemonId.value = null;
};
</script>

<template>
  <div class="app-layout">
    <!-- Header Component -->
    <Header 
      v-model:searchQuery="searchQuery"
      v-model:selectedType="selectedType"
      v-model:selectedType2="selectedType2"
      v-model:selectedGen="selectedGen"
      v-model:sortBy="sortBy"
      v-model:showFavoritesOnly="showFavoritesOnly"
      v-model:showUncaughtOnly="showUncaughtOnly"
      v-model:selectedGame="selectedGame"
      v-model:selectedPokedex="selectedPokedex"
      :theme="theme"
      :style="headerStyle"
      @toggleTheme="toggleTheme"
    />

    <!-- Main Content Container -->
    <main class="main-content">
      <div class="content-container">
        
        <!-- Main Loading Spinner -->
        <Loader v-if="loading" />

        <!-- Empty Grid Roster -->
        <div v-else-if="displayedList.length === 0" class="empty-roster-state">
          <div class="sad-pokeball animate-float"></div>
          <h2>找不到任何寶可夢</h2>
          <p>請嘗試調整您的關鍵字、世代、或屬性過濾器條件。</p>
        </div>

        <!-- Pokemon Grid List -->
        <div v-else class="pokemon-grid-container">
          <div class="pokemon-grid">
            <PokemonCard 
              v-for="poke in displayedList" 
              :key="poke.id" 
              :pokemon="poke"
              :isFavorite="favorites.has(poke.id)"
              :isCaught="!!caught[poke.id]"
              :displayNumber="selectedPokedex !== 'national' ? poke.entryNumber : null"
              @click="openDetail"
              @toggleFavorite="toggleFavorite"
              @toggleCaught="toggleCaught"
            />
          </div>

          <!-- Bottom trigger for infinite scroll load -->
          <div 
            ref="loadMoreTrigger" 
            class="infinite-scroll-trigger"
            v-show="hasMore"
          >
            <div class="mini-spinner" v-if="loadingMore"></div>
          </div>
        </div>

      </div>
    </main>

    <!-- Pokemon Details Overlay Modal -->
    <DetailModal 
      v-if="selectedPokemonId" 
      :pokemonId="selectedPokemonId" 
      :selectedGame="selectedGame"
      @close="closeDetail"
      @selectPokemon="openDetail"
    />
  </div>
</template>

<style>
/* Reset App and set grid margins */
.app-layout {
  display: flex;
  flex-direction: column;
  min-height: 100vh;
}

.main-content {
  flex-grow: 1;
  padding: 40px 0 100px 0; /* Add bottom margin so comparison drawer doesn't overlap cards */
  width: 100%;
}

.content-container {
  max-width: 100%;
  padding: 0 24px;
}

/* Pokemon Grid style */
.pokemon-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(140px, 180px));
  gap: 16px;
  justify-content: center;
}

@media (min-width: 640px) {
  .pokemon-grid {
    grid-template-columns: repeat(auto-fill, minmax(160px, 210px));
    gap: 24px;
  }
}

/* Scroll Trigger */
.infinite-scroll-trigger {
  width: 100%;
  height: 60px;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-top: 30px;
}

.mini-spinner {
  width: 28px;
  height: 28px;
  border: 3px solid var(--border-color);
  border-top-color: var(--primary-color);
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}

/* Empty Grid State */
.empty-roster-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 80px 20px;
  text-align: center;
  color: var(--text-secondary);
}

.empty-roster-state h2 {
  font-size: 1.6rem;
  font-weight: 800;
  color: var(--text-primary);
  margin-top: 20px;
  margin-bottom: 8px;
}

.sad-pokeball {
  width: 70px;
  height: 70px;
  border-radius: 50%;
  border: 4px solid var(--text-secondary);
  background: linear-gradient(to bottom, var(--border-color) 50%, transparent 50%);
  position: relative;
  opacity: 0.6;
}

.sad-pokeball::after {
  content: '';
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  width: 14px;
  height: 14px;
  border-radius: 50%;
  border: 3px solid var(--text-secondary);
  background-color: var(--bg-app);
}

@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}
</style>
