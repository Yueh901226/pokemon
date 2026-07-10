import { verifiedMegaList } from './pokemonNames';

export const regionalFormsMap = {
  la: {
    nameSuffix: ' (洗翠的樣子)',
    forms: {
      58: 10229, 59: 10230, 100: 10231, 101: 10232, 157: 10233,
      211: 10234, 215: 10235, 503: 10236, 549: 10237, 570: 10238,
      571: 10239, 628: 10240, 705: 10241, 706: 10242, 713: 10243,
      724: 10244, 550: 10247
    }
  },
  sv: {
    nameSuffix: ' (帕底亞的樣子)',
    forms: {
      128: 10252, // Tauros Aqua Breed (defaulting to Aqua or Combat, 10250 is Combat)
      194: 10253
    }
  },
  swsh: {
    nameSuffix: ' (伽勒爾的樣子)',
    forms: {
      52: 10161, 77: 10162, 78: 10163, 79: 10164, 80: 10165,
      83: 10166, 110: 10167, 122: 10168, 144: 10169, 145: 10170,
      146: 10171, 199: 10172, 222: 10173, 263: 10174, 264: 10175,
      554: 10176, 555: 10178, 562: 10179, 618: 10180
    }
  }
};

export const typeTranslations = {
  normal: { name: '一般', color: '#A8A77A' },
  fire: { name: '火', color: '#EE8130' },
  water: { name: '水', color: '#6390F0' },
  electric: { name: '電', color: '#F7D02C' },
  grass: { name: '草', color: '#7AC74C' },
  ice: { name: '冰', color: '#96D9D6' },
  fighting: { name: '格鬥', color: '#C22E28' },
  poison: { name: '毒', color: '#A33EA1' },
  ground: { name: '地面', color: '#E2BF65' },
  flying: { name: '飛行', color: '#A98FF3' },
  psychic: { name: '超能力', color: '#F95587' },
  bug: { name: '蟲', color: '#A6B91A' },
  rock: { name: '岩石', color: '#B6A136' },
  ghost: { name: '幽靈', color: '#735797' },
  dragon: { name: '龍', color: '#6F35FC' },
  steel: { name: '鋼', color: '#B7B7CE' },
  fairy: { name: '妖精', color: '#D685AD' },
  dark: { name: '惡', color: '#705746' }
};

export const statTranslations = {
  hp: 'HP',
  attack: '攻擊',
  defense: '防禦',
  'special-attack': '特攻',
  'special-defense': '特防',
  speed: '速度'
};

export const capitalize = (str) => {
  if (!str) return '';
  return str.charAt(0).toUpperCase() + str.slice(1);
};

export const getStatColorClass = (val) => {
  if (val < 50) return '#ef4444'; // Red
  if (val < 80) return '#f97316'; // Orange
  if (val < 110) return '#eab308'; // Yellow
  if (val < 150) return '#22c55e'; // Green
  return '#06b6d4'; // Cyan (God tier)
};

export const getStatProgressBg = (val) => {
  return `${getStatColorClass(val)}33`; // 20% opacity for bar background
};

export const generations = [
  { name: '全部世代', value: 'all', start: 1, end: 1025 },
  { name: '第一世代 (關都)', value: 'gen1', start: 1, end: 151 },
  { name: '第二世代 (城都)', value: 'gen2', start: 152, end: 251 },
  { name: '第三世代 (豐緣)', value: 'gen3', start: 252, end: 386 },
  { name: '第四世代 (神奧)', value: 'gen4', start: 387, end: 493 },
  { name: '第五世代 (合眾)', value: 'gen5', start: 494, end: 649 },
  { name: '第六世代 (卡洛斯)', value: 'gen6', start: 650, end: 721 },
  { name: '第七世代 (阿羅拉)', value: 'gen7', start: 722, end: 809 },
  { name: '第八世代 (伽勒爾)', value: 'gen8', start: 810, end: 905 },
  { name: '第九世代 (帕底亞)', value: 'gen9', start: 906, end: 1025 }
];

export const parseEvolutionDetails = (details) => {
  if (!details || details.length === 0) return '';
  const d = details[0];
  let conditions = [];

  const itemMap = {
    'thunder-stone': '雷之石', 'fire-stone': '火之石', 'water-stone': '水之石',
    'leaf-stone': '葉之石', 'moon-stone': '月之石', 'sun-stone': '日之石',
    'shiny-stone': '光之石', 'dusk-stone': '暗之石', 'dawn-stone': '覺醒之石',
    'ice-stone': '冰之石', 'oval-stone': '渾圓之石', 'kings-rock': '王者之證',
    'metal-coat': '金屬膜', 'dragon-scale': '龍之鱗片', 'up-grade': '升級資料',
    'protector': '護具', 'electirizer': '電力增幅器', 'magmarizer': '熔岩增幅器',
    'dubious-disc': '可疑修正檔', 'reaper-cloth': '靈界之布', 'prism-scale': '美麗鱗片',
    'whipped-dream': '泡沫奶油', 'sachet': '香袋', 'tart-apple': '酸酸蘋果',
    'sweet-apple': '甜甜蘋果', 'cracked-pot': '破裂的茶壺', 'chipped-pot': '缺損的茶壺',
    'galarica-cuff': '伽勒爾豆蔻手環', 'galarica-wreath': '伽勒爾豆蔻花圈',
    'auspicious-armor': '慶祝之鎧', 'malicious-armor': '咒術之鎧', 'scroll-of-darkness': '惡之掛軸',
    'scroll-of-waters': '水之掛軸', 'black-augerite': '黑奇石', 'peat-block': '泥炭塊',
    'syrupy-apple': '蜜汁蘋果', 'unremarkable-teacup': '凡作茶碗', 'masterpiece-teacup': '傑作茶碗',
    'metal-alloy': '複合金屬', 'razor-fang': '銳利之牙', 'razor-claw': '銳利之爪',
    'deep-sea-tooth': '深海之牙', 'deep-sea-scale': '深海鱗片', 'leader-s-crest': '頭領憑證',
    'sweet-heart': '甜心糖', 'chilan-berry': '燈漿果'
  };

  const moveMap = {
    'barb-barrage': '毒千針', 'psyshield-bash': '屏障猛攻', 'rage-fist': '憤怒之拳',
    'twin-beam': '雙光束', 'hyper-drill': '強力鑽', 'dragon-cheer': '龍之聲援',
    'taunt': '挑釁', 'rollout': '滾動', 'ancient-power': '原始之力',
    'mimic': '模仿', 'double-hit': '二連擊', 'stomp': '踩踏', 'magic-coat': '魔術外衣',
    'dual-chop': '二連劈', 'dragon-pulse': '龍之波動', 'supercell-slam': '閃電猛衝',
    'tachyon-cutter': '迅子利刃'
  };

  const getItemName = (item) => item?.name && itemMap[item.name] ? itemMap[item.name] : '特定道具';
  const getMoveName = (move) => move?.name && moveMap[move.name] ? moveMap[move.name] : '特定招式';

  if (d.trigger?.name === 'level-up') {
    if (d.min_level) conditions.push(`等級 ${d.min_level}`);
    if (d.min_happiness) conditions.push(`親密度`);
    if (d.min_affection) conditions.push(`友好度`);
    if (d.min_beauty) conditions.push(`美麗度`);
    if (d.known_move) conditions.push(`學會「${getMoveName(d.known_move)}」後升級`);
    if (d.known_move_type) conditions.push(`學會${typeTranslations[d.known_move_type.name]?.name || ''}屬性招式後升級`);
    if (d.location) conditions.push(`特定地點`);
    if (d.party_species) conditions.push(`隊伍中有特定寶可夢`);
    if (d.party_type) conditions.push(`隊伍中有${typeTranslations[d.party_type.name]?.name || ''}屬性`);
    if (d.min_steps) conditions.push(`連線跟隨步行 ${d.min_steps} 步`);
    
    if (d.time_of_day === 'day') conditions.push('白天');
    if (d.time_of_day === 'night') conditions.push('夜晚');
    if (d.time_of_day === 'dusk') conditions.push('黃昏');
    
    if (d.held_item) conditions.push(`攜帶${getItemName(d.held_item)}`);
    if (conditions.length === 0) conditions.push('等級提升');
  } else if (d.trigger?.name === 'use-item') {
    conditions.push(d.item ? getItemName(d.item) : '使用道具');
  } else if (d.trigger?.name === 'trade') {
    if (d.held_item) conditions.push(`攜帶${getItemName(d.held_item)}交換`);
    else if (d.trade_species) conditions.push('與特定寶可夢交換');
    else conditions.push('連線交換');
  } else if (d.trigger?.name === 'shed') {
    conditions.push('隊伍有空位+精靈球');
  } else if (d.trigger?.name === 'spin') {
    conditions.push('角色旋轉');
  } else if (d.trigger?.name === 'tower-of-darkness') {
    conditions.push('惡之塔');
  } else if (d.trigger?.name === 'tower-of-waters') {
    conditions.push('水之塔');
  } else if (d.trigger?.name === 'three-critical-hits') {
    conditions.push('擊中要害3次');
  } else if (d.trigger?.name === 'take-damage') {
    conditions.push('受到特定傷害');
  } else if (d.trigger?.name === 'agile-style-move') {
    conditions.push(`以迅疾使用「${getMoveName(d.used_move)}」${d.min_move_count || 20}次`);
  } else if (d.trigger?.name === 'strong-style-move') {
    conditions.push(`以剛猛使用「${getMoveName(d.used_move)}」${d.min_move_count || 20}次`);
  } else if (d.trigger?.name === 'recoil-damage') {
    conditions.push('受到反作用力傷害');
  } else if (d.trigger?.name === 'gimmighoul-coins') {
    conditions.push('索財靈的硬幣 999 枚');
  } else if (d.trigger?.name === 'three-defeated-bisharp') {
    conditions.push('擊敗3隻攜帶頭領憑證的劈斬司令');
  } else if (d.trigger?.name === 'use-move') {
    conditions.push(`使用「${getMoveName(d.used_move)}」${d.min_move_count || 20}次`);
  } else {
    conditions.push('特殊條件');
  }

  if (d.gender === 1) conditions.push('♀');
  if (d.gender === 2) conditions.push('♂');
  if (d.needs_overworld_rain) conditions.push('雨天');
  if (d.turn_upside_down) conditions.push('主機倒置');
  if (d.relative_physical_stats === 1) conditions.push('攻擊 > 防禦');
  if (d.relative_physical_stats === -1) conditions.push('攻擊 < 防禦');
  if (d.relative_physical_stats === 0) conditions.push('攻擊 = 防禦');

  return conditions.join(' + ');
};

export const gamePokedexConfig = [
  {
    id: 'all',
    name: 'Pokémon HOME',
    pokedexes: [
      { id: 'national', name: '全國圖鑑', value: 'national' }
    ]
  },
  {
    id: 'sv',
    name: '朱／紫',
    pokedexes: [
      { id: 'paldea', name: '帕底亞圖鑑', value: 'paldea' },
      { id: 'kitakami', name: '北上鄉圖鑑', value: 'kitakami' },
      { id: 'blueberry', name: '藍之圓盤圖鑑', value: 'blueberry' }
    ]
  },
  {
    id: 'la',
    name: '傳說 阿爾宙斯',
    pokedexes: [
      { id: 'hisui', name: '洗翠圖鑑', value: 'hisui' }
    ]
  },
  {
    id: 'bdsp',
    name: '晶燦鑽石／明亮珍珠',
    pokedexes: [
      { id: 'extended-sinnoh', name: '神奧圖鑑', value: 'extended-sinnoh' },
      { id: 'bdsp-national', name: '全國圖鑑 (第1–4世代)', value: 'bdsp-national' }
    ]
  },
  {
    id: 'ss',
    name: '劍／盾',
    pokedexes: [
      { id: 'galar', name: '伽勒爾圖鑑', value: 'galar' },
      { id: 'isle-of-armor', name: '鎧島圖鑑', value: 'isle-of-armor' },
      { id: 'crown-tundra', name: '冠之雪原圖鑑', value: 'crown-tundra' },
      { id: 'national', name: '全國圖鑑', value: 'national' }
    ]
  },
  {
    id: 'lgpe',
    name: 'Let\'s Go！皮卡丘／伊布',
    pokedexes: [
      { id: 'letsgo-kanto', name: '關都圖鑑', value: 'letsgo-kanto' },
      { id: 'national', name: '全國圖鑑', value: 'national' }
    ]
  },
  {
    id: 'za',
    name: '傳說 Z-A',
    pokedexes: [
      { id: 'lumiose-city', name: '密阿雷市圖鑑', value: 'lumiose-city' },
      { id: 'otherdimension', name: '異次元圖鑑', value: 'otherdimension' },
      { id: 'mega', name: '超級進化圖鑑', value: 'mega' }
    ]
  }
];

export const megaEvolutionList = verifiedMegaList;
