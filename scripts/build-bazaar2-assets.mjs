import { createHash } from 'node:crypto'
import {
  copyFile,
  mkdir,
  mkdtemp,
  readFile,
  rm,
  writeFile,
} from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import sharp from 'sharp'

const generatedRoot =
  '/Users/sospedra/.codex/generated_images/019f8f49-beec-7393-bf5d-627fe3d9c669'
const destinationRoot =
  '/Users/sospedra/labs/sospedra.me/public/images/bazaar2/assets'

const asset = (name, source, width, height, options = {}) => ({
  name,
  source: join(generatedRoot, `${source}.png`),
  width,
  height,
  keyGreen: options.keyGreen ?? false,
  openingTarget: options.openingTarget ?? null,
  position: options.position ?? 'centre',
})

const assets = [
  asset(
    'p1-door-closed.png',
    'exec-be42131f-adef-4041-b6ac-9e8dbe6e7085',
    288,
    608,
    { keyGreen: true, position: 'south' },
  ),
  asset(
    'p1-door-half.png',
    'exec-25cda1a0-35b6-4ec7-b57a-52d31a1805aa',
    288,
    608,
    { keyGreen: true, position: 'south' },
  ),
  asset(
    'p1-door-open.png',
    'exec-2163aa11-e5b2-43fb-96cb-39761cabe788',
    288,
    608,
    { keyGreen: true, position: 'south' },
  ),
  asset(
    'p1-sign-1.png',
    'exec-95b0984b-9c11-476a-ab60-ca4791e29ba5',
    416,
    128,
    { keyGreen: true },
  ),
  asset(
    'p1-sign-2.png',
    'exec-7c6c817c-d0e6-459f-89cd-4b8efa4f2b05',
    416,
    128,
    { keyGreen: true },
  ),
  asset(
    'p1-busstop-off.png',
    'exec-f8b78a94-ad90-4f90-9863-cdf0dfa35877',
    480,
    608,
    { keyGreen: true, position: 'south' },
  ),
  asset(
    'p1-busstop-on-1.png',
    'exec-6cf5a5e9-fb0e-4938-bc09-e19c2d8e7966',
    480,
    608,
    { keyGreen: true, position: 'south' },
  ),
  asset(
    'p1-busstop-on-2.png',
    'exec-4e2b925c-4982-4a05-9fe2-cdfca7edb6cb',
    480,
    608,
    { keyGreen: true, position: 'south' },
  ),

  asset(
    'p1-street-scene-desktop.png',
    'exec-a977de8a-5c08-4e0c-a46d-bd1c4bf5dff8',
    2400,
    1120,
    { position: 'south' },
  ),
  asset(
    'p1-street-scene-mobile.png',
    'exec-08a11c1d-5863-4546-b0e6-824da615d448',
    1360,
    1560,
    { position: 'south' },
  ),
  asset(
    'p1-bg-band.png',
    'exec-118a9a93-8af4-4a78-bcb6-b23fee0d251d',
    768,
    944,
    { position: 'north' },
  ),
  asset(
    'p1-bg-full.png',
    'exec-440722ed-fcd2-4435-9b6c-830057b31a52',
    768,
    1440,
    { keyGreen: true, position: 'north' },
  ),

  asset(
    'mkt-env-1.png',
    'exec-bd09b539-d252-42ab-ba03-7fbc35a7a8d9',
    1024,
    1440,
    { position: 'south' },
  ),
  asset(
    'mkt-env-2.png',
    'exec-eec3c9af-4533-4387-bd2b-697c8d345bb8',
    1024,
    1440,
    { position: 'south' },
  ),
  asset(
    'mkt-env-3.png',
    'exec-f30c7999-9a68-45c0-b800-ff0cd5865be4',
    1024,
    1440,
    { position: 'south' },
  ),

  asset(
    'stairs-h-desktop.png',
    'exec-9964bdde-db27-4b96-a004-f9f145a191da',
    320,
    1408,
    { keyGreen: true, position: 'south' },
  ),
  asset(
    'stairs-i-desktop.png',
    'exec-6529263a-b870-4152-87c7-75f991933781',
    320,
    1408,
    { keyGreen: true, position: 'south' },
  ),
  asset(
    'stairs-o-desktop.png',
    'exec-9e8190b6-e468-4b85-b97b-4ac5391d822d',
    320,
    1408,
    { keyGreen: true, position: 'south' },
  ),
  asset(
    'stairs-h-mobile.png',
    'exec-bf7993e9-0e2a-448c-b083-72a5dbc63990',
    240,
    2120,
    { keyGreen: true, position: 'south' },
  ),
  asset(
    'stairs-i-mobile.png',
    'exec-367ecf87-eeaf-4771-a0ad-97d4aa5f6a99',
    240,
    2120,
    { keyGreen: true, position: 'south' },
  ),
  asset(
    'stairs-c-mobile.png',
    'exec-205e1827-2873-4162-ba6d-e39bbe06c66c',
    240,
    2120,
    { keyGreen: true, position: 'south' },
  ),
  asset(
    'stairs-o-mobile.png',
    'exec-5e0ae1cf-958b-4840-a6c9-6959eb14c8c0',
    240,
    2120,
    { keyGreen: true, position: 'south' },
  ),

  asset(
    'stall-uses-desktop-interior.png',
    'exec-382f3a53-1fe6-408b-aa27-1dcb3c0acc23',
    720,
    960,
  ),
  asset(
    'stall-uses-desktop-front.png',
    'exec-6a8d72f1-ff8b-45d8-9b04-451af59e237d',
    720,
    960,
    { keyGreen: true, openingTarget: { top: 18.33, bottom: 48.33 } },
  ),
  asset(
    'stall-uses-mobile-interior.png',
    'exec-3c7be2f7-d092-4bad-a70d-dadd05232a0b',
    736,
    928,
  ),
  asset(
    'stall-uses-mobile-front.png',
    'exec-56bbc8cf-3690-4fe0-81c7-7c8066338d23',
    736,
    928,
    { keyGreen: true, openingTarget: { top: 17.24, bottom: 48.28 } },
  ),
  asset(
    'stall-games-desktop-interior.png',
    'exec-a2f19f5c-16e0-478d-8eed-c951caeb4163',
    720,
    960,
  ),
  asset(
    'stall-games-desktop-front.png',
    'exec-d0c863fd-bb36-445e-8232-76ba852d0925',
    720,
    960,
    { keyGreen: true },
  ),
  asset(
    'stall-games-mobile-interior.png',
    'exec-74c4c280-5933-4c2b-9439-20fd95f0b31e',
    736,
    928,
  ),
  asset(
    'stall-games-mobile-front.png',
    'exec-9bf62d60-3e75-45c0-952b-cf4a497a5a07',
    736,
    928,
    { keyGreen: true },
  ),
  asset(
    'stall-travel-desktop-interior.png',
    'exec-4ecdc936-4a11-4af8-9f72-34c9885984e8',
    720,
    960,
  ),
  asset(
    'stall-travel-desktop-front.png',
    'exec-7aefbf81-b587-4325-9393-b69f40daecbc',
    720,
    960,
    { keyGreen: true },
  ),
  asset(
    'stall-travel-mobile-interior.png',
    'exec-bfbef7db-f595-4357-a8b5-d66476956f35',
    736,
    928,
  ),
  asset(
    'stall-travel-mobile-front.png',
    'exec-47af9ed2-e234-40c8-a27f-f3334c047d61',
    736,
    928,
    { keyGreen: true },
  ),
  asset(
    'stall-manual-desktop-interior.png',
    'exec-9f588236-195d-4d02-9b66-e017f1d66796',
    1152,
    960,
  ),
  asset(
    'stall-manual-desktop-front.png',
    'exec-fae8bbbc-c7cb-41ee-9fa4-27db7cca0be6',
    1152,
    960,
    {
      keyGreen: true,
      openingTarget: { top: 16.67, bottom: 48.33, noren: true },
    },
  ),
  asset(
    'stall-manual-mobile-interior.png',
    'exec-2ace0c28-8cc2-4eda-9f34-0efa4848d396',
    736,
    928,
  ),
  asset(
    'stall-manual-mobile-front.png',
    'exec-cbc716fa-77d8-4dfb-b53f-621aad8e914b',
    736,
    928,
    {
      keyGreen: true,
      openingTarget: { top: 17.24, bottom: 48.28, noren: true },
    },
  ),
  asset(
    'stall-console-desktop-interior.png',
    'exec-57174e5c-7b08-4c01-abd4-6a2976e0892e',
    720,
    960,
  ),
  asset(
    'stall-console-desktop-front.png',
    'exec-35ad2d85-3e6e-49f3-837c-18850a1452f3',
    720,
    960,
    { keyGreen: true },
  ),
  asset(
    'stall-console-mobile-interior.png',
    'exec-a4d4df23-1fd6-43db-ae6d-b146e05b0560',
    736,
    928,
  ),
  asset(
    'stall-console-mobile-front.png',
    'exec-ce9af910-2c11-4ed9-b7d3-83bb0b2728de',
    736,
    928,
    { keyGreen: true },
  ),
  asset(
    'stall-projects-desktop-interior.png',
    'exec-ca4c8849-06fe-4049-8906-278a47f96596',
    720,
    960,
  ),
  asset(
    'stall-projects-desktop-front.png',
    'exec-124d6323-c694-4f75-931d-89d9f63a6ae9',
    720,
    960,
    { keyGreen: true },
  ),
  asset(
    'stall-projects-mobile-interior.png',
    'exec-7b9014b5-777e-4900-a786-d78d415e0845',
    736,
    928,
  ),
  asset(
    'stall-projects-mobile-front.png',
    'exec-990b9110-23aa-47aa-9a63-f057252796ca',
    736,
    928,
    { keyGreen: true },
  ),
  asset(
    'stall-talks-desktop-interior.png',
    'exec-03c0b477-e5a0-432c-8161-247e6f8ba96f',
    720,
    960,
  ),
  asset(
    'stall-talks-desktop-front.png',
    'exec-3fac6cbd-b98c-432e-8654-533d9a3089d3',
    720,
    960,
    { keyGreen: true, openingTarget: { top: 15.0, bottom: 33.33 } },
  ),
  asset(
    'stall-talks-mobile-interior.png',
    'exec-30f89628-2fcb-45c4-8c4e-ee229f36caf9',
    736,
    928,
  ),
  asset(
    'stall-talks-mobile-front.png',
    'exec-8ea1c236-22ae-4230-8c96-d87c567bef02',
    736,
    928,
    { keyGreen: true, openingTarget: { top: 15.52, bottom: 34.48 } },
  ),
  asset(
    'stall-papers-desktop-interior.png',
    'exec-42214873-df55-43af-ba84-818a68d6fbc8',
    720,
    960,
  ),
  asset(
    'stall-papers-desktop-front.png',
    'exec-c55f43f6-8bdd-423f-9882-ce8f300cf8a6',
    720,
    960,
    { keyGreen: true, openingTarget: { top: 18.33, bottom: 48.33 } },
  ),
  asset(
    'stall-papers-mobile-interior.png',
    'exec-c11afb0a-d48b-4f13-bda3-7d7aae3ffbd5',
    736,
    928,
  ),
  asset(
    'stall-papers-mobile-front.png',
    'exec-3cf5c7dc-a5d8-4600-9d7e-dd4dfc0c4253',
    736,
    928,
    { keyGreen: true, openingTarget: { top: 17.24, bottom: 48.28 } },
  ),

  asset(
    'stall-uses-keeper-idle-1.png',
    'exec-ed4ec3ac-fc93-481c-9e29-82b35f644b7a',
    152,
    560,
    { keyGreen: true, position: 'south' },
  ),
  asset(
    'stall-uses-keeper-idle-2.png',
    'exec-6b232c65-6789-43f6-a302-cac2e231df0c',
    152,
    560,
    { keyGreen: true, position: 'south' },
  ),
  asset(
    'stall-uses-keeper-hover-1.png',
    'exec-30f25dea-3ed4-404f-a9c7-6774b984ec06',
    152,
    560,
    { keyGreen: true, position: 'south' },
  ),
  asset(
    'stall-uses-keeper-hover-2.png',
    'exec-06faf25c-260e-4be1-b121-04c875805204',
    152,
    560,
    { keyGreen: true, position: 'south' },
  ),
  asset(
    'stall-uses-keeper-hover-3.png',
    'exec-6858cba9-17fb-42cb-a445-c3f0e5c4bf59',
    152,
    560,
    { keyGreen: true, position: 'south' },
  ),
  asset(
    'stall-games-keeper-idle-1.png',
    'exec-47055a9f-02e8-4113-880a-6babeeea76fe',
    304,
    560,
    { keyGreen: true, position: 'south' },
  ),
  asset(
    'stall-games-keeper-idle-2.png',
    'exec-c0fbbe83-b269-49ac-913c-85c45da91c63',
    304,
    560,
    { keyGreen: true, position: 'south' },
  ),
  asset(
    'stall-games-keeper-hover-1.png',
    'exec-545e8a27-cda3-4658-ae07-109095e922c3',
    304,
    560,
    { keyGreen: true, position: 'south' },
  ),
  asset(
    'stall-games-keeper-hover-2.png',
    'exec-7d07fc3d-e9be-4045-bede-94e2778070ee',
    304,
    560,
    { keyGreen: true, position: 'south' },
  ),
  asset(
    'stall-games-keeper-hover-3.png',
    'exec-dbf788be-3d79-4edf-b930-e1688d2c206a',
    304,
    560,
    { keyGreen: true, position: 'south' },
  ),
  asset(
    'stall-travel-keeper-idle-1.png',
    'exec-2dfb5786-81d2-4ca0-92b2-a7def41aa35e',
    152,
    560,
    { keyGreen: true, position: 'south' },
  ),
  asset(
    'stall-travel-keeper-idle-2.png',
    'exec-31bfafea-9769-480e-9635-6d502fad8235',
    152,
    560,
    { keyGreen: true, position: 'south' },
  ),
  asset(
    'stall-travel-keeper-hover-1.png',
    'exec-1ecf2aa6-48c6-4855-8106-0498fa5caa47',
    152,
    560,
    { keyGreen: true, position: 'south' },
  ),
  asset(
    'stall-travel-keeper-hover-2.png',
    'exec-a804e1f3-edc7-42e0-bf45-62b7518dcce9',
    152,
    560,
    { keyGreen: true, position: 'south' },
  ),
  asset(
    'stall-travel-keeper-hover-3.png',
    'exec-92179df4-20de-4b5e-b51d-7db9e0f2a6c3',
    152,
    560,
    { keyGreen: true, position: 'south' },
  ),
  asset(
    'stall-manual-keeper-idle-1.png',
    'exec-c422be4e-648e-4bb1-ae29-88d77e991fe3',
    152,
    560,
    { keyGreen: true, position: 'south' },
  ),
  asset(
    'stall-manual-keeper-idle-2.png',
    'exec-95680b4f-b0d9-4ee7-b24c-0a0440bb4a4e',
    152,
    560,
    { keyGreen: true, position: 'south' },
  ),
  asset(
    'stall-manual-keeper-hover-1.png',
    'exec-f56d904f-be61-4cb7-a991-169ca4aca3d4',
    152,
    560,
    { keyGreen: true, position: 'south' },
  ),
  asset(
    'stall-manual-keeper-hover-2.png',
    'exec-855e3156-6bb2-4adb-9958-1d9d370283de',
    152,
    560,
    { keyGreen: true, position: 'south' },
  ),
  asset(
    'stall-manual-keeper-hover-3.png',
    'exec-e77b6991-5171-4ba4-9a15-c54f647eb561',
    152,
    560,
    { keyGreen: true, position: 'south' },
  ),
  asset(
    'stall-console-keeper-idle-1.png',
    'exec-1dfb4bd8-f71e-41af-87b7-352a88355acc',
    208,
    384,
    { keyGreen: true, position: 'south' },
  ),
  asset(
    'stall-console-keeper-idle-2.png',
    'exec-c208f75d-14b5-4b10-a666-4e3186401253',
    208,
    384,
    { keyGreen: true, position: 'south' },
  ),
  asset(
    'stall-console-keeper-hover-1.png',
    'exec-dbbbe927-f9fb-4211-9fa3-c13169e6fa2a',
    208,
    384,
    { keyGreen: true, position: 'south' },
  ),
  asset(
    'stall-console-keeper-hover-2.png',
    'exec-de92c8f8-d165-455b-9bd1-ceda59952361',
    208,
    384,
    { keyGreen: true, position: 'south' },
  ),
  asset(
    'stall-console-keeper-hover-3.png',
    'exec-2b2798bc-0308-429f-9723-6a9cc8afc83a',
    208,
    384,
    { keyGreen: true, position: 'south' },
  ),
  asset(
    'stall-projects-keeper-idle-1.png',
    'exec-6bd18c5a-0fdf-4444-9ee8-bcef3b3c47b8',
    288,
    336,
    { keyGreen: true, position: 'south' },
  ),
  asset(
    'stall-projects-keeper-idle-2.png',
    'exec-b130bfad-81f7-4513-b480-58fa942f7415',
    288,
    336,
    { keyGreen: true, position: 'south' },
  ),
  asset(
    'stall-projects-keeper-hover-1.png',
    'exec-d5f5db61-67c0-4a38-9db1-b3a1aa8970d4',
    288,
    336,
    { keyGreen: true, position: 'south' },
  ),
  asset(
    'stall-projects-keeper-hover-2.png',
    'exec-7953bd7a-4d3c-4642-9639-28dbd44157aa',
    288,
    336,
    { keyGreen: true, position: 'south' },
  ),
  asset(
    'stall-projects-keeper-hover-3.png',
    'exec-d0a3fae2-a4ac-4ebe-ac65-02c2e06d3a2c',
    288,
    336,
    { keyGreen: true, position: 'south' },
  ),
  asset(
    'stall-talks-keeper-idle-1.png',
    'exec-672e1ee2-b3fd-40fb-9a23-3260477a5c95',
    152,
    560,
    { keyGreen: true, position: 'south' },
  ),
  asset(
    'stall-talks-keeper-idle-2.png',
    'exec-eac6657f-8c34-4242-8a94-622c7339c605',
    152,
    560,
    { keyGreen: true, position: 'south' },
  ),
  asset(
    'stall-talks-keeper-hover-1.png',
    'exec-55446644-e98b-41bd-8e9e-61596aa47b82',
    152,
    560,
    { keyGreen: true, position: 'south' },
  ),
  asset(
    'stall-talks-keeper-hover-2.png',
    'exec-fb54968a-2689-45bd-b580-18fc09a0261a',
    152,
    560,
    { keyGreen: true, position: 'south' },
  ),
  asset(
    'stall-talks-keeper-hover-3.png',
    'exec-49ddbcdd-3e38-4551-afce-7f2ac0ab4928',
    152,
    560,
    { keyGreen: true, position: 'south' },
  ),
  asset(
    'stall-papers-keeper-idle-1.png',
    'exec-8eae6f3b-08c0-4279-abc5-5928b8e75129',
    152,
    560,
    { keyGreen: true, position: 'south' },
  ),
  asset(
    'stall-papers-keeper-idle-2.png',
    'exec-d591d78d-1770-4db6-8fe9-e59bcfdd6e0d',
    152,
    560,
    { keyGreen: true, position: 'south' },
  ),
  asset(
    'stall-manual-customer-idle-1.png',
    'exec-cf8e264f-9c20-4a19-8151-d263dfae728b',
    208,
    384,
    { keyGreen: true, position: 'south' },
  ),
  asset(
    'stall-manual-customer-idle-2.png',
    'exec-c087b9fd-5789-473e-afaa-bb5d779483f9',
    208,
    384,
    { keyGreen: true, position: 'south' },
  ),

  asset(
    'prop-lightstrip-1.png',
    'exec-767e5d81-1154-4c73-bc95-299f643737dc',
    768,
    192,
    { keyGreen: true, position: 'north' },
  ),
  asset(
    'prop-lightstrip-2.png',
    'exec-34118e2b-cb34-4216-8474-1b07e8d0d2a5',
    768,
    192,
    { keyGreen: true, position: 'north' },
  ),
  asset(
    'prop-lightstrip-3.png',
    'exec-f5c11f8f-c714-4db3-838d-984c66b6c3c4',
    768,
    192,
    { keyGreen: true, position: 'north' },
  ),
  asset(
    'live-rat-1.png',
    'exec-9c6fedf7-2cd0-4907-8fdb-d5651e38250d',
    128,
    64,
    { keyGreen: true, position: 'south' },
  ),
  asset(
    'live-rat-2.png',
    'exec-54ef2151-b334-46f5-9c40-51e58309fcbb',
    128,
    64,
    { keyGreen: true, position: 'south' },
  ),
]

if (assets.length !== 98) {
  throw new Error(`Expected 98 PNG assets, found ${assets.length}`)
}

const metadata = {
  street: {
    desktop: {
      doorSlotPct: { x: 53.33, y: 38.57, w: 12.0, h: 54.29 },
      signSlotPct: { x: 50.67, y: 27.14, w: 17.33, h: 11.43 },
      busSlotPct: { x: 16.67, y: 45.71, w: 20.0, h: 54.29 },
    },
    mobile: {
      doorSlotPct: { x: 61.18, y: 61.03, w: 21.18, h: 38.97 },
      signSlotPct: { x: 56.47, y: 52.82, w: 30.59, h: 8.21 },
      busSlotPct: { x: 0.59, y: 61.03, w: 35.29, h: 38.97 },
    },
  },
  stalls: {
    uses: {
      desktop: {
        openingRectPct: { x: 11.11, y: 18.33, w: 77.5, h: 30.0 },
        countertopTopYPct: 48.33,
      },
      mobile: {
        openingRectPct: { x: 10.87, y: 17.24, w: 78.13, h: 31.04 },
        countertopTopYPct: 48.28,
      },
    },
    games: {
      desktop: {
        openingRectPct: { x: 15.69, y: 35.73, w: 70.42, h: 56.77 },
        countertopTopYPct: null,
      },
      mobile: {
        openingRectPct: { x: 17.26, y: 36.21, w: 65.35, h: 58.51 },
        countertopTopYPct: null,
      },
    },
    travel: {
      desktop: {
        openingRectPct: { x: 20.0, y: 33.54, w: 59.86, h: 48.85 },
        countertopTopYPct: null,
      },
      mobile: {
        openingRectPct: { x: 19.57, y: 34.81, w: 60.6, h: 38.47 },
        countertopTopYPct: null,
      },
    },
    manual: {
      desktop: {
        openingRectPct: { x: 20.23, y: 22.67, w: 60.85, h: 25.66 },
        countertopTopYPct: 48.33,
      },
      mobile: {
        openingRectPct: { x: 15.9, y: 23.24, w: 67.8, h: 25.04 },
        countertopTopYPct: 48.28,
      },
    },
    console: {
      desktop: {
        openingRectPct: { x: 20.42, y: 32.19, w: 59.17, h: 45.42 },
        countertopTopYPct: null,
      },
      mobile: {
        openingRectPct: { x: 19.43, y: 38.15, w: 61.01, h: 47.63 },
        countertopTopYPct: null,
      },
    },
    projects: {
      desktop: {
        openingRectPct: { x: 20.83, y: 41.88, w: 58.06, h: 32.92 },
        countertopTopYPct: null,
      },
      mobile: {
        openingRectPct: { x: 23.37, y: 42.67, w: 53.13, h: 35.88 },
        countertopTopYPct: null,
      },
    },
    talks: {
      desktop: {
        openingRectPct: { x: 7.22, y: 15.0, w: 85.56, h: 18.33 },
        countertopTopYPct: 33.33,
      },
      mobile: {
        openingRectPct: { x: 11.96, y: 15.52, w: 76.63, h: 18.96 },
        countertopTopYPct: 34.48,
      },
    },
    papers: {
      desktop: {
        openingRectPct: { x: 12.64, y: 18.33, w: 74.72, h: 30.0 },
        countertopTopYPct: 48.33,
      },
      mobile: {
        openingRectPct: { x: 16.71, y: 17.24, w: 66.3, h: 31.04 },
        countertopTopYPct: 48.28,
      },
    },
  },
}

const sha256 = async (path) =>
  createHash('sha256')
    .update(await readFile(path))
    .digest('hex')

const normalizeKeyGreen = async (input, output) => {
  const { data, info } = await sharp(input)
    .removeAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true })

  for (let index = 0; index < data.length; index += info.channels) {
    const red = data[index]
    const green = data[index + 1]
    const blue = data[index + 2]
    if (green >= 150 && green >= red * 1.45 && green >= blue * 1.35) {
      data[index] = 0
      data[index + 1] = 255
      data[index + 2] = 0
    }
  }

  await sharp(data, {
    raw: { width: info.width, height: info.height, channels: info.channels },
  })
    .png({ compressionLevel: 9, adaptiveFiltering: false })
    .toFile(output)
}

const largestKeyBounds = (data, width, height, channels) => {
  const pixelCount = width * height
  const seen = new Uint8Array(pixelCount)
  const queue = new Int32Array(pixelCount)
  let best = null

  const isKey = (pixel) => {
    const offset = pixel * channels
    return (
      data[offset] === 0 && data[offset + 1] === 255 && data[offset + 2] === 0
    )
  }

  for (let start = 0; start < pixelCount; start += 1) {
    if (seen[start] || !isKey(start)) continue
    let head = 0
    let tail = 1
    let count = 0
    let minX = width
    let minY = height
    let maxX = 0
    let maxY = 0
    queue[0] = start
    seen[start] = 1

    while (head < tail) {
      const pixel = queue[head]
      head += 1
      if (!isKey(pixel)) continue
      const x = pixel % width
      const y = Math.floor(pixel / width)
      count += 1
      minX = Math.min(minX, x)
      minY = Math.min(minY, y)
      maxX = Math.max(maxX, x)
      maxY = Math.max(maxY, y)

      const neighbours = [
        x > 0 ? pixel - 1 : -1,
        x + 1 < width ? pixel + 1 : -1,
        y > 0 ? pixel - width : -1,
        y + 1 < height ? pixel + width : -1,
      ]
      for (const neighbour of neighbours) {
        if (neighbour >= 0 && !seen[neighbour] && isKey(neighbour)) {
          seen[neighbour] = 1
          queue[tail] = neighbour
          tail += 1
        }
      }
    }

    if (!best || count > best.count) {
      best = { count, minX, minY, maxX, maxY }
    }
  }

  if (!best) throw new Error('No #00ff00 service opening found')
  return best
}

const reflowOpening = async (input, output, target) => {
  const image = sharp(input)
  const { data, info } = await image.raw().toBuffer({ resolveWithObject: true })
  const bounds = largestKeyBounds(data, info.width, info.height, info.channels)
  const sourceTop = bounds.minY
  const sourceBottom = bounds.maxY + 1
  const sourceLeft = bounds.minX
  const sourceRight = bounds.maxX + 1
  const targetTop = Math.round((target.top / 100) * info.height)
  const targetBottom = Math.round((target.bottom / 100) * info.height)
  const targetOpeningHeight = targetBottom - targetTop

  const top = await sharp(input)
    .extract({
      left: 0,
      top: 0,
      width: info.width,
      height: Math.max(1, sourceTop),
    })
    .resize(info.width, Math.max(1, targetTop), {
      fit: 'fill',
      kernel: sharp.kernel.nearest,
    })
    .png()
    .toBuffer()
  const bottom = await sharp(input)
    .extract({
      left: 0,
      top: sourceBottom,
      width: info.width,
      height: Math.max(1, info.height - sourceBottom),
    })
    .resize(info.width, Math.max(1, info.height - targetBottom), {
      fit: 'fill',
      kernel: sharp.kernel.nearest,
    })
    .png()
    .toBuffer()

  const composites = [
    { input: top, left: 0, top: 0 },
    { input: bottom, left: 0, top: targetBottom },
  ]
  if (sourceLeft > 0) {
    const left = await sharp(input)
      .extract({
        left: 0,
        top: sourceTop,
        width: sourceLeft,
        height: sourceBottom - sourceTop,
      })
      .resize(sourceLeft, targetOpeningHeight, {
        fit: 'fill',
        kernel: sharp.kernel.nearest,
      })
      .png()
      .toBuffer()
    composites.push({ input: left, left: 0, top: targetTop })
  }
  if (sourceRight < info.width) {
    const right = await sharp(input)
      .extract({
        left: sourceRight,
        top: sourceTop,
        width: info.width - sourceRight,
        height: sourceBottom - sourceTop,
      })
      .resize(info.width - sourceRight, targetOpeningHeight, {
        fit: 'fill',
        kernel: sharp.kernel.nearest,
      })
      .png()
      .toBuffer()
    composites.push({ input: right, left: sourceRight, top: targetTop })
  }
  if (target.noren) {
    const curtainHeight = Math.round(info.height * 0.06)
    const openingWidth = sourceRight - sourceLeft
    const gap = Math.max(2, Math.round(info.width * 0.004))
    const panelWidth = Math.floor((openingWidth - gap * 4) / 5)
    for (let panel = 0; panel < 5; panel += 1) {
      const width =
        panel === 4
          ? sourceRight - (sourceLeft + panel * (panelWidth + gap))
          : panelWidth
      const curtain = await sharp({
        create: {
          width,
          height: curtainHeight,
          channels: 3,
          background:
            panel % 2 === 0
              ? { r: 184, g: 28, b: 64 }
              : { r: 219, g: 46, b: 83 },
        },
      })
        .png()
        .toBuffer()
      composites.push({
        input: curtain,
        left: sourceLeft + panel * (panelWidth + gap),
        top: targetTop,
      })
    }
  }

  await sharp({
    create: {
      width: info.width,
      height: info.height,
      channels: 3,
      background: { r: 0, g: 255, b: 0 },
    },
  })
    .composite(composites)
    .png({ compressionLevel: 9, adaptiveFiltering: false })
    .toFile(output)
}

const stageRoot = await mkdtemp(join(tmpdir(), 'bazaar2-final-'))
await mkdir(destinationRoot, { recursive: true })

const verification = []
for (const item of assets) {
  const staged = join(stageRoot, item.name)
  const resized = item.keyGreen ? `${staged}.resized.png` : staged

  await sharp(item.source)
    .removeAlpha()
    .resize(item.width, item.height, {
      fit: 'cover',
      position: item.position,
      kernel: sharp.kernel.nearest,
    })
    .png({
      compressionLevel: 9,
      adaptiveFiltering: false,
      palette: true,
      colours: 32,
      dither: 0,
      effort: 10,
    })
    .toFile(resized)

  if (item.keyGreen) {
    const normalized = item.openingTarget ? `${staged}.normalized.png` : staged
    await normalizeKeyGreen(resized, normalized)
    if (item.openingTarget) {
      await reflowOpening(normalized, staged, item.openingTarget)
      await rm(normalized)
    }
    await rm(resized)
  }

  const mounted = join(destinationRoot, item.name)
  await copyFile(staged, mounted)
  const [stageHash, mountedHash] = await Promise.all([
    sha256(staged),
    sha256(mounted),
  ])
  if (stageHash !== mountedHash) {
    throw new Error(`Mounted file differs from final render: ${item.name}`)
  }
  verification.push({
    name: item.name,
    width: item.width,
    height: item.height,
    sha256: mountedHash,
  })
}

const metadataStage = join(stageRoot, 'asset-metadata.json')
await writeFile(metadataStage, `${JSON.stringify(metadata, null, 2)}\n`)
const metadataMounted = join(destinationRoot, 'asset-metadata.json')
await copyFile(metadataStage, metadataMounted)
const [metadataStageHash, metadataMountedHash] = await Promise.all([
  sha256(metadataStage),
  sha256(metadataMounted),
])
if (metadataStageHash !== metadataMountedHash) {
  throw new Error('Mounted metadata differs from staged metadata')
}

await writeFile(
  join(destinationRoot, 'asset-verification.json'),
  `${JSON.stringify(
    {
      generatedAt: new Date().toISOString(),
      files: verification,
      metadataSha256: metadataMountedHash,
    },
    null,
    2,
  )}\n`,
)

await rm(stageRoot, { recursive: true })
console.log(
  JSON.stringify({
    pngCount: verification.length,
    metadata: metadataMounted,
    destination: destinationRoot,
    byteIdentical: true,
  }),
)
