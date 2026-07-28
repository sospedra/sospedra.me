# Geography game data and asset notices

This directory records the exact sources used by source revision
`geo-corpus-2026-07-27.2`. The playable build reads only committed, normalized
files and derived assets. It does not contact any source service at runtime.
Machine-readable versions, URLs, checksums, and retrieval metadata live in
[`sources.lock.json`](./sources.lock.json) and
[`corpus-sources.lock.json`](./corpus-sources.lock.json).

## Natural Earth

Country silhouettes and the unlabeled world map are derived from Natural
Earth's 1:10m vector data, pinned to repository commit
`ca96624a56bd078437bca8184e78163e5039ad19`.

- `ne_10m_admin_0_countries` supplies a reviewed primary geometry feature for
  every country in the 194-country editorial roster.
- `ne_10m_land` supplies the simplified, borderless world map.
- The standard de facto Admin 0 worldview is used for every locale.
- Natural Earth states that its raster and vector map data are in the public
  domain. See [Natural Earth Terms of Use](https://www.naturalearthdata.com/about/terms-of-use/).

The derivative process is deterministic and documented in
`scripts/geo/build-assets.mjs`. It dissolves the display into path-only SVG,
projects each country with a country-centered sinusoidal projection, preserves
aspect ratio during its uniform fit, filters fragments below a fixed visual-area
threshold, uses deterministic line simplification, rejects active SVG content,
and names country shapes by their SHA-256 content hash. The world map has a
stable URL because the Map component treats it as shared geometry; its bytes
remain checksummed in `data/geo/generated/assets.json`.

Two reviewed geometry overrides keep silhouettes legible: France uses its
metropolitan European components, and New Zealand omits remote antimeridian
outliers that would otherwise compress the two principal islands.

To reproduce the derived assets after placing the two pinned inputs under
`work/raw-data/`:

```bash
node scripts/geo/build-assets.mjs \
  work/raw-data/ne_10m_admin_0_countries.geojson \
  work/raw-data/ne_10m_land.geojson
```

## flag-icons

Flag SVGs are copied from the 4×3 set in `flag-icons` version `7.5.0` for every
eligible ISO alpha-2 roster entry. The package is distributed under the MIT
License: [flag-icons](https://github.com/lipis/flag-icons). The original aspect
ratio is preserved, SVGs are checked for active or remote content, and output
names use the first 20 hexadecimal characters of each full SHA-256 digest.

## Unicode CLDR

English and Spanish territory names come from Unicode CLDR JSON release
`48.2.1`, pinned to commit
`26a79cb42bfcc90def764102aa2af126d9ef3108`. CLDR is distributed under the
[Unicode License v3](https://www.unicode.org/license.txt). The committed
country corpus vendors the exact published labels instead of relying on the
host runtime's `Intl.DisplayNames` data.

## Wikidata

Country and capital entity IDs, bilingual capital labels, and capital
coordinates were normalized from a single Wikidata Query Service response
retrieved on 2026-07-27. Continent and subregion codes were normalized from the
pinned Natural Earth country properties, then reviewed with the eligibility
metadata. Wikidata structured data is available under
[CC0 1.0](https://www.wikidata.org/wiki/Wikidata:Licensing). The exact query is
committed at `scripts/geo/wikidata-capitals.sparql`; both query and response
digests are recorded in `sources.lock.json`.

Wikidata is treated as an import source, not final editorial authority.
Natural Earth supplies the pinned country entity IDs for the expanded roster.
GeoNames city records may carry a Wikidata identifier when one exists in the
pinned alternate-name snapshot. A missing city Wikidata identifier does not
trigger a network lookup. `editorial/overrides.json` records earlier reviewed
country and capital decisions.

## GeoNames

The city corpus is derived from the `cities500.zip`,
`alternateNamesV2.zip`, and `countryInfo.txt` snapshots dated 2026-07-27.
GeoNames distributes these data under CC BY 4.0. Exact archive checksums and
entries are recorded in `corpus-sources.lock.json`.

- Only populated-place records admitted by
  `editorial/city-coverage-policy.json` are eligible.
- Population rank uses the integer population field, then GeoNames ID as the
  deterministic tie-breaker.
- English and Spanish current names are retained. Historic and colloquial
  aliases are excluded from accepted answers.
- A country receives one inferred canonical capital. PPLC candidates are
  preferred; an exact normalized `countryInfo` capital match breaks ties.
  Additional capital roles require an explicit editorial override.

GeoNames is an import source, not final editorial authority. Corrections belong
in `editorial/city-overrides.json`, with a reason and stable GeoNames ID.

## World Bank

Country coverage uses the World Bank `SP.POP.TOTL` indicator for the pinned
2024 snapshot. Countries over 10,000,000 people receive twelve ranked
non-capital cities in addition to the canonical capital. The exact API response
is checksummed in `corpus-sources.lock.json`; no World Bank API call occurs at
runtime.

## Editorial scope

The versioned roster contains an editorially selected 192 United Nations
member states, the Holy See, and the State of Palestine. Territories and other
recognition-sensitive entities require an explicit roster revision.

Every roster country has committed city and country records. Europe-plus
countries and countries over 10,000,000 people receive twelve ranked
non-capital cities plus the canonical capital. Other countries receive three
ranked non-capital cities plus the capital. Monaco and Vatican City retain
their only eligible locality; the importer never pads a shortfall with invented
places.

Shape and Flag eligibility is source-verifiable. Capital and Map remain
disabled for Bolivia, Indonesia, Sri Lanka, the State of Palestine, and South
Africa pending the review items in `editorial/city-overrides.json`. Eligibility
is an editorial gameplay decision, not a statement about recognition or legal
status.

To reproduce the committed country and city records from the pinned raw files:

```bash
node scripts/geo/import-corpus.ts
```

The importer streams the pinned ZIP entries with the system `unzip` command;
it never extracts the full archives into the repository.
