export type CrosswordLocale = 'en' | 'es'
export type CrosswordDirection = 'across' | 'down'

export type CrosswordEntry = {
  id: string
  number: number
  direction: CrosswordDirection
  row: number
  column: number
  length: number
  cells: number[]
  gridAnswer: string
  clue?: string
}

export type CrosswordCell = {
  index: number
  row: number
  column: number
  solution: string | null
  number?: number
  entryIds: string[]
}

export type CrosswordPuzzle = {
  schemaVersion: 1
  id: string
  locale: CrosswordLocale
  publicationDate: string
  title: string
  storyDeck: string
  author: string
  difficulty: 1 | 2 | 3 | 4 | 5
  width: number
  height: number
  cells: CrosswordCell[]
  entries: CrosswordEntry[]
}

type ClueBook = {
  across: Record<string, string>
  down: Record<string, string>
}

const EN_SOLUTION = [
  'AREAS#CSS##FLIP',
  'SUNNI#APIS#BORE',
  'SNAIL#POLITICAL',
  '##MOONSTONE#ANT',
  'CHON#OUTS#ELLIS',
  'REUSABLE#DNA###',
  'EAR#SLED#RACISM',
  'PRESSES#MAGENTA',
  'EDDIES#PAGE#DOS',
  '###CST#ENORMOUS',
  'PEAKS#ARNO#ANTE',
  'EMS#EPICENTRE##',
  'SCHEDULER#RISKS',
  'TEEN#GENE#ANIME',
  'SESS##STD#YEAST',
] as const

const ES_SOLUTION = [
  'CASAR#ALBA#TREN',
  'AGAPE#LOOR#RELE',
  'VALON#AMOR#OSEO',
  'ATENTADAMENTE##',
  'RAP#OLA##CIERZO',
  '###ASA#ABIA#VOZ',
  'PANTOMIMA#LLANO',
  'ATEO#ACABO#ADAN',
  'NOCLA#OLIENDOLO',
  'ZAR#RARO#SAO###',
  'AROMAR##PTS#CTA',
  '##FERROALEACION',
  'TROL#ORBE#RASES',
  'OTRO#PARO#DENSA',
  'PEON#ERAN#OREAR',
] as const

const EN_CLUES: ClueBook = {
  across: {
    AREAS: 'Regions or fields of study',
    CSS: 'Language that gives a web page its style, briefly',
    FLIP: 'Turn over in one quick motion',
    SUNNI: 'Major branch of Islam',
    APIS: 'Honeybee genus',
    BORE: 'Person whose stories never seem to end',
    SNAIL: 'Garden visitor with its house on its back',
    POLITICAL: 'Relating to government or public affairs',
    MOONSTONE: 'Pearly gem named for a night-sky body',
    ANT: 'Tiny colony worker',
    CHON: 'One hundredth of a South Korean won',
    OUTS: 'Retirements recorded in baseball',
    ELLIS: 'Island that welcomed millions to New York Harbor',
    REUSABLE: 'Designed to be used again',
    DNA: 'Genetic blueprint, for short',
    EAR: 'Organ that picks up sound',
    SLED: 'Snow-day vehicle',
    RACISM: 'Prejudice based on perceived race',
    PRESSES: 'Printing machines, or pushes firmly',
    MAGENTA: 'Vivid purplish-red printing color',
    EDDIES: 'Small circular currents',
    PAGE: 'Leaf in a book',
    DOS: 'Early Microsoft operating system',
    CST: 'Central winter time zone: abbr.',
    ENORMOUS: 'Far beyond ordinary size',
    PEAKS: 'Mountain tops',
    ARNO: 'River that flows through Florence',
    ANTE: 'Price of joining a poker hand',
    EMS: 'Typographic units as wide as the point size',
    EPICENTRE: 'Surface point directly above an earthquake',
    SCHEDULER: 'Tool that arranges work on a calendar',
    RISKS: 'Chances that might not pay off',
    TEEN: 'Person from thirteen through nineteen',
    GENE: 'Unit of heredity',
    ANIME: 'Japanese animation style',
    SESS: 'Session, in a clipped informal form',
    STD: 'Infection category, briefly',
    YEAST: 'Microbe that makes bread rise',
  },
  down: {
    ASS: 'Donkey',
    RUN: 'Score on a trip around the baseball bases',
    ENAMOURED: 'Completely charmed, in British spelling',
    ANIONS: 'Negatively charged particles',
    SILO: 'Tower for storing grain',
    CAPSULES: 'Small cases that may hold medicine',
    SPOTTED: 'Caught sight of',
    SILOS: 'Isolated stores of information, metaphorically',
    FBI: 'U.S. federal investigative agency',
    LOCAL: 'Neighborhood resident',
    IRANI: 'Person from Iran, in an older form',
    PELTS: 'Animal skins',
    SIN: 'Act that breaks a moral rule',
    TEENAGER: 'Person aged thirteen through nineteen',
    NOBLEST: 'Most honorable',
    CREPE: 'Very thin French pancake',
    HEARD: 'Perceived by ear',
    LACE: 'Cord threaded through a shoe',
    ASSESSED: 'Evaluated',
    DRAGOON: 'Old mounted infantryman',
    INDONESIA: 'Archipelago nation with Java and Bali',
    STOUT: 'Dark, full-bodied beer',
    MASSE: 'Curving billiards shot',
    SICK: 'Not feeling well',
    MANNERED: 'Affected rather than natural',
    PERCENT: 'Share out of one hundred',
    MARINE: 'Soldier trained for land and sea',
    PESTS: 'Unwanted garden visitors',
    EMCEE: 'Host with a microphone',
    ASHES: 'What remains after a fire',
    AILES: 'Is unwell, in an uncommon spelling',
    PUG: 'Small dog with a wrinkled face',
    TRAY: 'Flat carrier for dishes',
    ENS: 'Half-em typographic units',
    KMS: 'Metric distances, briefly',
    SET: 'Collection that belongs together',
  },
}

const ES_CLUES: ClueBook = {
  across: {
    CASAR: 'Unir en matrimonio',
    ALBA: 'Primera luz del día',
    TREN: 'Convoy sobre raíles',
    AGAPE: 'Banquete o comida fraternal',
    LOOR: 'Alabanza o elogio',
    RELE: 'Interruptor electromagnético',
    VALON: 'De Valonia, región belga',
    AMOR: 'Sentimiento que inspira cariño',
    OSEO: 'Relativo a los huesos',
    ATENTADAMENTE: 'Con cuidado y cortesía, como al cerrar una carta',
    RAP: 'Género de rimas sobre una base',
    OLA: 'Elevación del agua que avanza por la superficie',
    CIERZO: 'Viento frío del noroeste aragonés',
    ASA: 'Parte por la que se agarra una taza',
    ABIA: 'Arándano, en el habla rural alavesa',
    VOZ: 'Sonido producido por la laringe',
    PANTOMIMA: 'Representación teatral sin palabras',
    LLANO: 'Plano, sin desniveles',
    ATEO: 'Quien niega la existencia de Dios',
    ACABO: 'Pongo fin, en primera persona',
    ADAN: 'Primer hombre, según el Génesis',
    NOCLA: 'Cangrejo marino, en voz regional',
    OLIENDOLO: 'Percibiendo su aroma, con pronombre incluido',
    ZAR: 'Título de los antiguos emperadores rusos',
    RARO: 'Poco común o extraño',
    SAO: 'Pequeña sabana cubana con algunos matorrales',
    AROMAR: 'Perfumar o dar buen olor',
    PTS: 'Puntos, abreviado',
    CTA: 'Cuenta, abreviado',
    FERROALEACION: 'Aleación de hierro con otro elemento',
    TROL: 'Criatura fantástica que vive bajo un puente',
    ORBE: 'Mundo o esfera terrestre',
    RASES: 'Iguales al nivel, del verbo rasar',
    OTRO: 'Distinto del ya mencionado',
    PARO: 'Cese temporal del trabajo, o desempleo',
    DENSA: 'Espesa o compacta',
    PEON: 'Obrero no especializado, o pieza de ajedrez',
    ERAN: 'Forma pasada plural de ser',
    OREAR: 'Ventilar al aire',
  },
  down: {
    CAVAR: 'Remover tierra con una azada',
    AGATA: 'Cuarzo bandeado usado como piedra semipreciosa',
    SALEP: 'Fécula de orquídeas usada en una bebida oriental',
    APON: 'Imperativo singular de «aponer»',
    RENTOSO: 'Que produce renta',
    ALADA: 'Provista de alas',
    LOMA: 'Elevación suave y alargada',
    BOOM: 'Auge súbito',
    ARRECI: 'Me entumecí por el frío, en forma verbal poco usada',
    TROTE: 'Paso del caballo entre paso y galope',
    RESERVADO: 'Discreto o poco comunicativo',
    ELE: 'Nombre de la letra L',
    NEO: 'Prefijo que significa «nuevo»',
    ALAMA: 'Leguminosa de flores amarillas usada como pasto',
    NIAL: 'Almiar, en voz derivada de «nidal»',
    ZONAL: 'Relativo a una zona',
    OZONO: 'Gas de tres átomos de oxígeno',
    ATOL: 'Bebida espesa de maíz, variante de atole',
    AMALO: 'Quiérelo, en imperativo',
    BABI: 'Blusón que protege la ropa de un niño',
    PANZA: 'Barriga',
    ATOAR: 'Remolcar una embarcación',
    NECROFORO: 'Escarabajo que entierra pequeños animales',
    ICOR: 'Líquido seroso de ciertas úlceras, en cirugía antigua',
    LADO: 'Costado',
    OESTE: 'Punto cardinal por donde se pone el sol',
    ARAR: 'Abrir surcos en la tierra',
    NASARDO: 'Registro de órgano de sonido nasal',
    ARROPE: 'Mosto cocido hasta quedar como jarabe',
    MELON: 'Fruta de cáscara gruesa y pulpa dulce',
    PLEON: 'Abdomen de un crustáceo',
    CISNE: 'Ave acuática de cuello largo',
    TOESA: 'Antigua medida francesa de 1,946 metros',
    ANSAR: 'Ganso',
    ORAR: 'Rezar',
    ABRA: 'Ensenada pequeña',
    CAER: 'Ir hacia abajo por el propio peso',
    TOP: 'Lo más alto de una clasificación, en inglés',
    RTE: 'Remitente, abreviado',
  },
}

type PuzzleSource = {
  locale: CrosswordLocale
  publicationDate: string
  title: string
  storyDeck: string
  solution: readonly string[]
  clues?: ClueBook
}

const buildPuzzle = ({
  locale,
  publicationDate,
  title,
  storyDeck,
  solution,
  clues,
}: PuzzleSource): CrosswordPuzzle => {
  const height = solution.length
  const width = solution[0]?.length ?? 0
  const cells: CrosswordCell[] = solution.flatMap((row, rowIndex) =>
    [...row].map((character, columnIndex) => ({
      index: rowIndex * width + columnIndex,
      row: rowIndex,
      column: columnIndex,
      solution: character === '#' ? null : character,
      entryIds: [],
    })),
  )

  const entries: CrosswordEntry[] = []
  let nextNumber = 1

  for (let row = 0; row < height; row += 1) {
    for (let column = 0; column < width; column += 1) {
      const index = row * width + column
      if (cells[index]?.solution === null) continue

      const startsAcross =
        (column === 0 || cells[index - 1]?.solution === null) &&
        column < width - 1 &&
        cells[index + 1]?.solution !== null
      const startsDown =
        (row === 0 || cells[index - width]?.solution === null) &&
        row < height - 1 &&
        cells[index + width]?.solution !== null

      if (!startsAcross && !startsDown) continue
      const number = nextNumber
      nextNumber += 1
      cells[index].number = number

      const addEntry = (direction: CrosswordDirection) => {
        const path: number[] = []
        let cursor = index
        const step = direction === 'across' ? 1 : width

        while (
          cursor < cells.length &&
          cells[cursor]?.solution !== null &&
          (direction === 'down' ||
            Math.floor(cursor / width) === Math.floor(index / width))
        ) {
          path.push(cursor)
          cursor += step
        }

        const answer = path
          .map((cellIndex) => cells[cellIndex].solution)
          .join('')
        const id = `${number}-${direction}`

        entries.push({
          id,
          number,
          direction,
          row,
          column,
          length: path.length,
          cells: path,
          gridAnswer: answer,
          clue: clues?.[direction][answer],
        })
        for (const cellIndex of path) cells[cellIndex].entryIds.push(id)
      }

      if (startsAcross) addEntry('across')
      if (startsDown) addEntry('down')
    }
  }

  return {
    schemaVersion: 1,
    id: `${locale}:${publicationDate}`,
    locale,
    publicationDate,
    title,
    storyDeck,
    author: 'Sospedra Studio',
    difficulty: 3,
    width,
    height,
    cells,
    entries,
  }
}

export type CrosswordEdition = {
  en: CrosswordPuzzle
  es?: CrosswordPuzzle
}

type ChallengePuzzle = {
  title: string
  storyDeck: string
  solution: string[]
  clues?: ClueBook
}

export type CrosswordChallengeFile = {
  publicationDate: string
  puzzles: { en: ChallengePuzzle; es?: ChallengePuzzle }
}

const puzzleFromChallenge = (
  locale: CrosswordLocale,
  publicationDate: string,
  puzzle: ChallengePuzzle,
): CrosswordPuzzle =>
  buildPuzzle({
    locale,
    publicationDate,
    title: puzzle.title,
    storyDeck: puzzle.storyDeck,
    solution: puzzle.solution,
    clues: puzzle.clues,
  })

export const editionFromChallenge = (
  challenge: CrosswordChallengeFile,
): CrosswordEdition => ({
  en: puzzleFromChallenge(
    'en',
    challenge.publicationDate,
    challenge.puzzles.en,
  ),
  es: challenge.puzzles.es
    ? puzzleFromChallenge('es', challenge.publicationDate, challenge.puzzles.es)
    : undefined,
})

/* The launch edition predates the content pipeline and stays inline; every
   later edition arrives as a challenge file passed in by the page loader. */
export const LEGACY_EDITION: CrosswordEdition = {
  en: buildPuzzle({
    locale: 'en',
    publicationDate: '2026-07-27',
    title: 'Ink & signal',
    storyDeck:
      'Fifteen rows of unruly letters have agreed to cross—temporarily.',
    solution: EN_SOLUTION,
    clues: EN_CLUES,
  }),
  es: buildPuzzle({
    locale: 'es',
    publicationDate: '2026-07-27',
    title: 'Tinta y señal',
    storyDeck:
      'Quince filas de letras rebeldes han accedido a cruzarse… por ahora.',
    solution: ES_SOLUTION,
    clues: ES_CLUES,
  }),
}

export const puzzleForDate = (
  editions: CrosswordEdition[],
  isoDate: string,
): CrosswordEdition =>
  editions.findLast((edition) => edition.en.publicationDate <= isoDate) ??
  editions[0]
