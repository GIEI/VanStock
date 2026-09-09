/**
 * Assigns loremflickr photo URLs to all products based on their category/name.
 * URL format: https://loremflickr.com/400/400/{keywords}?lock={product_id}
 * The `lock` param makes the URL deterministic — same ID always returns the same photo.
 *
 * Run: node db/set_product_photos.js
 * Requires: PGUSER, PGPASSWORD, PGHOST, PGPORT, PGDATABASE or DATABASE_URL env vars,
 *           OR connects to the Docker container directly via psql.
 */

const { execSync } = require('child_process');

// Map each category (and some specific SKU prefixes) to English Flickr keywords
const CATEGORY_KEYWORDS = {
  'Cavi':                'electrical cable wire',
  'Cavi FV':             'solar photovoltaic cable',
  'Cavi Industriali':    'industrial electrical cable',
  'Tubi e Canaline':     'conduit pipe electrical',
  'Tubi':                'copper pipe plumbing',
  'Tubi Industriali':    'industrial pipe steel',
  'Tubazioni':           'refrigerant copper pipe',
  'Protezioni':          'circuit breaker electrical panel',
  'Protezioni FV':       'solar dc protection fuse',
  'Civili':              'electrical socket switch wall',
  'Scatole':             'electrical junction box',
  'Connettori':          'electrical connector terminal',
  'Illuminazione':       'led light bulb',
  'Raccordi':            'copper pipe fitting',
  'Raccordi Press':      'press fitting multilayer pipe',
  'Raccordi Industriali':'industrial pipe flange fitting',
  'Valvole':             'ball valve gate valve plumbing',
  'Pompe':               'water pump centrifugal',
  'Pompe di Calore':     'heat pump air water',
  'Scarichi':            'drain siphon plumbing',
  'Guarnizioni':         'rubber gasket seal',
  'Isolamento':          'pipe insulation foam',
  'Materiale Vario':     'hardware supplies tools',
  'Strumenti':           'measuring instrument gauge',
  'Strumentazione':      'industrial measurement sensor',
  'Climatizzatori':      'air conditioner split unit',
  'Gas Refrigeranti':    'refrigerant gas cylinder',
  'Elettronica':         'electronic pcb component',
  'Fotovoltaico':        'solar panel photovoltaic',
  'Inverter':            'solar inverter power',
  'Accumulo':            'battery storage energy',
  'Ventilazione':        'ventilation fan duct',
  'Automazione':         'industrial automation relay contactor',
  'Azionamenti':         'variable frequency drive motor',
  'Quadri':              'electrical panel cabinet din rail',
  'Sensori':             'industrial sensor proximity',
  'Trattamento Acque':   'water treatment plant',
  'Sicurezza':           'safety equipment industrial',
  'Attrezzatura':        'industrial tool hydraulic',
};

function getKeywords(category) {
  return CATEGORY_KEYWORDS[category] || 'industrial hardware tool';
}

function buildUrl(id, category) {
  const keywords = getKeywords(category)
    .replace(/ /g, '+');
  return `https://loremflickr.com/400/400/${keywords}?lock=${id}`;
}

// Fetch all products from DB (use | as field separator — safe since no category contains it)
const raw = execSync(
  `docker exec stocksimple-db psql -U stockuser -d stocksimple -t -A -F"|" -c "SELECT id, category FROM products ORDER BY id;"`
).toString().trim();

const lines = raw.split('\n').filter(Boolean);
const updates = lines.map(line => {
  const [id, category] = line.split('|');
  const url = buildUrl(id, category || '');
  // Escape single quotes in URL (not needed here but defensive)
  return `UPDATE products SET photo_url = '${url.replace(/'/g, "''")}' WHERE id = ${id};`;
});

const sql = updates.join('\n');

const { spawnSync } = require('child_process');

console.log(`Generated ${updates.length} UPDATE statements`);

// Pipe SQL directly to psql via stdin (avoids temp file path issues on Windows)
const result = spawnSync(
  'docker', ['exec', '-i', 'stocksimple-db', 'psql', '-U', 'stockuser', '-d', 'stocksimple'],
  { input: sql, encoding: 'utf8', stdio: ['pipe', 'inherit', 'inherit'] }
);

if (result.status !== 0) {
  console.error('psql exited with code', result.status);
  process.exit(1);
}

console.log('Done! All products now have a photo_url.');
