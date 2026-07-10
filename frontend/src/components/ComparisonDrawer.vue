<script setup>
import { ref, computed, watch, onMounted } from 'vue';
import { fetchPokemonDetails, fetchPokemonSpecies } from '../utils/pokeapi';
import { typeTranslations, statTranslations, capitalize, getStatColorClass, megaEvolutionList } from '../utils/helpers';
import { pokemonChineseNames } from '../utils/pokemonNames';

const props = defineProps({
  isOpen: Boolean,
  compareList: {
    type: Array,
    default: () => []
  }
});

const emit = defineEmits(['close', 'removePokemon']);

const pokemonDetails = ref([]);
const speciesDetails = ref([]);
const loading = ref(false);

const loadDetails = async () => {
  if (props.compareList.length === 0) {
    pokemonDetails.value = [];
    speciesDetails.value = [];
    return;
  }

  loading.value = true;
  const promises = props.compareList.map(async (p) => {
    const isMock = p.isMockMega || p.id >= 100000;
    const fetchId = isMock ? (p.baseId || p.id % 100000) : p.id;
    
    const detail = await fetchPokemonDetails(fetchId);
    let finalDetail = detail;
    if (detail && isMock) {
      finalDetail = {
        ...detail,
        id: p.id,
        name: p.name,
        types: p.types || detail.types,
        stats: detail.stats.map(s => ({
          ...s,
          value: s.name === 'hp' ? s.value : s.value + 20
        }))
      };
    }
    
    const speciesId = p.baseId || (p.id >= 100000 ? p.id % 100000 : p.id);
    const species = await fetchPokemonSpecies(speciesId);
    return { detail: finalDetail, species };
  });

  const results = await Promise.all(promises);
  pokemonDetails.value = results.map(r => r.detail).filter(Boolean);
  speciesDetails.value = results.map(r => r.species).filter(Boolean);
  loading.value = false;
};

onMounted(() => {
  loadDetails();
});

watch(() => props.compareList, () => {
  loadDetails();
}, { deep: true });

const getChineseName = (index) => {
  const detail = pokemonDetails.value[index];
  if (!detail) return '';
  const megaInfo = megaEvolutionList.find(m => m.id === detail.id);
  if (megaInfo) return megaInfo.displayName;
  return pokemonChineseNames[detail.id] || speciesDetails.value[index]?.chineseName || capitalize(detail.name);
};

const getStatValue = (pokemonIndex, statName) => {
  const detail = pokemonDetails.value[pokemonIndex];
  if (!detail) return 0;
  const stat = detail.stats.find(s => s.name === statName);
  return stat ? stat.value : 0;
};

const getStatTotal = (pokemonIndex) => {
  const detail = pokemonDetails.value[pokemonIndex];
  if (!detail) return 0;
  return detail.stats.reduce((acc, s) => acc + s.value, 0);
};

// Returns which pokemon wins a stat: 0, 1, or -1 if draw
const getStatWinner = (statName) => {
  if (pokemonDetails.value.length < 2) return -1;
  const val1 = getStatValue(0, statName);
  const val2 = getStatValue(1, statName);
  if (val1 > val2) return 0;
  if (val2 > val1) return 1;
  return -1;
};

const getTotalWinner = () => {
  if (pokemonDetails.value.length < 2) return -1;
  const val1 = getStatTotal(0);
  const val2 = getStatTotal(1);
  if (val1 > val2) return 0;
  if (val2 > val1) return 1;
  return -1;
};

const getDimensionWinner = (type) => {
  if (pokemonDetails.value.length < 2) return -1;
  const val1 = pokemonDetails.value[0]?.[type] || 0;
  const val2 = pokemonDetails.value[1]?.[type] || 0;
  if (val1 > val2) return 0;
  if (val2 > val1) return 1;
  return -1;
};

const getImageUrl = (item) => {
  if (!item) return '';
  return `/megas/${item.id}.webp`;
};

const handleImageError = (e, item) => {
  if (!item) return;
  const currentSrc = e.target.src;
  if (currentSrc.endsWith('.webp') || currentSrc.includes('.webp')) {
    e.target.src = currentSrc.replace('.webp', '.png');
    return;
  }
  const isMega = item.isMega || item.id >= 10000;
  if (isMega) {
    const fallbackId = item.id >= 100000 ? (item.baseId || item.id % 100000) : item.id;
    e.target.src = `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/${fallbackId}.png`;
  } else {
    e.target.src = item.image || `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/${item.id}.png`;
  }
};
</script>

<template>
  <div class="compare-drawer glass" :class="{ 'open': isOpen }">
    <div class="drawer-header">
      <h2 class="drawer-title">⚔️ 寶可夢能力比較</h2>
      <button class="btn-close-drawer" @click="emit('close')">&times;</button>
    </div>

    <div class="drawer-body custom-scroll">
      <!-- Empty state -->
      <div v-if="compareList.length === 0" class="empty-compare">
        <span>尚未加入寶可夢。請在寶可夢卡片點擊「+」按鈕加入對比。</span>
      </div>

      <!-- Single item selected (Need 2 for comparison) -->
      <div v-else-if="compareList.length === 1" class="compare-waiting">
        <div class="waiting-card glass">
          <img :src="getImageUrl(compareList[0])" class="waiting-img" @error="handleImageError($event, compareList[0])" />
          <span class="waiting-name">{{ capitalize(compareList[0].name) }}</span>
          <button class="btn-remove-waiting" @click="emit('removePokemon', compareList[0].id)">移除</button>
        </div>
        <div class="waiting-empty glass">
          <span class="plus-icon">+</span>
          <span>請再加入一隻寶可夢進行對比</span>
        </div>
      </div>

      <!-- Side-by-side layout (2 items) -->
      <div v-else-if="pokemonDetails.length >= 2 && !loading" class="compare-grid-layout">
        <!-- Pokes overview -->
        <div class="compare-overview">
          <div v-for="(poke, index) in pokemonDetails" :key="poke.id" class="poke-info-header glass">
            <button class="btn-remove-card" @click="emit('removePokemon', poke.id)">&times;</button>
             <img :src="getImageUrl(poke)" class="compare-img animate-float" @error="handleImageError($event, poke)" />
             <h3 class="compare-name">
              <span class="zh">{{ getChineseName(index) }}</span>
              <span class="en">{{ capitalize(poke.name) }}</span>
            </h3>
            <div class="badges">
              <span v-for="t in poke.types" :key="t" :class="['type-badge-mini', `type-${t}`]">
                {{ typeTranslations[t]?.name || t }}
              </span>
            </div>
          </div>
        </div>

        <!-- Stats Comparison Table -->
        <div class="comparison-details-section">
          <!-- Height weight -->
          <div class="compare-row title-row">
            <span class="row-label font-bold">基本體型</span>
          </div>

          <div class="compare-row">
            <div class="value-col" :class="{ 'winner': getDimensionWinner('height') === 0 }">
              {{ pokemonDetails[0].height }} m
              <span class="crown-icon" v-if="getDimensionWinner('height') === 0">👑</span>
            </div>
            <span class="stat-name-col">身高</span>
            <div class="value-col" :class="{ 'winner': getDimensionWinner('height') === 1 }">
              {{ pokemonDetails[1].height }} m
              <span class="crown-icon" v-if="getDimensionWinner('height') === 1">👑</span>
            </div>
          </div>

          <div class="compare-row">
            <div class="value-col" :class="{ 'winner': getDimensionWinner('weight') === 0 }">
              {{ pokemonDetails[0].weight }} kg
              <span class="crown-icon" v-if="getDimensionWinner('weight') === 0">👑</span>
            </div>
            <span class="stat-name-col">體重</span>
            <div class="value-col" :class="{ 'winner': getDimensionWinner('weight') === 1 }">
              {{ pokemonDetails[1].weight }} kg
              <span class="crown-icon" v-if="getDimensionWinner('weight') === 1">👑</span>
            </div>
          </div>

          <!-- Base Stats -->
          <div class="compare-row title-row">
            <span class="row-label font-bold">能力值對決</span>
          </div>

          <div v-for="(trans, key) in statTranslations" :key="key" class="compare-row">
            <!-- Poke 1 stat bar & val -->
            <div class="stat-bar-direction">
              <span class="stat-number" :class="{ 'winner-text': getStatWinner(key) === 0 }">
                {{ getStatValue(0, key) }}
              </span>
              <div class="compare-bar-container justify-end">
                <div 
                  class="compare-bar left-bar" 
                  :style="{ 
                    width: `${Math.min((getStatValue(0, key) / 255) * 100, 100)}%`,
                    backgroundColor: getStatWinner(key) === 0 ? '#22c55e' : 'var(--text-secondary)'
                  }"
                ></div>
              </div>
            </div>

            <!-- Stat title -->
            <span class="stat-name-col">{{ trans }}</span>

            <!-- Poke 2 stat bar & val -->
            <div class="stat-bar-direction">
              <div class="compare-bar-container justify-start">
                <div 
                  class="compare-bar right-bar" 
                  :style="{ 
                    width: `${Math.min((getStatValue(1, key) / 255) * 100, 100)}%`,
                    backgroundColor: getStatWinner(key) === 1 ? '#22c55e' : 'var(--text-secondary)'
                  }"
                ></div>
              </div>
              <span class="stat-number" :class="{ 'winner-text': getStatWinner(key) === 1 }">
                {{ getStatValue(1, key) }}
              </span>
            </div>
          </div>

          <!-- Total Stat -->
          <div class="compare-row total-compare-row">
            <div class="stat-bar-direction">
              <span class="stat-number total-num" :class="{ 'winner-text': getTotalWinner() === 0 }">
                {{ getStatTotal(0) }}
                <span class="crown-icon" v-if="getTotalWinner() === 0">👑</span>
              </span>
            </div>
            <span class="stat-name-col font-bold">總和</span>
            <div class="stat-bar-direction">
              <span class="stat-number total-num" :class="{ 'winner-text': getTotalWinner() === 1 }">
                <span class="crown-icon" v-if="getTotalWinner() === 1">👑</span>
                {{ getStatTotal(1) }}
              </span>
            </div>
          </div>
        </div>
      </div>

      <!-- Loading state -->
      <div v-else class="compare-loading">
        <div class="spinner"></div>
        <span>正在加載比較數據...</span>
      </div>
    </div>
  </div>
</template>

<style scoped>
.compare-drawer {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  height: 520px;
  background: var(--bg-modal);
  border-top: 1px solid var(--border-color);
  box-shadow: 0 -8px 30px rgba(0,0,0,0.5);
  z-index: 150;
  transform: translateY(105%);
  transition: transform 0.4s cubic-bezier(0.16, 1, 0.3, 1);
  display: flex;
  flex-direction: column;
}

.compare-drawer.open {
  transform: translateY(0);
}

.drawer-header {
  padding: 16px 24px;
  border-bottom: 1px solid var(--border-color);
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.drawer-title {
  font-size: 1.25rem;
  font-weight: 800;
  color: var(--text-primary);
}

.btn-close-drawer {
  background: none;
  border: none;
  font-size: 2rem;
  color: var(--text-secondary);
  cursor: pointer;
  transition: color 0.3s;
}

.btn-close-drawer:hover {
  color: var(--primary-color);
}

.drawer-body {
  flex-grow: 1;
  padding: 24px;
  overflow-y: auto;
}

/* Empty state styling */
.empty-compare {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 350px;
  color: var(--text-secondary);
  font-size: 0.95rem;
  text-align: center;
}

/* Waiting state styling */
.compare-waiting {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 24px;
  height: 350px;
  flex-direction: column;
}

@media (min-width: 600px) {
  .compare-waiting {
    flex-direction: row;
  }
}

.waiting-card {
  width: 180px;
  padding: 16px;
  border-radius: 20px;
  display: flex;
  flex-direction: column;
  align-items: center;
  border: 1px solid var(--border-color);
}

.waiting-img {
  width: 100px;
  height: 100px;
  object-fit: contain;
}

.waiting-name {
  font-size: 1rem;
  font-weight: 700;
  margin-top: 10px;
}

.btn-remove-waiting {
  margin-top: 10px;
  padding: 4px 12px;
  border-radius: 6px;
  border: 1px solid var(--primary-color);
  background: rgba(255, 62, 94, 0.05);
  color: var(--primary-color);
  font-size: 0.8rem;
  cursor: pointer;
  transition: all 0.3s;
}

.btn-remove-waiting:hover {
  background: var(--primary-color);
  color: #fff;
}

.waiting-empty {
  width: 180px;
  height: 184px;
  border-radius: 20px;
  border: 2px dashed var(--border-color);
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  color: var(--text-secondary);
  font-size: 0.85rem;
  padding: 16px;
  text-align: center;
}

.plus-icon {
  font-size: 2.2rem;
  font-weight: 300;
  margin-bottom: 8px;
}

/* Compare Grid Layout */
.compare-grid-layout {
  display: grid;
  grid-template-columns: 1fr;
  gap: 24px;
  max-width: 1000px;
  margin: 0 auto;
}

@media (min-width: 768px) {
  .compare-grid-layout {
    grid-template-columns: 240px 1fr;
  }
}

.compare-overview {
  display: flex;
  flex-direction: row;
  gap: 16px;
  justify-content: center;
}

@media (min-width: 768px) {
  .compare-overview {
    flex-direction: column;
    justify-content: flex-start;
  }
}

.poke-info-header {
  width: 130px;
  padding: 12px;
  border-radius: 20px;
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
  border: 1px solid var(--border-color);
  position: relative;
}

@media (min-width: 768px) {
  .poke-info-header {
    width: 100%;
    padding: 16px;
  }
}

.btn-remove-card {
  position: absolute;
  top: 8px;
  right: 8px;
  background: none;
  border: none;
  font-size: 1.25rem;
  color: var(--text-secondary);
  cursor: pointer;
}

.btn-remove-card:hover {
  color: var(--primary-color);
}

.compare-img {
  width: 70px;
  height: 70px;
  object-fit: contain;
}

@media (min-width: 768px) {
  .compare-img {
    width: 90px;
    height: 90px;
  }
}

.compare-name {
  margin-top: 8px;
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.compare-name .zh {
  font-size: 0.95rem;
  font-weight: 700;
  color: var(--text-primary);
}

.compare-name .en {
  font-size: 0.75rem;
  color: var(--text-secondary);
}

.badges {
  display: flex;
  gap: 4px;
  margin-top: 8px;
  flex-wrap: wrap;
  justify-content: center;
}

/* Detail Section Grid */
.comparison-details-section {
  display: flex;
  flex-direction: column;
  gap: 12px;
  background: rgba(255,255,255,0.01);
  padding: 16px;
  border-radius: 20px;
  border: 1px solid var(--border-color);
}

.compare-row {
  display: grid;
  grid-template-columns: 1fr 80px 1fr;
  align-items: center;
  gap: 16px;
  text-align: center;
}

.title-row {
  border-bottom: 1px solid var(--border-color);
  padding-bottom: 6px;
  margin-top: 8px;
  text-align: center;
  display: block;
}

.row-label {
  font-size: 0.85rem;
  color: var(--primary-color);
  letter-spacing: 0.5px;
  text-transform: uppercase;
}

.value-col {
  font-size: 1.05rem;
  font-weight: 600;
  color: var(--text-secondary);
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 4px;
}

.value-col.winner {
  color: #22c55e;
  font-weight: bold;
}

.stat-name-col {
  font-size: 0.85rem;
  font-weight: bold;
  color: var(--text-primary);
  background: var(--bg-input);
  padding: 4px 0;
  border-radius: 8px;
  border: 1px solid var(--border-color);
}

.stat-bar-direction {
  display: flex;
  align-items: center;
  gap: 10px;
}

.stat-bar-direction:first-child {
  justify-content: flex-end;
}

.stat-bar-direction:last-child {
  justify-content: flex-start;
}

.stat-number {
  font-size: 0.95rem;
  font-weight: 700;
  color: var(--text-secondary);
  min-width: 30px;
}

.winner-text {
  color: #22c55e;
  font-weight: bold;
}

.compare-bar-container {
  display: flex;
  flex-grow: 1;
  height: 8px;
  background-color: rgba(255,255,255,0.03);
  border-radius: 4px;
  overflow: hidden;
  max-width: 180px;
}

.justify-end {
  justify-content: flex-end;
}

.justify-start {
  justify-content: flex-start;
}

.compare-bar {
  height: 100%;
  border-radius: 4px;
  transition: width 0.8s cubic-bezier(0.16, 1, 0.3, 1);
}

.total-compare-row {
  border-top: 1px solid var(--border-color);
  padding-top: 12px;
  margin-top: 4px;
}

.total-num {
  font-size: 1.15rem !important;
}

.crown-icon {
  font-size: 0.85rem;
}

/* Spinner styling */
.compare-loading {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 350px;
  color: var(--text-secondary);
  gap: 16px;
}

.spinner {
  width: 40px;
  height: 40px;
  border: 3px solid var(--border-color);
  border-top-color: var(--primary-color);
  border-radius: 50%;
  animation: spin 1s linear infinite;
}

@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}
</style>
