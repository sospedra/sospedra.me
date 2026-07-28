import { mkdir, writeFile } from 'node:fs/promises'
import path from 'node:path'
import sharp from 'sharp'

const ROOT = process.cwd()
const SCRIPT_DIR = path.join(ROOT, 'scripts/bazaar3/manual-camera')
const OUTPUT_DIR = path.join(SCRIPT_DIR, 'artifacts')
const PNG_PATH = path.join(OUTPUT_DIR, 'manual-camera-guide-960x1264.png')
const GENERATION_PNG_PATH = path.join(
  OUTPUT_DIR,
  'manual-camera-generation-guide-960x1264.png',
)
const JSON_PATH = path.join(OUTPUT_DIR, 'manual-camera-guide.json')

const canvas = Object.freeze({ width: 960, height: 1264 })

const geometry = Object.freeze({
  safeArt: { x: 54, y: 42, width: 852, height: 1172 },
  overheadBeam: { x: 72, y: 72, width: 816, height: 104 },
  leftUpright: { x: 72, y: 128, width: 62, height: 940 },
  rightUpright: { x: 826, y: 128, width: 62, height: 940 },
  rearWall: { x: 134, y: 176, width: 692, height: 618 },
  rearToolBand: { x: 156, y: 296, width: 648, height: 42 },
  robotRearAisle: { x: 268, y: 326, width: 424, height: 482 },
  robotTorsoKeepClear: { x: 330, y: 390, width: 300, height: 292 },
  counterTop: { x: 108, y: 776, width: 744, height: 48 },
  counterFront: { x: 108, y: 824, width: 744, height: 222 },
  counterOcclusion: { x: 266, y: 776, width: 428, height: 102 },
  floorBand: { x: 72, y: 1046, width: 816, height: 122 },
  trench: { x: 72, y: 1124, width: 816, height: 54 },
  frontLip: { x: 54, y: 1178, width: 852, height: 36 },
})

const cameraRules = Object.freeze({
  projection: 'frontal-oblique parallel projection',
  authority: 'public/images/bazaar3/assets/stalls/uses/frames/idle-1.png',
  verticals: {
    targetDegrees: 90,
    toleranceDegrees: 3.5,
    rule: 'All architectural uprights stay vertical and parallel.',
  },
  horizontals: {
    targetDegrees: 0,
    toleranceDegrees: 3.5,
    rule: 'Counter, beams, shelves, wall bands, floor lips, and trench stay horizontal and parallel.',
  },
  shallowTopBands: {
    maximumVisualDepthPx: 48,
    rule: 'Only shallow compressed top bands are visible. Never draw deep tabletops or floor planes.',
  },
  perspective: {
    vanishingPoint: false,
    convergence: false,
    rotation: false,
    rule: 'No receding side walls, converging shelves, perspective floor tiles, or rotated stall.',
  },
})

const robotRules = Object.freeze({
  placement: 'rear aisle behind the counter',
  floats: true,
  attachedToCounter: false,
  standingOnCounter: false,
  bodyCenter: { x: 480, y: 540 },
  bodyEnvelope: { x: 330, y: 390, width: 300, height: 292 },
  counterOccludesLowerAssembly: true,
  minimumVisibleAirGapAboveCounterPx: 34,
  note: 'The robot occupies the room behind the counter. The counter crosses in front of its lower thruster/arms; it is never perched on the countertop.',
})

const roi = Object.freeze({
  counter: { x: 82, y: 736, width: 796, height: 330 },
  leftFrame: { x: 40, y: 82, width: 170, height: 1000 },
  rightFrame: { x: 750, y: 82, width: 170, height: 1000 },
  topArchitecture: { x: 54, y: 42, width: 852, height: 330 },
  rearArchitecture: { x: 112, y: 174, width: 736, height: 596 },
  floorTrench: { x: 42, y: 1020, width: 876, height: 220 },
  robotExclusion: { x: 246, y: 304, width: 468, height: 468 },
})

const manifest = {
  schemaVersion: 1,
  id: 'bazaar3-manual-camera-lock-v1',
  canvas,
  authoredPixelScale: 3,
  artifacts: {
    annotatedGuide:
      'scripts/bazaar3/manual-camera/artifacts/manual-camera-guide-960x1264.png',
    imageGenGuide:
      'scripts/bazaar3/manual-camera/artifacts/manual-camera-generation-guide-960x1264.png',
  },
  intendedUse:
    'Attach the text-free imageGenGuide beside Uses and the approved Manual identity reference. Preserve this exact camera/layout; redesign only the robot and tenant-specific contents. Keep the annotatedGuide for human review.',
  geometry,
  cameraRules,
  robotRules,
  analysisRegions: roi,
  absoluteProhibitions: [
    'No vanishing point.',
    'No converging floor, shelf, counter, wall, or ceiling lines.',
    'No rotated counter.',
    'No deep trapezoid tabletop.',
    'No visible side-wall perspective box.',
    'No robot attached to, standing on, or emerging from the counter.',
    'No counter or environment movement between animation frames.',
  ],
}

const label = (x, y, text, fill = '#f4ead3', size = 19) =>
  `<text x="${x}" y="${y}" fill="${fill}" font-family="monospace" font-size="${size}" font-weight="700">${text}</text>`

const dimensionLine = (x1, y1, x2, y2, text, tx, ty) => `
  <line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="#ffcf62" stroke-width="3" stroke-dasharray="9 9"/>
  ${label(tx, ty, text, '#ffcf62', 16)}
`

const svg = `
<svg xmlns="http://www.w3.org/2000/svg" width="${canvas.width}" height="${canvas.height}" viewBox="0 0 ${canvas.width} ${canvas.height}">
  <rect width="${canvas.width}" height="${canvas.height}" fill="#111820"/>
  <rect x="18" y="18" width="924" height="1228" fill="none" stroke="#263643" stroke-width="3"/>

  <!-- Rear wall and strictly frontal architectural frame. -->
  <rect x="${geometry.rearWall.x}" y="${geometry.rearWall.y}" width="${geometry.rearWall.width}" height="${geometry.rearWall.height}" fill="#1a242c" stroke="#76d8d0" stroke-width="4"/>
  <rect x="${geometry.overheadBeam.x}" y="${geometry.overheadBeam.y}" width="${geometry.overheadBeam.width}" height="${geometry.overheadBeam.height}" fill="#28333b" stroke="#f4ead3" stroke-width="6"/>
  <rect x="${geometry.leftUpright.x}" y="${geometry.leftUpright.y}" width="${geometry.leftUpright.width}" height="${geometry.leftUpright.height}" fill="#253039" stroke="#f4ead3" stroke-width="6"/>
  <rect x="${geometry.rightUpright.x}" y="${geometry.rightUpright.y}" width="${geometry.rightUpright.width}" height="${geometry.rightUpright.height}" fill="#253039" stroke="#f4ead3" stroke-width="6"/>
  <rect x="${geometry.rearToolBand.x}" y="${geometry.rearToolBand.y}" width="${geometry.rearToolBand.width}" height="${geometry.rearToolBand.height}" fill="#303c45" stroke="#76d8d0" stroke-width="4"/>

  <!-- The robot zone is behind the counter. -->
  <rect x="${geometry.robotRearAisle.x}" y="${geometry.robotRearAisle.y}" width="${geometry.robotRearAisle.width}" height="${geometry.robotRearAisle.height}" rx="12" fill="#25414a" fill-opacity=".55" stroke="#6ee7ee" stroke-width="4" stroke-dasharray="13 9"/>
  <ellipse cx="480" cy="532" rx="144" ry="132" fill="#304e57" stroke="#6ee7ee" stroke-width="5"/>
  <line x1="480" y1="664" x2="480" y2="750" stroke="#6ee7ee" stroke-width="7" stroke-dasharray="12 9"/>
  <path d="M438 747 L480 798 L522 747" fill="none" stroke="#6ee7ee" stroke-width="7"/>
  ${label(320, 372, 'FLOATING ROBOT — REAR AISLE', '#6ee7ee', 18)}
  ${label(367, 575, 'BODY / ARMS', '#9af4ef', 19)}
  ${label(374, 607, 'FLOAT CLEAR', '#9af4ef', 19)}

  <!-- Strictly horizontal, shallow counter top and solid front face. -->
  <rect x="${geometry.counterTop.x}" y="${geometry.counterTop.y}" width="${geometry.counterTop.width}" height="${geometry.counterTop.height}" fill="#b16e38" stroke="#f4ead3" stroke-width="6"/>
  <rect x="${geometry.counterFront.x}" y="${geometry.counterFront.y}" width="${geometry.counterFront.width}" height="${geometry.counterFront.height}" fill="#5b392b" stroke="#f4ead3" stroke-width="6"/>
  <rect x="${geometry.counterOcclusion.x}" y="${geometry.counterOcclusion.y}" width="${geometry.counterOcclusion.width}" height="${geometry.counterOcclusion.height}" fill="#d48443" fill-opacity=".22" stroke="#ffcf62" stroke-width="4" stroke-dasharray="12 9"/>
  ${label(300, 810, 'SHALLOW HORIZONTAL TOP BAND', '#fff1b2', 18)}
  ${label(287, 856, 'COUNTER OCCLUDES ROBOT', '#ffcf62', 18)}
  ${label(348, 938, 'FRONT ELEVATION', '#f4ead3', 22)}

  <!-- Flat floor strips: no deep receding plane and no perspective grid. -->
  <rect x="${geometry.floorBand.x}" y="${geometry.floorBand.y}" width="${geometry.floorBand.width}" height="${geometry.floorBand.height}" fill="#202a31" stroke="#f4ead3" stroke-width="5"/>
  <rect x="${geometry.trench.x}" y="${geometry.trench.y}" width="${geometry.trench.width}" height="${geometry.trench.height}" fill="#0a0e12" stroke="#76d8d0" stroke-width="5"/>
  <rect x="${geometry.frontLip.x}" y="${geometry.frontLip.y}" width="${geometry.frontLip.width}" height="${geometry.frontLip.height}" fill="#303b43" stroke="#f4ead3" stroke-width="5"/>
  ${label(354, 1101, 'SHALLOW FLOOR BAND', '#f4ead3', 18)}
  ${label(366, 1159, 'CABLE TRENCH', '#76d8d0', 18)}
  ${label(371, 1204, 'FRONT FLOOR LIP', '#f4ead3', 18)}

  <!-- Parallelism rails; every major line is 0° or 90°. -->
  <g stroke="#ffcf62" stroke-width="3" fill="none" opacity=".9">
    <line x1="54" y1="228" x2="906" y2="228" stroke-dasharray="15 9"/>
    <line x1="54" y1="702" x2="906" y2="702" stroke-dasharray="15 9"/>
    <line x1="54" y1="1078" x2="906" y2="1078" stroke-dasharray="15 9"/>
    <line x1="210" y1="42" x2="210" y2="1214" stroke-dasharray="15 9"/>
    <line x1="750" y1="42" x2="750" y2="1214" stroke-dasharray="15 9"/>
  </g>

  ${dimensionLine(108, 754, 852, 754, 'COUNTER = 0°', 390, 744)}
  ${dimensionLine(922, 128, 922, 1068, 'UPRIGHT = 90°', 716, 110)}

  ${label(48, 36, 'MANUAL CAMERA LOCK v1', '#f4ead3', 20)}
  ${label(617, 36, '960 × 1264', '#76d8d0', 18)}
  ${label(144, 1240, 'NO ROTATION • NO VANISHING POINT • NO CONVERGENCE', '#ff806e', 18)}
</svg>
`

const generationSvg = `
<svg xmlns="http://www.w3.org/2000/svg" width="${canvas.width}" height="${canvas.height}" viewBox="0 0 ${canvas.width} ${canvas.height}">
  <rect width="${canvas.width}" height="${canvas.height}" fill="#111820"/>

  <rect x="${geometry.rearWall.x}" y="${geometry.rearWall.y}" width="${geometry.rearWall.width}" height="${geometry.rearWall.height}" fill="#1b262e"/>

  <rect x="${geometry.overheadBeam.x}" y="${geometry.overheadBeam.y}" width="${geometry.overheadBeam.width}" height="${geometry.overheadBeam.height}" fill="#394650"/>
  <rect x="${geometry.leftUpright.x}" y="${geometry.leftUpright.y}" width="${geometry.leftUpright.width}" height="${geometry.leftUpright.height}" fill="#394650"/>
  <rect x="${geometry.rightUpright.x}" y="${geometry.rightUpright.y}" width="${geometry.rightUpright.width}" height="${geometry.rightUpright.height}" fill="#394650"/>

  <rect x="${geometry.rearToolBand.x}" y="${geometry.rearToolBand.y}" width="${geometry.rearToolBand.width}" height="${geometry.rearToolBand.height}" fill="#53636c"/>

  <ellipse cx="480" cy="536" rx="150" ry="146" fill="#4f8790"/>
  <polygon points="420,632 480,846 540,632" fill="#4f8790"/>

  <rect x="${geometry.counterTop.x}" y="${geometry.counterTop.y}" width="${geometry.counterTop.width}" height="${geometry.counterTop.height}" fill="#b16e38"/>
  <rect x="${geometry.counterTop.x}" y="${geometry.counterTop.y}" width="${geometry.counterTop.width}" height="8" fill="#080c10"/>
  <rect x="${geometry.counterFront.x}" y="${geometry.counterFront.y}" width="${geometry.counterFront.width}" height="${geometry.counterFront.height}" fill="#684333"/>

  <rect x="${geometry.floorBand.x}" y="${geometry.floorBand.y}" width="${geometry.floorBand.width}" height="${geometry.floorBand.height}" fill="#2c373e"/>
  <rect x="${geometry.trench.x}" y="${geometry.trench.y}" width="${geometry.trench.width}" height="${geometry.trench.height}" fill="#080c10"/>
  <rect x="${geometry.frontLip.x}" y="${geometry.frontLip.y}" width="${geometry.frontLip.width}" height="${geometry.frontLip.height}" fill="#46535b"/>
</svg>
`

await mkdir(OUTPUT_DIR, { recursive: true })
await sharp(Buffer.from(svg)).png().toFile(PNG_PATH)
await sharp(Buffer.from(generationSvg)).png().toFile(GENERATION_PNG_PATH)
await writeFile(JSON_PATH, `${JSON.stringify(manifest, null, 2)}\n`)

console.log(path.relative(ROOT, PNG_PATH))
console.log(path.relative(ROOT, GENERATION_PNG_PATH))
console.log(path.relative(ROOT, JSON_PATH))
