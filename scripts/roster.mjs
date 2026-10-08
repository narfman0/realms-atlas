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
