import { mkdir } from 'node:fs/promises'
import path from 'node:path'
import sharp from 'sharp'

const ROOT = process.cwd()
const OUTPUT_ROOT = path.join(
  ROOT,
  'public/images/bazaar3/assets/integration/stalls',
)
const REPORT_ROOT = path.join(
  ROOT,
  'scripts/bazaar3/reports/integration/workshop-v2/local-plates',
)

const LOGICAL = { width: 320, height: 421 }

const STALLS = {
  manual: { width: 960, height: 1264 },
  console: { width: 960, height: 1264 },
  talks: { width: 941, height: 1006 },
}

const PLATES = {
  manual: {
    rear: `
      <path d="M0 88H20V102H8V310H0Z" fill="#030303"/>
      <path d="M0 94H13V102H6V310H0Z" fill="#34363a"/>
      <path d="M300 74H320V316H312V91H300Z" fill="#030303"/>
      <path d="M307 82H320V310H315V88H307Z" fill="#4b4844"/>
      <path d="M0 304H28V313H0ZM292 309H320V318H292Z" fill="#855521"/>
    `,
    light: `
      <path d="M73 193H247L272 297H49Z" fill="#b87a30"/>
      <path d="M98 226H222L240 302H80Z" fill="#e3bc7f"/>
      <path d="M126 206H197L207 240H117Z" fill="#615d5a"/>
    `,
    caster: `
      <path d="M37 368H276L290 384L278 397H42L25 384Z" fill="#030303"/>
      <path d="M78 350H241L260 365H59Z" fill="#061016"/>
    `,
    contact: `
      <path d="M18 381H75L83 390H13Z" fill="#030303"/>
      <path d="M108 371H215L226 386H97Z" fill="#030303"/>
      <path d="M248 378H307L314 389H240Z" fill="#030303"/>
    `,
    front: `
      <path d="M0 388H43V394H0Z" fill="#192025"/>
      <path d="M277 390H320V397H277Z" fill="#192025"/>
      <path d="M22 367H31V373H42V380H55V386H69V392H83V399H97V406H111V412H123V418H108V414H94V408H80V402H66V396H52V390H39V383H28V376H22Z" fill="#030303"/>
      <path d="M25 369H31V375H43V382H56V388H70V394H84V401H98V407H112V413H118V416H108V411H94V405H80V398H66V392H52V386H39V379H28V373H25Z" fill="#855521"/>
      <path d="M100 408H127V421H100Z" fill="#34363a"/>
      <path d="M105 411H122V418H105Z" fill="#615d5a"/>
    `,
  },
  console: {
    rear: `
      <path d="M26 44H39V286H26Z" fill="#030303"/>
      <path d="M30 48H35V282H30Z" fill="#34363a"/>
      <path d="M26 84H126V94H26Z" fill="#030303"/>
      <path d="M33 87H126V91H33Z" fill="#4b4844"/>
      <path d="M116 74H154V104H116Z" fill="#030303"/>
      <path d="M121 79H149V99H121Z" fill="#192025"/>
      <path d="M274 26H285V253H274Z" fill="#030303"/>
      <path d="M278 31H282V249H278Z" fill="#34363a"/>
      <path d="M268 244H291V263H268Z" fill="#030303"/>
      <path d="M273 248H286V259H273Z" fill="#855521"/>
    `,
    light: `
      <path d="M54 245H257L289 397H28Z" fill="#23575b"/>
      <path d="M80 270H235L260 382H58Z" fill="#3e8583"/>
      <path d="M114 284H210L224 346H101Z" fill="#6aa4a1"/>
    `,
    caster: `
      <path d="M12 367H286L311 390L293 406H21L0 389Z" fill="#030303"/>
      <path d="M45 352H264L285 370H26Z" fill="#061016"/>
    `,
    contact: `
      <path d="M0 362H69L82 375H6Z" fill="#030303"/>
      <path d="M73 344H240L264 378H55Z" fill="#030303"/>
      <path d="M248 357H320V381H261Z" fill="#030303"/>
      <path d="M20 386H64L70 395H14Z" fill="#192025"/>
      <path d="M265 386H310L316 396H259Z" fill="#192025"/>
    `,
    front: `
      <path d="M0 378H16V384H30V391H46V398H64V405H84V412H107V421H88V417H67V410H49V403H33V396H19V389H7V384H0Z" fill="#030303"/>
      <path d="M0 380H13V386H27V393H43V400H61V407H81V414H99V418H88V415H67V408H49V401H33V394H19V387H7V383H0Z" fill="#855521"/>
      <path d="M242 370H254V377H269V384H286V391H304V398H320V406H301V401H283V394H266V387H251V380H242Z" fill="#030303"/>
      <path d="M246 372H254V379H269V386H286V393H304V400H320V403H305V397H283V390H266V383H251V377H246Z" fill="#3e8583"/>
      <path d="M88 411H117V421H88Z" fill="#34363a"/>
      <path d="M94 414H112V418H94Z" fill="#6aa4a1"/>
    `,
  },
  talks: {
    rear: `
      <path d="M9 54H24V299H9Z" fill="#030303"/>
      <path d="M14 59H20V294H14Z" fill="#4b4844"/>
      <path d="M9 118H88V129H9Z" fill="#030303"/>
      <path d="M15 121H88V126H15Z" fill="#855521"/>
      <path d="M73 110H109V140H73Z" fill="#030303"/>
      <path d="M78 115H104V135H78Z" fill="#192025"/>
      <path d="M294 69H310V315H294Z" fill="#030303"/>
      <path d="M299 75H305V309H299Z" fill="#34363a"/>
      <path d="M263 86H302V97H263Z" fill="#030303"/>
      <path d="M267 89H298V94H267Z" fill="#4b4844"/>
    `,
    light: `
      <path d="M24 242H287L315 390H0Z" fill="#855521"/>
      <path d="M84 250H256L279 380H59Z" fill="#b87a30"/>
      <path d="M11 262H96L113 355H0Z" fill="#4b8298"/>
      <path d="M27 277H86L98 340H13Z" fill="#72a9be"/>
    `,
    caster: `
      <path d="M2 359H305L320 382L304 400H15L0 382Z" fill="#030303"/>
      <path d="M42 343H279L296 362H25Z" fill="#061016"/>
    `,
    contact: `
      <path d="M0 348H96L109 373H9Z" fill="#030303"/>
      <path d="M106 339H251L267 372H95Z" fill="#030303"/>
      <path d="M257 334H320V378H266Z" fill="#030303"/>
      <path d="M19 379H79L87 390H11Z" fill="#192025"/>
      <path d="M270 378H313L319 390H263Z" fill="#192025"/>
    `,
    front: `
      <path d="M0 376H13V382H28V388H45V395H63V401H81V408H102V415H126V421H105V418H84V411H65V404H47V398H30V391H15V385H0Z" fill="#030303"/>
      <path d="M0 378H12V384H27V390H44V397H62V403H80V410H101V417H116V419H105V414H84V407H65V400H47V394H30V387H15V381H0Z" fill="#4b8298"/>
      <path d="M39 355H62V370H39Z" fill="#030303"/>
      <path d="M43 358H58V367H43Z" fill="#e3bc7f"/>
      <path d="M68 363H91V377H68Z" fill="#030303"/>
      <path d="M72 366H87V374H72Z" fill="#855521"/>
    `,
  },
}

function svg(body) {
  return Buffer.from(`
    <svg xmlns="http://www.w3.org/2000/svg"
      width="${LOGICAL.width}" height="${LOGICAL.height}"
      viewBox="0 0 ${LOGICAL.width} ${LOGICAL.height}"
      shape-rendering="crispEdges">
      ${body}
    </svg>
  `)
}

async function writePlate(stallId, phase, body) {
  const dimensions = STALLS[stallId]
  const outputDir = path.join(OUTPUT_ROOT, stallId, 'desktop')
  const reportDir = path.join(REPORT_ROOT, stallId)
  const output = path.join(outputDir, `${phase}.png`)
  const preview = path.join(reportDir, `${phase}.png`)

  await mkdir(outputDir, { recursive: true })
  await mkdir(reportDir, { recursive: true })

  const logical = await sharp(svg(body))
    .ensureAlpha()
    .png({ palette: true, colors: 12, dither: 0 })
    .toBuffer()
  const delivered = await sharp(logical)
    .resize({
      width: dimensions.width,
      height: dimensions.height,
      fit: 'fill',
      kernel: sharp.kernel.nearest,
    })
    .png({ palette: true, colors: 12, dither: 0 })
    .toBuffer()

  await sharp(delivered).toFile(output)
  await sharp(delivered).toFile(preview)

  return output
}

const outputs = []
for (const [stallId, phases] of Object.entries(PLATES)) {
  for (const [phase, body] of Object.entries(phases)) {
    outputs.push(await writePlate(stallId, phase, body))
  }
}

for (const output of outputs) console.log(path.relative(ROOT, output))
