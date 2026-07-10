<script setup>
import { ref, watch, computed } from 'vue';
import { typeTranslations, generations, gamePokedexConfig } from '../utils/helpers';

const props = defineProps({
  searchQuery: String,
  selectedType: String,
  selectedGen: String,
  sortBy: String,
  showFavoritesOnly: Boolean,
  showUncaughtOnly: Boolean,
  theme: String,
  compareCount: Number,
  selectedGame: String,
  selectedPokedex: String
});

const emit = defineEmits([
  'update:searchQuery',
  'update:selectedType',
  'update:selectedGen',
  'update:sortBy',
  'update:showFavoritesOnly',
  'update:showUncaughtOnly',
  'update:selectedGame',
  'update:selectedPokedex',
  'toggleTheme',
  'toggleCompare'
]);

const activeType = ref(props.selectedType || '');

const selectType = (typeKey) => {
  activeType.value = activeType.value === typeKey ? '' : typeKey;
  emit('update:selectedType', activeType.value);
};

const handleSearch = (e) => {
  emit('update:searchQuery', e.target.value);
};

const handleGenChange = (e) => {
  emit('update:selectedGen', e.target.value);
};

const handleSortChange = (e) => {
  emit('update:sortBy', e.target.value);
};

const toggleFavorites = () => {
  emit('update:showFavoritesOnly', !props.showFavoritesOnly);
};

const toggleUncaught = () => {
  emit('update:showUncaughtOnly', !props.showUncaughtOnly);
};

// Game and Pokedex Logic
const activeGameConfig = computed(() => {
  return gamePokedexConfig.find(g => g.id === props.selectedGame) || gamePokedexConfig[0];
});

const selectGame = (gameId) => {
  emit('update:selectedGame', gameId);
  const config = gamePokedexConfig.find(g => g.id === gameId);
  if (config && config.pokedexes.length > 0) {
    emit('update:selectedPokedex', config.pokedexes[0].value);
  }
};

const selectPokedex = (pokedexValue) => {
  emit('update:selectedPokedex', pokedexValue);
};
</script>

<template>
  <header class="header glass">
    <!-- Top Row: Logo and Primary Controls -->
    <div class="header-top-row">
      <div class="header-container">
        <div class="logo-section">
          <div class="pokeball-icon animate-spin-slow"></div>
          <h1 class="logo-text text-gradient">寶可夢 Pokedex</h1>
        </div>

        <!-- Controls Panel -->
        <div class="controls-panel">
          <!-- Search bar -->
          <div class="search-wrapper">
            <svg class="search-icon" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>
            <input 
              type="text" 
              :value="searchQuery"
              @input="handleSearch"
              placeholder="搜尋名稱或編號..." 
              class="search-input"
            />
          </div>

          <div class="filters-row">
            <!-- Generation filter (Only show when on "All Games" National Pokedex) -->
            <div class="select-wrapper" v-if="selectedGame === 'all'">
              <select :value="selectedGen" @change="handleGenChange" class="filter-select">
                <option v-for="gen in generations" :key="gen.value" :value="gen.value">
                  {{ gen.name }}
                </option>
              </select>
            </div>

            <!-- Sort dropdown -->
            <div class="select-wrapper">
              <select :value="sortBy" @change="handleSortChange" class="filter-select">
                <option value="id-asc">編號: 由小到大</option>
                <option value="id-desc">編號: 由大到小</option>
                <option value="name-asc">名稱: A - Z</option>
                <option value="name-desc">名稱: Z - A</option>
              </select>
            </div>

            <!-- Favorites toggle button -->
            <button 
              @click="toggleFavorites" 
              class="btn-fav-toggle" 
              :class="{ 'active': showFavoritesOnly }"
            >
              <svg class="heart-icon" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/>
              </svg>
              <span>我的最愛</span>
            </button>

            <!-- Uncaught filter button -->
            <button
              @click="toggleUncaught"
              class="btn-uncaught-toggle"
              :class="{ 'active': showUncaughtOnly }"
            >
              <span>{{ showUncaughtOnly ? '✓ 未收服篩選中' : '○ 未收服' }}</span>
            </button>

            <!-- Compare drawer toggle -->
            <button @click="emit('toggleCompare')" class="btn-compare-toggle">
              <span>對比</span>
              <span class="compare-badge" v-if="compareCount > 0">{{ compareCount }}</span>
            </button>

            <!-- Theme toggler -->
            <button @click="emit('toggleTheme')" class="btn-theme-toggle" aria-label="切換主題">
              <span v-if="theme === 'dark'">☀️</span>
              <span v-else>🌙</span>
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- Row 2: Game Selector Bar -->
    <div class="game-select-bar">
      <div class="game-container custom-scroll">
        <span class="game-label">遊戲版本：</span>
        <div class="games-list">
          <button 
            v-for="game in gamePokedexConfig" 
            :key="game.id"
            class="game-pill"
            :class="{ 'active': selectedGame === game.id }"
            @click="selectGame(game.id)"
          >
            {{ game.name }}
          </button>
        </div>
      </div>
    </div>

    <!-- Row 3: Sub Pokedex Tab Bar (Shown if the game has multiple pokedexes) -->
    <div 
      class="pokedex-tabs-bar"
      v-if="activeGameConfig && activeGameConfig.pokedexes.length > 1"
    >
      <div class="tabs-container custom-scroll">
        <span class="pokedex-label">選擇圖鑑：</span>
        <div class="tabs-list">
          <button 
            v-for="dex in activeGameConfig.pokedexes" 
            :key="dex.value"
            class="dex-tab"
            :class="{ 'active': selectedPokedex === dex.value }"
            @click="selectPokedex(dex.value)"
          >
            {{ dex.name }}
          </button>
        </div>
      </div>
    </div>

    <!-- Types Scrollbar -->
    <div class="types-bar custom-scroll">
      <div class="types-bar-container">
        <button 
          v-for="(info, key) in typeTranslations" 
          :key="key" 
          @click="selectType(key)"
          class="type-btn"
          :class="[`type-${key}`, { 'active': activeType === key, 'inactive': activeType && activeType !== key }]"
          :style="{ '--btn-color': info.color }"
        >
          <span class="type-dot"></span>
          {{ info.name }}
        </button>
      </div>
    </div>
  </header>
</template>

<style scoped>
.header {
  position: sticky;
  top: 0;
  z-index: 100;
  width: 100%;
  border-bottom: 1px solid var(--border-color);
  transition: background-color 0.4s ease;
}

/* Top Row styling */
.header-top-row {
  padding: 16px 0;
}

.header-container {
  max-width: 100%;
  padding: 0 24px;
  display: flex;
  flex-direction: column;
  gap: 16px;
}

@media (min-width: 1024px) {
  .header-container {
    flex-direction: row;
    align-items: center;
    justify-content: space-between;
  }
}

.logo-section {
  display: flex;
  align-items: center;
  gap: 12px;
}

.pokeball-icon {
  width: 32px;
  height: 32px;
  border-radius: 50%;
  border: 3px solid var(--text-primary);
  background: linear-gradient(to bottom, var(--primary-color) 50%, #ffffff 50%);
  position: relative;
}

.pokeball-icon::after {
  content: '';
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  width: 10px;
  height: 10px;
  border-radius: 50%;
  border: 2px solid var(--text-primary);
  background-color: #ffffff;
}

.logo-text {
  font-size: 1.8rem;
  font-weight: 800;
  letter-spacing: -0.5px;
}

.controls-panel {
  display: flex;
  flex-direction: column;
  gap: 12px;
  flex-grow: 1;
  max-width: 850px;
}

@media (min-width: 768px) {
  .controls-panel {
    flex-direction: row;
    align-items: center;
  }
}

.search-wrapper {
  position: relative;
  flex-grow: 1;
}

.search-icon {
  position: absolute;
  left: 14px;
  top: 50%;
  transform: translateY(-50%);
  width: 18px;
  height: 18px;
  color: var(--text-secondary);
  pointer-events: none;
}

.search-input {
  width: 100%;
  padding: 12px 16px 12px 42px;
  border-radius: 12px;
  border: 1px solid var(--border-color);
  background-color: var(--bg-input);
  color: var(--text-primary);
  font-size: 0.95rem;
  outline: none;
  transition: all 0.3s;
}

.search-input:focus {
  border-color: var(--primary-color);
  box-shadow: 0 0 0 3px var(--primary-glow);
}

.filters-row {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
}

.select-wrapper {
  position: relative;
}

.filter-select {
  appearance: none;
  background-color: var(--bg-input);
  border: 1px solid var(--border-color);
  border-radius: 12px;
  padding: 12px 32px 12px 16px;
  color: var(--text-primary);
  font-size: 0.9rem;
  font-weight: 500;
  outline: none;
  cursor: pointer;
  transition: all 0.3s;
}

.filter-select:hover {
  border-color: var(--border-hover);
}

.filter-select:focus {
  border-color: var(--primary-color);
}

.select-wrapper::after {
  content: '▼';
  font-size: 0.6rem;
  color: var(--text-secondary);
  position: absolute;
  right: 14px;
  top: 50%;
  transform: translateY(-50%);
  pointer-events: none;
}

.btn-fav-toggle, .btn-compare-toggle {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 12px 16px;
  border-radius: 12px;
  border: 1px solid var(--border-color);
  background-color: var(--bg-input);
  color: var(--text-primary);
  font-size: 0.9rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.3s;
}

.btn-fav-toggle:hover, .btn-compare-toggle:hover {
  background-color: var(--bg-card-hover);
  border-color: var(--border-hover);
}

.btn-fav-toggle.active {
  background-color: rgba(255, 62, 94, 0.1);
  border-color: var(--primary-color);
  color: var(--primary-color);
}

.btn-fav-toggle.active .heart-icon {
  fill: var(--primary-color);
  filter: drop-shadow(0 0 4px var(--primary-glow));
}

.btn-uncaught-toggle {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 12px 16px;
  border-radius: 12px;
  border: 1px solid var(--border-color);
  background-color: var(--bg-input);
  color: var(--text-primary);
  font-size: 0.9rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.3s;
}

.btn-uncaught-toggle:hover {
  background-color: var(--bg-card-hover);
  border-color: var(--border-hover);
}

.btn-uncaught-toggle.active {
  background-color: rgba(72, 199, 116, 0.12);
  border-color: #48c774;
  color: #48c774;
}

.heart-icon {
  width: 16px;
  height: 16px;
  fill: none;
  stroke: currentColor;
  stroke-width: 2.5;
  transition: fill 0.3s;
}

.compare-badge {
  background-color: var(--primary-color);
  color: #fff;
  border-radius: 50%;
  min-width: 18px;
  height: 18px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  font-size: 0.75rem;
  padding: 0 4px;
  font-weight: bold;
}

.btn-theme-toggle {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 44px;
  height: 44px;
  border-radius: 12px;
  border: 1px solid var(--border-color);
  background-color: var(--bg-input);
  cursor: pointer;
  font-size: 1.1rem;
  transition: all 0.3s;
}

.btn-theme-toggle:hover {
  background-color: var(--bg-card-hover);
  border-color: var(--border-hover);
}

/* Row 2: Game Selector Bar Styling */
.game-select-bar {
  border-top: 1px solid var(--border-color);
  padding: 10px 0;
  background-color: rgba(0, 0, 0, 0.05);
}

.game-container {
  max-width: 100%;
  padding: 0 24px;
  display: flex;
  align-items: center;
  gap: 12px;
  overflow-x: auto;
}

.game-label {
  font-size: 0.85rem;
  font-weight: 700;
  color: var(--text-secondary);
  flex-shrink: 0;
}

.games-list {
  display: flex;
  gap: 8px;
}

.game-pill {
  padding: 6px 14px;
  border-radius: 20px;
  border: 1px solid var(--border-color);
  background-color: var(--bg-input);
  color: var(--text-primary);
  font-size: 0.85rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.3s;
  white-space: nowrap;
}

.game-pill:hover {
  border-color: var(--text-secondary);
  background-color: var(--bg-card-hover);
}

.game-pill.active {
  background-color: var(--primary-color);
  border-color: var(--primary-color);
  color: #ffffff;
  box-shadow: 0 0 10px var(--primary-glow);
}

/* Row 3: Sub Pokedex Tab Bar Styling */
.pokedex-tabs-bar {
  border-top: 1px solid var(--border-color);
  padding: 10px 0;
  background-color: rgba(255, 255, 255, 0.01);
}

.tabs-container {
  max-width: 100%;
  padding: 0 24px;
  display: flex;
  align-items: center;
  gap: 12px;
  overflow-x: auto;
}

.pokedex-label {
  font-size: 0.85rem;
  font-weight: 700;
  color: var(--text-secondary);
  flex-shrink: 0;
}

.tabs-list {
  display: flex;
  gap: 8px;
}

.dex-tab {
  padding: 6px 14px;
  border-radius: 8px;
  border: 1px solid transparent;
  background-color: transparent;
  color: var(--text-secondary);
  font-size: 0.85rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.3s;
  white-space: nowrap;
}

.dex-tab:hover {
  color: var(--text-primary);
  background-color: var(--border-color);
}

.dex-tab.active {
  color: var(--primary-color);
  background-color: rgba(255, 62, 94, 0.08);
  border-color: rgba(255, 62, 94, 0.2);
}

/* Types bar styling */
.types-bar {
  width: 100%;
  overflow-x: auto;
  padding: 12px 24px;
  border-top: 1px solid var(--border-color);
}

.types-bar-container {
  max-width: 100%;
  margin: 0 auto;
  display: flex;
  gap: 10px;
  padding-bottom: 2px;
}

.type-btn {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 6px 16px;
  border-radius: 20px;
  border: 1px solid transparent;
  color: #ffffff;
  font-size: 0.85rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.3s;
  flex-shrink: 0;
  text-shadow: 0 1px 2px rgba(0,0,0,0.2);
}

.type-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background-color: #ffffff;
  box-shadow: 0 0 4px rgba(255,255,255,0.8);
}

.type-btn.inactive {
  opacity: 0.4;
  filter: grayscale(80%);
}

.type-btn.active {
  box-shadow: 0 0 12px var(--btn-color);
  transform: translateY(-2px);
  border-color: #ffffff;
}

.type-btn:hover {
  opacity: 1;
  filter: none;
  transform: translateY(-2px);
}
</style>
