<script setup>
import { ref, onMounted, computed, watch } from 'vue';
import { fetchPokemonDetails, fetchPokemonSpecies } from '../utils/pokeapi';
import { typeTranslations, capitalize } from '../utils/helpers';
import { pokemonChineseNames } from '../utils/pokemonNames';

const props = defineProps({
  pokemon: {
    type: Object,
    required: true
  },
  isFavorite: {
    type: Boolean,
    default: false
  },
  isComparing: {
    type: Boolean,
    default: false
  },
  displayNumber: {
    type: [Number, String],
    default: null
  },
  isCaught: {
    type: Boolean,
    default: false
  }
});

const emit = defineEmits(['click', 'toggleFavorite', 'toggleCompare', 'toggleCaught']);

const details = ref(null);
const species = ref(null);
const loading = ref(true);

const loadDetails = async () => {
  loading.value = true;
  const isMock = props.pokemon.isMockMega || props.pokemon.id >= 100000;
  const fetchId = isMock ? (props.pokemon.baseId || props.pokemon.id % 100000) : props.pokemon.id;
  const data = await fetchPokemonDetails(fetchId);
  if (data) {
    details.value = data;
    if (isMock) {
      details.value = {
        ...details.value,
        id: props.pokemon.id,
        name: props.pokemon.name,
        types: props.pokemon.types || details.value.types,
        stats: details.value.stats.map(s => ({
          ...s,
          value: s.name === 'hp' ? s.value : s.value + 20
        }))
      };
    }
  }
  // Also load species in background to get Chinese name
  const speciesId = props.pokemon.baseId || (props.pokemon.id >= 100000 ? props.pokemon.id % 100000 : props.pokemon.id);
  const speciesData = await fetchPokemonSpecies(speciesId);
  if (speciesData) {
    species.value = speciesData;
  }
  loading.value = false;
};

onMounted(() => {
  loadDetails();
});

// Watch for pokemon id change (e.g. if the list is updated/filtered)
watch(() => props.pokemon.id, () => {
  loadDetails();
});

const imageUrl = computed(() => {
  return `/megas/${props.pokemon.id}.webp`;
});

const handleImageError = (e) => {
  const currentSrc = e.target.src;
  if (currentSrc.endsWith('.webp') || currentSrc.includes('.webp')) {
    e.target.src = currentSrc.replace('.webp', '.png');
    return;
  }
  if (props.pokemon.isMega) {
    const fallbackId = props.pokemon.id >= 100000 ? (props.pokemon.baseId || props.pokemon.id % 100000) : props.pokemon.id;
    e.target.src = `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/${fallbackId}.png`;
  } else {
    e.target.src = props.pokemon.image || `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/${props.pokemon.id}.png`;
  }
};

const formattedId = computed(() => {
  if (props.displayNumber !== null && props.displayNumber !== undefined) {
    return `#${String(props.displayNumber).padStart(3, '0')}`;
  }
  return `#${String(props.pokemon.id).padStart(3, '0')}`;
});

const primaryType = computed(() => {
  return details.value?.types[0] || 'normal';
});

const secondaryType = computed(() => {
  return details.value?.types[1] || null;
});

// Dynamically generate card background gradient based on types
const cardStyle = computed(() => {
  if (!details.value || details.value.types.length === 0) {
    return {};
  }
  const color1 = typeTranslations[primaryType.value]?.color || '#A8A77A';
  const color2 = secondaryType.value 
    ? typeTranslations[secondaryType.value]?.color 
    : `${color1}66`; // 40% transparency fallback

  return {
    background: `linear-gradient(135deg, ${color1}25 0%, ${color2}15 100%)`,
    '--card-border-glow': color1,
    '--card-shadow-glow': `${color1}33`
  };
});

const chineseName = computed(() => {
  if (props.pokemon.chineseName) {
    return props.pokemon.chineseName;
  }
  return pokemonChineseNames[props.pokemon.id] || species.value?.chineseName || '';
});

const handleFavorite = (e) => {
  e.stopPropagation();
  emit('toggleFavorite', props.pokemon.id);
};

const handleCompare = (e) => {
  e.stopPropagation();
  emit('toggleCompare', props.pokemon);
};

const handleCaught = (e) => {
  e.stopPropagation();
  emit('toggleCaught', props.pokemon.id);
};
</script>

<template>
  <div 
    class="pokemon-card glass" 
    :style="cardStyle"
    @click="emit('click', pokemon.id)"
  >
    <!-- Background glowing circle -->
    <div class="card-glow"></div>

    <!-- Top card info (ID and Buttons) -->
    <div class="card-header">
      <span class="pokemon-id">{{ formattedId }}</span>
      <div class="card-actions">
        <!-- Compare button -->
        <button 
          class="btn-action btn-compare"
          :class="{ 'active': isComparing }"
          @click="handleCompare"
          title="加入比較"
        >
          <span v-if="isComparing">✓</span>
          <span v-else>+</span>
        </button>

        <!-- Favorite button -->
        <button 
          class="btn-action btn-fav"
          :class="{ 'active': isFavorite }"
          @click="handleFavorite"
          title="加入最愛"
        >
          <svg viewBox="0 0 24 24" fill="currentColor">
            <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/>
          </svg>
        </button>
      </div>
    </div>

    <!-- Pokemon Image -->
    <div class="image-container">
      <div class="img-shimmer" v-if="loading"></div>
      <img 
        :src="imageUrl" 
        :alt="pokemon.name"
        class="pokemon-img animate-float"
        loading="lazy"
        @error="handleImageError"
      />
    </div>

    <!-- Bottom info -->
    <div class="card-info">
      <h3 class="pokemon-name">
        <span class="zh-name" v-if="chineseName">{{ chineseName }}</span>
        <span class="en-name">{{ capitalize(pokemon.name) }}</span>
      </h3>

      <!-- Types badge -->
      <div class="type-badges" v-if="details">
        <span 
          v-for="t in details.types" 
          :key="t" 
          :class="['type-badge-mini', `type-${t}`]"
        >
          {{ typeTranslations[t]?.name || t }}
        </span>
      </div>
      <div class="type-badges-shimmer" v-else>
        <span class="shimmer-badge"></span>
      </div>

      <!-- Caught toggle button -->
      <button
        class="btn-caught"
        :class="{ 'caught': isCaught }"
        @click="handleCaught"
        :title="isCaught ? '已收服（點擊取消）' : '未收服（點擊標記）'"
      >
        <span v-if="isCaught">✓ 已收服</span>
        <span v-else>○ 未收服</span>
      </button>
    </div>
  </div>
</template>

<style scoped>
.pokemon-card {
  position: relative;
  border-radius: 20px;
  padding: 16px;
  display: flex;
  flex-direction: column;
  align-items: center;
  cursor: pointer;
  overflow: hidden;
  transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1);
  border: 1px solid var(--glass-border);
}

.pokemon-card::before {
  content: '';
  position: absolute;
  inset: 0;
  border-radius: 20px;
  padding: 1px;
  background: linear-gradient(to bottom right, rgba(255,255,255,0.1), transparent);
  -webkit-mask: linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0);
  -webkit-mask-composite: xor;
          mask-composite: exclude;
  pointer-events: none;
}

.pokemon-card:hover {
  transform: translateY(-8px) scale(1.02);
  border-color: var(--card-border-glow);
  box-shadow: 0 12px 30px var(--card-shadow-glow);
}

.card-glow {
  position: absolute;
  width: 140px;
  height: 140px;
  border-radius: 50%;
  background: var(--card-border-glow);
  filter: blur(60px);
  opacity: 0.15;
  top: 10%;
  left: 50%;
  transform: translateX(-50%);
  pointer-events: none;
  transition: opacity 0.4s;
}

.pokemon-card:hover .card-glow {
  opacity: 0.3;
}

.card-header {
  width: 100%;
  display: flex;
  justify-content: space-between;
  align-items: center;
  z-index: 10;
}

.pokemon-id {
  font-size: 0.85rem;
  font-weight: 700;
  color: var(--text-secondary);
  letter-spacing: 0.5px;
}

.card-actions {
  display: flex;
  gap: 6px;
}

.btn-action {
  width: 28px;
  height: 28px;
  border-radius: 50%;
  border: 1px solid var(--border-color);
  background-color: var(--bg-input);
  color: var(--text-primary);
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: all 0.3s;
  font-size: 0.8rem;
  padding: 0;
}

.btn-action:hover {
  background-color: var(--bg-card-hover);
  border-color: var(--text-secondary);
}

.btn-fav svg {
  width: 14px;
  height: 14px;
  fill: none;
  stroke: currentColor;
  stroke-width: 2.5;
}

.btn-fav.active {
  background-color: rgba(255, 62, 94, 0.1);
  border-color: var(--primary-color);
  color: var(--primary-color);
}

.btn-fav.active svg {
  fill: var(--primary-color);
}

.btn-compare.active {
  background-color: rgba(6, 182, 212, 0.1);
  border-color: #06b6d4;
  color: #06b6d4;
}

.image-container {
  width: 120px;
  height: 120px;
  display: flex;
  align-items: center;
  justify-content: center;
  margin: 12px 0;
  position: relative;
}

.pokemon-img {
  max-width: 105px;
  max-height: 105px;
  object-fit: contain;
  filter: drop-shadow(0 4px 8px rgba(0, 0, 0, 0.2));
  transition: transform 0.4s;
  z-index: 2;
}

.pokemon-card:hover .pokemon-img {
  transform: scale(1.1) translateY(-5px);
  filter: drop-shadow(0 8px 16px rgba(0, 0, 0, 0.3));
}

.img-shimmer {
  position: absolute;
  width: 80px;
  height: 80px;
  border-radius: 50%;
  background: linear-gradient(90deg, transparent, rgba(255,255,255,0.05), transparent);
  background-size: 200% 100%;
  animation: shimmer 1.5s infinite;
}

.card-info {
  width: 100%;
  text-align: center;
  z-index: 10;
}

.pokemon-name {
  font-size: 1.05rem;
  font-weight: 700;
  margin-bottom: 8px;
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.zh-name {
  color: var(--text-primary);
  font-size: 1.1rem;
}

.en-name {
  font-size: 0.85rem;
  color: var(--text-secondary);
  font-weight: 500;
}

.type-badges {
  display: flex;
  justify-content: center;
  gap: 6px;
  flex-wrap: wrap;
}

.type-badge-mini {
  padding: 2px 8px;
  border-radius: 12px;
  font-size: 0.75rem;
  font-weight: 600;
  color: #ffffff;
  text-shadow: 0 1px 1px rgba(0,0,0,0.1);
  box-shadow: 0 2px 4px rgba(0,0,0,0.1);
}

.type-badges-shimmer {
  display: flex;
  justify-content: center;
  padding: 4px 0;
}

.shimmer-badge {
  width: 50px;
  height: 16px;
  border-radius: 8px;
  background-color: var(--border-color);
  animation: pulse-glow 1.5s infinite;
}

.btn-caught {
  margin-top: 10px;
  width: 100%;
  padding: 5px 10px;
  border-radius: 20px;
  border: 1.5px solid rgba(255,255,255,0.15);
  background: rgba(255,255,255,0.06);
  color: var(--text-secondary);
  font-size: 0.78rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.25s ease;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 5px;
  letter-spacing: 0.02em;
}

.btn-caught:hover {
  background: rgba(255,255,255,0.12);
  border-color: rgba(255,255,255,0.3);
  color: var(--text-primary);
}

.btn-caught.caught {
  background: rgba(72, 199, 116, 0.18);
  border-color: rgba(72, 199, 116, 0.6);
  color: #48c774;
}

.btn-caught.caught:hover {
  background: rgba(220, 80, 80, 0.15);
  border-color: rgba(220, 80, 80, 0.5);
  color: #e05555;
}
</style>
