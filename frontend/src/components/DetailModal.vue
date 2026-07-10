<script setup>
import { ref, onMounted, computed, watch } from 'vue';
import { fetchPokemonDetails, fetchPokemonSpecies, fetchEvolutionChain } from '../utils/pokeapi';
import { typeTranslations, statTranslations, capitalize, getStatColorClass, getStatProgressBg, megaEvolutionList } from '../utils/helpers';
import { pokemonChineseNames } from '../utils/pokemonNames';
import encountersData from '../assets/encounters.json';

const props = defineProps({
  pokemonId: {
    type: Number,
    required: true
  },
  selectedGame: {
    type: String,
    default: 'all'
  }
});

const emit = defineEmits(['close', 'selectPokemon']);

const details = ref(null);
const species = ref(null);
const evolutions = ref([]);
const loading = ref(true);
const activeTab = ref('about'); // 'about', 'stats', 'evolution'
const audioPlaying = ref(false);
const encounters = ref([]);

const loadData = async (id) => {
  loading.value = true;
  activeTab.value = 'about';
  
  const isMock = id >= 100000;
  const fetchId = isMock ? id % 100000 : id;
  
  // Fetch primary details
  const detailData = await fetchPokemonDetails(fetchId);
  if (!detailData) {
    emit('close');
    return;
  }
  details.value = detailData;
  const megaInfo = megaEvolutionList.find(m => m.id === id);
  if (isMock) {
    details.value = {
      ...details.value,
      id: id,
      types: megaInfo?.types || details.value.types,
      stats: details.value.stats.map(s => ({
        ...s,
        value: s.name === 'hp' ? s.value : s.value + 20
      }))
    };
  }

  // Fetch species (description & evolution chain)
  const speciesId = megaInfo ? megaInfo.baseId : (detailData.speciesId || (isMock ? id % 100000 : id));
  const speciesData = await fetchPokemonSpecies(speciesId);
  species.value = speciesData;

  // Fetch evolution chain
  if (speciesData && speciesData.evolutionChainUrl) {
    const chain = await fetchEvolutionChain(speciesData.evolutionChainUrl, props.selectedGame);
    evolutions.value = chain || [];
  } else {
    evolutions.value = [];
  }

  // Fetch encounters based on selected game from static JSON
  const selectedGame = localStorage.getItem('pokedex_selected_game') || 'all';
  if (selectedGame !== 'all' && encountersData[fetchId] && encountersData[fetchId][selectedGame]) {
    const locs = encountersData[fetchId][selectedGame];
    if (locs.length > 0) {
      encounters.value = locs;
    } else {
      encounters.value = ['此遊戲版本尚無入手方式資料或無法捕捉'];
    }
  } else if (selectedGame !== 'all') {
    encounters.value = ['此遊戲版本尚無入手方式資料或無法捕捉'];
  } else {
    encounters.value = [];
  }

  loading.value = false;
};

onMounted(() => {
  loadData(props.pokemonId);
});

watch(() => props.pokemonId, (newId) => {
  loadData(newId);
});

const formattedId = computed(() => {
  return `#${String(details.value?.id || props.pokemonId).padStart(3, '0')}`;
});

const primaryType = computed(() => {
  return details.value?.types[0] || 'normal';
});

const speciesName = computed(() => {
  if (!details.value) return '';
  const megaInfo = megaEvolutionList.find(m => m.id === details.value.id);
  if (megaInfo) return megaInfo.displayName;
  
  if (isMega.value) {
    const baseId = details.value.speciesId || (details.value.id >= 100000 ? details.value.id % 100000 : details.value.id);
    const baseTraditionalName = pokemonChineseNames[baseId] || species.value?.chineseName || '';
    const parts = details.value.name.toLowerCase().split('-');
    const baseNameStr = parts[0];
    let rawSuffix = details.value.name.toLowerCase()
      .replace(baseNameStr, '')
      .replace('mega', '')
      .replace(/^-+|-+$/g, '');
    let varietySuffix = formatVarietyName(rawSuffix).replace(' (預設)', '').replace(' (標準)', '');
    return varietySuffix ? `超級${baseTraditionalName} (${varietySuffix})` : `超級${baseTraditionalName}`;
  }
  
  return pokemonChineseNames[details.value.id] || species.value?.chineseName || capitalize(details.value.name);
});

const cleanEnglishName = computed(() => {
  if (!details.value) return '';
  return details.value.name.split('-').map(word => capitalize(word)).join(' ');
});

const playCry = () => {
  if (!details.value) return;
  const baseId = megaEvolutionList.find(m => m.id === details.value.id)?.baseId || details.value.id;
  const cryUrl = details.value.cries || `https://raw.githubusercontent.com/PokeAPI/cries/main/cries/pokemon/latest/${baseId}.ogg`;
  
  const audio = new Audio(cryUrl);
  audio.volume = 0.5;
  audioPlaying.value = true;
  audio.play().catch(err => {
    console.error('Audio play failed:', err);
    audioPlaying.value = false;
  });
  audio.onended = () => {
    audioPlaying.value = false;
  };
};

const varietyNameTranslations = {
  'tatsugiri': '上弓姿勢 (預設)',
  'tatsugiri-curly': '上弓姿勢 (預設)',
  'tatsugiri-drooping': '下垂姿勢',
  'tatsugiri-droopy': '下垂姿勢',
  'tatsugiri-stretchy': '平挺姿勢',
  'meowth': '關都形態 (預設)',
  'meowth-alola': '阿羅拉形態',
  'meowth-galar': '伽勒爾形態',
  'meowth-gmax': '超極巨化形態',
  'greninja': '普通形態 (預設)',
  'greninja-battle-bond': '牽絆變身形態',
  'greninja-ash': '小智版甲賀忍蛙',
  'rotom': '普通形態 (預設)',
  'rotom-heat': '加熱洛托姆 (火)',
  'rotom-wash': '清洗洛托姆 (水)',
  'rotom-frost': '結冰洛托姆 (冰)',
  'rotom-fan': '旋轉洛托姆 (飛行)',
  'rotom-mow': '切割洛托姆 (草)',
  // Magearna mega forms
  'magearna-mega': '超級瑪機雅娜 (現在的顏色)',
  'magearna-original-mega': '超級瑪機雅娜 (原始顏色)',
};

const formatVarietyName = (name) => {
  let lowercase = name.toLowerCase();
  if (varietyNameTranslations[lowercase]) {
    return varietyNameTranslations[lowercase];
  }
  const parts = lowercase.split('-');
  if (details.value && parts[0] === details.value.name.toLowerCase()) {
    parts.shift();
  }
  if (parts.length === 0) {
    return '預設形態';
  }
  const translatedParts = parts.map(part => {
    const dict = {
      'alola': '阿羅拉形態',
      'galar': '伽勒爾形態',
      'hisui': '洗翠形態',
      'paldea': '帕底亞形態',
      'gmax': '超極巨化',
      'mega': '超級進化',
      'x': 'X',
      'y': 'Y',
      'z': 'Z',
      'curly': '上弓姿勢',
      'drooping': '下垂姿勢',
      'droopy': '下垂姿勢',
      'stretchy': '平挺姿勢',
      'origin': '起源形態',
      'crowned': '冠之姿',
      'therian': '靈獸形態',
      'incarnate': '化身形態',
      'active': '活躍形態',
      'resolute': '覺悟形態',
      'pirouette': '舞步形態',
      'aria': '歌聲形態',
      'ordinary': '普通形態',
      'neutral': '一般形態',
      'dusk': '黃昏形態',
      'midnight': '黑夜形態',
      'midday': '白晝形態',
      'school': '魚群形態',
      'meteor': '流星形態',
      'busted': '畫皮脫落',
      'disguised': '畫皮形態',
      'sunny': '晴天形態',
      'rainy': '雨天形態',
      'snowy': '雪天形態',
      'blade': '刀刃形態',
      'shield': '盾牌形態',
      'small': '小型',
      'average': '普通尺寸',
      'large': '大型',
      'super': '特大型',
      'battle': '戰鬥形態',
      'bond': '牽絆形態',
      'ash': '小智版',
      'heat': '加熱 (火)',
      'wash': '清洗 (水)',
      'frost': '結冰 (冰)',
      'fan': '旋轉 (飛行)',
      'mow': '切割 (草)',
      'own': '我行我素',
      'totem': '霸主',
    };
    return dict[part] !== undefined ? dict[part] : part;
  }).filter(Boolean);
  
  return translatedParts.map(word => capitalize(word)).join(' ');
};

const dropdownVarieties = computed(() => {
  if (!details.value) return [];
  let list = [];
  if (isMega.value) {
    const baseId = details.value.speciesId || (details.value.id >= 100000 ? details.value.id % 100000 : (megaEvolutionList.find(m => m.id === details.value.id)?.baseId || details.value.id));
    
    // Check if PokeAPI's species varieties list has native mega forms (whose name contains 'mega')
    const nativeMegas = (species.value?.varieties || []).filter(v => v.name.toLowerCase().includes('mega'));
    
    if (nativeMegas.length > 0) {
      list = nativeMegas
        // When viewing a mock mega (id >= 100000), exclude the plain '-mega' native variant
        // because the mock mega already represents that same form
        .filter(v => {
          if (details.value.id >= 100000) {
            // Only keep varieties with an extra suffix beyond just '-mega'
            const nameLower = v.name.toLowerCase();
            // A plain '-mega' ends with exactly '-mega' with no other suffix after it
            return !nameLower.endsWith('-mega') || nameLower.split('-mega')[0].includes('-');
          }
          return true;
        })
        .map(v => {
          // Check variety name translations first (e.g. magearna-mega, magearna-original-mega)
          const vNameLower = v.name.toLowerCase();
          if (varietyNameTranslations[vNameLower]) {
            return {
              id: v.id,
              name: varietyNameTranslations[vNameLower],
              isMega: true
            };
          }
          const baseTraditionalName = pokemonChineseNames[baseId] || species.value?.chineseName || '';
          const parts = vNameLower.split('-');
          const baseNameStr = parts[0];
          let rawSuffix = vNameLower
            .replace(baseNameStr, '')
            .replace('mega', '')
            .replace(/^-+|-+$/g, '');
          let varietySuffix = formatVarietyName(rawSuffix).replace(' (預設)', '').replace(' (標準)', '');
          const displayName = varietySuffix ? `超級${baseTraditionalName} (${varietySuffix})` : `超級${baseTraditionalName}`;
          return {
            id: v.id,
            name: displayName,
            isMega: true
          };
        });
    } else {
      list = megaEvolutionList.filter(m => m.baseId === baseId).map(m => ({
        id: m.id,
        name: m.displayName,
        isMega: true
      }));
    }
  } else {
    // If standard form, exclude Mega varieties
    list = (species.value?.varieties || []).filter(v => !v.name.toLowerCase().includes('mega'));
  }
  
  // Filter out the currently active form!
  return list.filter(item => item.id !== details.value.id);
});

const currentFormId = computed(() => {
  if (!details.value) return null;
  return details.value.id;
});

const changeForm = (e) => {
  const selectedId = parseInt(e.target.value, 10);
  loadData(selectedId);
};

const totalStats = computed(() => {
  if (!details.value) return 0;
  return details.value.stats.reduce((acc, stat) => acc + stat.value, 0);
});

const isMega = computed(() => {
  if (!details.value) return false;
  return megaEvolutionList.some(m => m.id === details.value.id) || (details.value.name && details.value.name.toLowerCase().includes('-mega'));
});

const detailImageUrl = computed(() => {
  if (!details.value) return '';
  return `/megas/${details.value.id}.webp`;
});

const handleDetailImageError = (e) => {
  if (!details.value) return;
  const currentSrc = e.target.src;
  if (currentSrc.endsWith('.webp') || currentSrc.includes('.webp')) {
    e.target.src = currentSrc.replace('.webp', '.png');
    return;
  }
  if (isMega.value) {
    const megaInfo = megaEvolutionList.find(m => m.id === details.value.id);
    const fallbackId = details.value.id >= 100000 ? (megaInfo?.baseId || details.value.id % 100000) : details.value.id;
    e.target.src = `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/${fallbackId}.png`;
  } else {
    e.target.src = details.value.image || `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/${details.value.id}.png`;
  }
};

// Dynamic styles based on Pokemon's type
const modalThemeStyle = computed(() => {
  if (!details.value) return {};
  const mainColor = typeTranslations[primaryType.value]?.color || '#ff3e5e';
  return {
    '--modal-accent': mainColor,
    '--modal-accent-glow': `${mainColor}25`
  };
});
</script>

<template>
  <div class="modal-overlay glass" @click.self="emit('close')">
    <div 
      class="modal-content glass" 
      v-if="details" 
      :style="modalThemeStyle"
    >
      <!-- Close button -->
      <button class="btn-close" @click="emit('close')">&times;</button>

      <div class="modal-body-layout" v-if="!loading">
        <!-- Left panel: Media & Basic Info -->
        <div class="left-panel">
          <div class="media-container">
            <!-- Ambient Glow -->
            <div class="ambient-glow"></div>
            
            <span class="modal-id">{{ formattedId }}</span>
            <img 
              :src="detailImageUrl" 
              :alt="details.name"
              class="modal-img animate-float"
              @error="handleDetailImageError"
            />
          </div>

          <div class="badge-row">
            <span 
              v-for="t in details.types" 
              :key="t" 
              :class="['type-badge', `type-${t}`]"
            >
              {{ typeTranslations[t]?.name || t }}
            </span>
          </div>

          <!-- Play Cry Sound -->
          <button 
            v-if="details" 
            @click="playCry" 
            class="btn-cry"
            :class="{ 'playing': audioPlaying }"
          >
            <span v-if="audioPlaying">🔊 播放中...</span>
            <span v-else>🔊 聽叫聲</span>
          </button>

          <!-- Variety Form Selector -->
          <div class="variety-selector" v-if="dropdownVarieties.length >= 1">
            <label class="selector-label">形態選擇：</label>
            <select class="form-select glass" value="" @change="changeForm">
              <option value="" disabled selected>切換其他形態...</option>
              <option 
                v-for="v in dropdownVarieties" 
                :key="v.id" 
                :value="v.id"
              >
                {{ v.isMega ? v.name : formatVarietyName(v.name) }}
              </option>
            </select>
          </div>
        </div>

        <!-- Right panel: Tabs & Info Details -->
        <div class="right-panel">
          <h2 class="modal-title">
            <span class="zh">{{ speciesName }}</span>
            <span class="en">{{ cleanEnglishName }}</span>
          </h2>

          <!-- Navigation Tabs -->
          <div class="tabs-header">
            <button 
              @click="activeTab = 'about'" 
              class="tab-btn" 
              :class="{ 'active': activeTab === 'about' }"
            >
              關於
            </button>
            <button 
              @click="activeTab = 'stats'" 
              class="tab-btn" 
              :class="{ 'active': activeTab === 'stats' }"
            >
              數值
            </button>
            <button 
              @click="activeTab = 'evolution'" 
              class="tab-btn" 
              :class="{ 'active': activeTab === 'evolution' }"
            >
              進化鏈
            </button>
          </div>

          <div class="tabs-content custom-scroll">
            <!-- TAB 1: ABOUT -->
            <div v-if="activeTab === 'about'" class="tab-pane fade-in">
              <p class="description-text">
                {{ species?.description || '暫無此寶可夢的詳細描述。' }}
              </p>

              <div class="info-grid">
                <!-- Encounters section -->
                <div class="info-item col-span-2">
                  <span class="info-label" style="display: flex; justify-content: space-between; align-items: center;">
                    <span>入手方式 (目前選擇版本)</span>
                    <a :href="`https://wiki.52poke.com/wiki/${species?.chineseName || details.name}`" target="_blank" class="wiki-link">
                      查看 52poke 完整圖鑑 ↗
                    </a>
                  </span>
                  <div v-if="encounters.length > 0" class="encounters-list custom-scroll" style="max-height: 80px; overflow-y: auto; padding-right: 4px;">
                    <div v-for="(loc, idx) in encounters" :key="idx" class="encounter-badge">
                      {{ loc }}
                    </div>
                  </div>
                  <div v-else style="font-size: 0.85rem; color: var(--text-secondary); margin-top: 4px;">
                    請選擇特定遊戲版本來查看（或點擊上方連結查看完整資料）
                  </div>
                </div>
                <div class="info-item">
                  <span class="info-label">身高</span>
                  <span class="info-value">{{ details.height }} m</span>
                </div>
                <div class="info-item">
                  <span class="info-label">體重</span>
                  <span class="info-value">{{ details.weight }} kg</span>
                </div>
                <div class="info-item col-span-2">
                  <span class="info-label">特性</span>
                  <div class="ability-badges">
                    <span 
                      v-for="a in details.abilities" 
                      :key="a.name"
                      class="ability-badge"
                      :class="{ 'hidden-ability': a.isHidden }"
                      :title="a.isHidden ? '隱藏特性' : '一般特性'"
                    >
                      {{ capitalize(a.name.replace('-', ' ')) }}
                      <span class="hidden-tag" v-if="a.isHidden">秘</span>
                    </span>
                  </div>
                </div>
              </div>
            </div>

            <!-- TAB 2: BASE STATS -->
            <div v-if="activeTab === 'stats'" class="tab-pane fade-in">
              <div class="stats-list">
                <div 
                  v-for="s in details.stats" 
                  :key="s.name" 
                  class="stat-row"
                >
                  <span class="stat-name">{{ statTranslations[s.name] || capitalize(s.name) }}</span>
                  <span class="stat-value">{{ s.value }}</span>
                  <div class="stat-bar-container" :style="{ backgroundColor: getStatProgressBg(s.value) }">
                    <div 
                      class="stat-bar" 
                      :style="{ 
                        width: `${Math.min((s.value / 255) * 100, 100)}%`,
                        backgroundColor: getStatColorClass(s.value),
                        boxShadow: `0 0 8px ${getStatColorClass(s.value)}88`
                      }"
                    ></div>
                  </div>
                </div>

                <!-- Total Stat Row -->
                <div class="stat-row total-row">
                  <span class="stat-name">總和</span>
                  <span class="stat-value">{{ totalStats }}</span>
                  <div class="stat-bar-container" style="background-color: rgba(255,255,255,0.05)">
                    <div 
                      class="stat-bar total-bar" 
                      :style="{ 
                        width: `${Math.min((totalStats / 720) * 100, 100)}%` 
                      }"
                    ></div>
                  </div>
                </div>
              </div>
            </div>

            <!-- TAB 3: EVOLUTION -->
            <div v-if="activeTab === 'evolution'" class="tab-pane fade-in">
              <div class="evolution-paths-container" v-if="evolutions.length > 0">
                <div 
                  v-for="(path, pathIndex) in evolutions" 
                  :key="'path-' + pathIndex"
                  class="evolution-path"
                >
                  <div 
                    v-for="(evo, index) in path" 
                    :key="evo.id + '-' + index"
                    class="evo-node-wrapper"
                  >
                    <div class="evo-arrow-container" v-if="index > 0">
                      <div class="evo-condition" v-if="evo.condition">{{ evo.condition }}</div>
                      <div class="evo-arrow">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
                          <line x1="5" y1="12" x2="19" y2="12"></line>
                          <polyline points="12 5 19 12 12 19"></polyline>
                        </svg>
                      </div>
                    </div>
                    <div 
                      class="evo-card glass"
                      :class="{ 'current': evo.id === details.id }"
                      @click="evo.id !== details.id && emit('selectPokemon', evo.id)"
                    >
                      <img 
                        :src="evo.image" 
                        :alt="evo.name" 
                        class="evo-img"
                      />
                      <span class="evo-name">{{ capitalize(evo.name) }}</span>
                    </div>
                  </div>
                </div>
              </div>
              <div class="no-evolution" v-else>
                <span>無進化鏈資料</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Spinner Loader inside modal -->
      <div class="modal-loading" v-else>
        <div class="spinner"></div>
        <span>加載詳細資料中...</span>
      </div>
    </div>
  </div>
</template>

<style scoped>
.modal-overlay {
  position: fixed;
  inset: 0;
  z-index: 200;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 16px;
  background-color: rgba(0, 0, 0, 0.7);
  animation: fadeIn 0.3s ease;
}

.modal-content {
  width: 100%;
  max-width: 850px;
  border-radius: 28px;
  overflow: hidden;
  position: relative;
  border: 1px solid var(--glass-border);
  box-shadow: var(--shadow-lg);
  padding: 30px;
  animation: scaleIn 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
  background: var(--bg-modal);
  min-height: 400px;
}

.btn-close {
  position: absolute;
  top: 16px;
  right: 20px;
  background: none;
  border: none;
  font-size: 2.2rem;
  color: var(--text-secondary);
  cursor: pointer;
  z-index: 50;
  transition: color 0.3s;
}

.btn-close:hover {
  color: var(--primary-color);
}

.modal-body-layout {
  display: grid;
  grid-template-columns: 1fr;
  gap: 30px;
}

@media (min-width: 768px) {
  .modal-body-layout {
    grid-template-columns: 280px 1fr;
  }
}

/* Left Panel */
.left-panel {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
}

.media-container {
  width: 100%;
  aspect-ratio: 1;
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 24px;
  background: rgba(255, 255, 255, 0.02);
  border: 1px solid rgba(255, 255, 255, 0.04);
}

.ambient-glow {
  position: absolute;
  width: 150px;
  height: 150px;
  background: var(--modal-accent);
  filter: blur(50px);
  opacity: 0.25;
  pointer-events: none;
}

.modal-id {
  position: absolute;
  top: 14px;
  left: 16px;
  font-size: 1.1rem;
  font-weight: 800;
  color: var(--text-secondary);
}

.modal-img {
  max-width: 190px;
  max-height: 190px;
  object-fit: contain;
  filter: drop-shadow(0 8px 16px rgba(0, 0, 0, 0.3));
  z-index: 2;
}

.badge-row {
  display: flex;
  gap: 8px;
  margin-top: 16px;
}

.btn-cry {
  margin-top: 16px;
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 20px;
  border-radius: 20px;
  border: 1px solid var(--modal-accent);
  background: var(--modal-accent-glow);
  color: var(--modal-accent);
  font-weight: 600;
  cursor: pointer;
  transition: all 0.3s;
}

.btn-cry:hover {
  background: var(--modal-accent);
  color: #fff;
  box-shadow: 0 0 12px var(--modal-accent);
}

.btn-cry.playing {
  animation: pulse-glow 1s infinite;
}

/* Right Panel */
.right-panel {
  display: flex;
  flex-direction: column;
  min-height: 320px;
}

.modal-title {
  margin-bottom: 20px;
  display: flex;
  flex-direction: column;
}

.modal-title .zh {
  font-size: 2rem;
  font-weight: 800;
  color: var(--text-primary);
}

.modal-title .en {
  font-size: 1.1rem;
  color: var(--text-secondary);
  font-weight: 500;
  margin-top: 2px;
}

.tabs-header {
  display: flex;
  border-bottom: 2px solid var(--border-color);
  gap: 16px;
  margin-bottom: 20px;
}

.tab-btn {
  background: none;
  border: none;
  color: var(--text-secondary);
  font-size: 1.05rem;
  font-weight: 600;
  padding: 8px 4px 12px;
  cursor: pointer;
  position: relative;
  transition: color 0.3s;
}

.tab-btn:hover {
  color: var(--text-primary);
}

.tab-btn.active {
  color: var(--modal-accent);
}

.tab-btn.active::after {
  content: '';
  position: absolute;
  bottom: -2px;
  left: 0;
  right: 0;
  height: 2px;
  background-color: var(--modal-accent);
  box-shadow: 0 0 8px var(--modal-accent);
}

.tabs-content {
  flex-grow: 1;
  max-height: 250px;
  overflow-y: auto;
}

.description-text {
  font-size: 0.95rem;
  line-height: 1.6;
  color: var(--text-secondary);
  margin-bottom: 20px;
}

.info-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 16px;
}

.encounters-list {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-top: 4px;
}

.encounter-badge {
  background: rgba(255, 255, 255, 0.1);
  padding: 4px 10px;
  border-radius: 12px;
  font-size: 0.85rem;
  color: var(--text-primary);
  border: 1px solid rgba(255, 255, 255, 0.05);
}

.wiki-link {
  font-size: 0.8rem;
  color: var(--modal-accent);
  text-decoration: none;
  background: rgba(255, 255, 255, 0.05);
  padding: 2px 8px;
  border-radius: 12px;
  transition: all 0.2s ease;
}

.wiki-link:hover {
  background: var(--modal-accent);
  color: #000;
}

.info-item {
  background: rgba(255,255,255,0.02);
  border: 1px solid var(--border-color);
  border-radius: 12px;
  padding: 12px;
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.col-span-2 {
  grid-column: span 2;
}

.info-label {
  font-size: 0.8rem;
  font-weight: 600;
  color: var(--text-secondary);
  text-transform: uppercase;
}

.info-value {
  font-size: 1.1rem;
  font-weight: 700;
}

.ability-badges {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}

.ability-badge {
  background-color: rgba(255, 255, 255, 0.05);
  border: 1px solid var(--border-color);
  padding: 4px 10px;
  border-radius: 8px;
  font-size: 0.85rem;
  font-weight: 600;
  display: inline-flex;
  align-items: center;
  gap: 4px;
}

.hidden-ability {
  border-color: rgba(255, 62, 94, 0.3);
  background-color: rgba(255, 62, 94, 0.03);
  color: var(--primary-color);
}

.hidden-tag {
  background-color: var(--primary-color);
  color: #fff;
  border-radius: 4px;
  width: 14px;
  height: 14px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  font-size: 0.65rem;
  font-weight: bold;
}

/* Stats view */
.stats-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.stat-row {
  display: grid;
  grid-template-columns: 80px 45px 1fr;
  align-items: center;
  gap: 12px;
}

.stat-name {
  font-size: 0.9rem;
  font-weight: 600;
  color: var(--text-secondary);
}

.stat-value {
  font-size: 0.95rem;
  font-weight: 700;
  text-align: right;
}

.stat-bar-container {
  height: 10px;
  border-radius: 5px;
  width: 100%;
  overflow: hidden;
  position: relative;
}

.stat-bar {
  height: 100%;
  border-radius: 5px;
  transition: width 0.8s cubic-bezier(0.16, 1, 0.3, 1);
}

.total-row {
  border-top: 1px solid var(--border-color);
  padding-top: 12px;
  margin-top: 4px;
}

.total-row .stat-name {
  color: var(--text-primary);
  font-weight: bold;
}

.total-bar {
  background: linear-gradient(90deg, var(--primary-color), #ff8533);
  box-shadow: 0 0 10px var(--primary-glow);
}

/* Evolution Chain view */
.evolution-paths-container {
  display: flex;
  flex-direction: column;
  gap: 20px;
  align-items: center;
  padding: 10px 0;
}

.evolution-path {
  display: flex;
  align-items: center;
  justify-content: center;
  flex-wrap: wrap;
  gap: 12px;
  background: rgba(255, 255, 255, 0.03);
  padding: 15px;
  border-radius: 12px;
  border: 1px solid var(--border-color);
  width: 100%;
}

.evo-node-wrapper {
  display: flex;
  align-items: center;
  gap: 15px;
}

.evo-arrow-container {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
}

.evo-condition {
  font-size: 0.7rem;
  color: var(--text-secondary);
  background: rgba(255, 255, 255, 0.05);
  padding: 4px 8px;
  border-radius: 8px;
  max-width: 100px;
  text-align: center;
  line-height: 1.3;
  word-break: break-word;
}

.evo-arrow {
  color: var(--text-secondary);
  width: 24px;
  height: 24px;
  display: flex;
  align-items: center;
  justify-content: center;
  opacity: 0.6;
}

.evo-card {
  width: 100px;
  padding: 8px;
  border-radius: 16px;
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
  cursor: pointer;
  transition: all 0.3s;
  border: 1px solid var(--glass-border);
}

.evo-card.current {
  border-color: var(--modal-accent);
  background-color: var(--modal-accent-glow);
  cursor: default;
}

.evo-card:not(.current):hover {
  transform: translateY(-4px);
  border-color: var(--text-secondary);
  box-shadow: var(--shadow-sm);
}

.evo-img {
  width: 60px;
  height: 60px;
  object-fit: contain;
}

.evo-name {
  font-size: 0.75rem;
  font-weight: 600;
  color: var(--text-primary);
  margin-top: 4px;
}

.no-evolution {
  display: flex;
  justify-content: center;
  align-items: center;
  height: 100px;
  color: var(--text-secondary);
  font-size: 0.95rem;
}

/* Loader */
.modal-loading {
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
  border-top-color: var(--modal-accent, var(--primary-color));
  border-radius: 50%;
  animation: spin 1s linear infinite;
}

/* Animations */
@keyframes fadeIn {
  from { opacity: 0; }
  to { opacity: 1; }
}

@keyframes scaleIn {
  from { transform: scale(0.9); opacity: 0; }
  to { transform: scale(1); opacity: 1; }
}

.fade-in {
  animation: fadeIn 0.4s ease;
}

/* Variety Form Selector Styles */
.variety-selector {
  margin-top: 20px;
  display: flex;
  flex-direction: column;
  gap: 6px;
  width: 100%;
  text-align: left;
}

.selector-label {
  font-size: 0.8rem;
  color: var(--text-secondary);
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.form-select {
  padding: 10px 14px;
  border-radius: 12px;
  border: 1px solid var(--glass-border);
  color: var(--text-primary);
  background: var(--glass-bg);
  cursor: pointer;
  outline: none;
  font-size: 0.85rem;
  font-weight: 500;
  transition: all 0.3s ease;
  width: 100%;
}

.form-select option {
  background: var(--bg-body);
  color: var(--text-primary);
}

.form-select:focus {
  border-color: var(--modal-accent);
  box-shadow: 0 0 10px var(--modal-accent-glow);
}
</style>
