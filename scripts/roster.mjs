// The canonical roster from docs/SPEC.md: region -> place ids.
// Used by the stub generator and by build-data.mjs to report missing places.
export const ROSTER = {
  'sword-coast-north': [
    'waterdeep', 'neverwinter', 'luskan', 'mirabar', 'bryn-shander', 'phandalin', 'daggerford', 'skullport',
    'undermountain', 'dragonspear-castle', 'spine-of-the-world', 'longsaddle', 'triboar', 'yartar',
  ],
  'silver-marches': [
    'silverymoon', 'everlund', 'sundabar', 'citadel-adbar', 'mithral-hall', 'gauntlgrym', 'hellgate-keep',
    'evereska', 'high-forest', 'evermeet', 'citadel-felbarr', 'nesme',
  ],
  underdark: ['menzoberranzan', 'ched-nasad', 'blingdenstone', 'gracklstugh', 'mantol-derith', 'araumycos'],
  'western-heartlands': [
    'baldurs-gate', 'candlekeep', 'elturel', 'berdusk', 'iriaebor', 'scornubel', 'darkhold', 'beregost',
    'boareskyr-bridge', 'athkatla', 'darromar', 'zazesspur', 'calimport', 'memnon', 'almraiven',
  ],
  'heartlands-east': [
    'suzail', 'arabel', 'tilverton', 'marsember', 'shadowdale', 'myth-drannor', 'standing-stone', 'cormanthor',
    'selgaunt', 'saerloon', 'ordulin', 'westgate', 'high-horn',
  ],
  'moonsea-and-north-east': [
    'zhentil-keep', 'mulmaster', 'hillsfar', 'phlan', 'melvaunt', 'citadel-of-the-raven', 'thultanthar',
    'anauroch', 'castle-perilous', 'helgabal', 'ravens-bluff', 'procampur', 'tantras', 'lyrabar',
  ],
  'east-and-south': [
    'eltabbar', 'bezantur', 'immilmar', 'velprintalar', 'skuld', 'unthalass', 'cimbar', 'arrabar', 'alaghon',
    'halarahh', 'port-nyanzaru', 'omu', 'mezro', 'caer-callidyrr', 'lantan', 'sea-of-fallen-stars',
  ],
};

export const REGIONS = Object.keys(ROSTER);
export const ALL_IDS = REGIONS.flatMap((r) => ROSTER[r]);

// Phase 2 (docs/SPEC-2.md): the other worlds. Each world's records live in data/places/<world>.json.
export const DEFAULT_WORLDS = [
  { id: 'toril', name: 'Faerûn', kind: 'continent', layoutDefault: 'map', parent: null },
  { id: 'ten-towns', name: 'Ten-Towns', kind: 'region', layoutDefault: 'map', parent: 'toril', parentPlace: 'bryn-shander' },
  { id: 'planes', name: 'The Planes', kind: 'planar', layoutDefault: 'wheel', parent: null },
  { id: 'realmspace', name: 'Realmspace', kind: 'space', layoutDefault: 'orbit', parent: null },
  { id: 'kara-tur', name: 'Kara-Tur', kind: 'continent', layoutDefault: 'map', parent: null },
  { id: 'zakhara', name: 'Zakhara', kind: 'continent', layoutDefault: 'map', parent: null },
  { id: 'maztica', name: 'Maztica', kind: 'continent', layoutDefault: 'map', parent: null },
  { id: 'laerakond', name: 'Laerakond', kind: 'continent', layoutDefault: 'map', parent: null },
];

export const WORLD_PREFIX = { 'ten-towns': 'tt-', planes: 'ps-', realmspace: 'sj-', 'kara-tur': 'kt-', zakhara: 'zk-', maztica: 'mz-', laerakond: 'la-' };

// Used only by the stub generator (--world <id>): once a world's file exists, its ids are the roster of record.
export const WORLD_ROSTER = {
  'ten-towns': [
    'tt-bryn-shander', 'tt-targos', 'tt-termalaine', 'tt-lonelywood', 'tt-bremen', 'tt-easthaven', 'tt-caer-dineval',
    'tt-caer-konig', 'tt-good-mead', 'tt-dougans-hole', 'tt-kelvins-cairn', 'tt-reghed-glacier', 'tt-sea-of-moving-ice',
    'tt-dwarven-valley',
  ],
  planes: [
    'ps-sigil', 'ps-the-spire',
    'ps-excelsior', 'ps-tradegate', 'ps-ecstasy', 'ps-faunel', 'ps-sylvania', 'ps-glorium', 'ps-xaos', 'ps-bedlam',
    'ps-plague-mort', 'ps-ribcage', 'ps-rigus', 'ps-curst', 'ps-hopeless', 'ps-torch', 'ps-automata', 'ps-fortitude',
    'ps-mount-celestia', 'ps-bytopia', 'ps-elysium', 'ps-beastlands', 'ps-arborea', 'ps-ysgard', 'ps-limbo',
    'ps-pandemonium', 'ps-the-abyss', 'ps-carceri', 'ps-gray-waste', 'ps-gehenna', 'ps-baator', 'ps-acheron',
    'ps-mechanus', 'ps-arcadia', 'ps-city-of-brass',
  ],
  realmspace: [
    'sj-the-sun', 'sj-anadia', 'sj-coliar', 'sj-toril', 'sj-selune', 'sj-tears-of-selune', 'sj-rock-of-bral', 'sj-karpri',
    'sj-chandos', 'sj-glyth', 'sj-garden', 'sj-hcatha', 'sj-crystal-shell',
  ],
  'kara-tur': ['kt-kuo-te-lung', 'kt-karatin', 'kt-wai', 'kt-uwaji', 'kt-dojyu', 'kt-u-chan-gompa', 'kt-saikhoi', 'kt-xi-hulang', 'kt-plain-of-horses', 'kt-dragonwall'],
  zakhara: ['zk-huzuz', 'zk-qudra', 'zk-hiyal', 'zk-muluk', 'zk-afyal', 'zk-jumlat', 'zk-hawa', 'zk-umara', 'zk-haunted-lands', 'zk-golden-gulf'],
  maztica: ['mz-nexal', 'mz-ulatos', 'mz-helmsport', 'mz-huacli', 'mz-kultaka', 'mz-pezelac', 'mz-house-of-tezca', 'mz-far-payit'],
  laerakond: ['la-tarmalune', 'la-harglast', 'la-imdolphyn', 'la-ramekho', 'la-sambral', 'la-melabrauth', 'la-fimbrul'],
};

/** region names for the other worlds (a world's records may use any region; these just read nicely) */
export const WORLD_REGIONS = {
  'ten-towns': ['ten-towns', 'icewind-dale'],
  planes: ['sigil', 'outlands', 'outer-planes', 'inner-planes', 'gate-towns', 'upper-planes', 'lower-planes', 'neutral-planes'],
  realmspace: ['realmspace', 'wildspace', 'inner-system', 'outer-system'],
};
