import { type GameState, MENU_ITEMS, type Vec } from './engine'

// 84×48 LCD, the 3310's real resolution: score strip rows 0..5,
// bordered field y6..47, inside it a 20×10 grid of 4px sprites
export const LCD_W = 84
export const LCD_H = 48
const FIELD_Y = 6
const CELL = 4
const ORIGIN_X = 2
const ORIGIN_Y = 7

// PAPER matches the flat screen green baked into the phone art exactly,
// so the canvas edge never shows against the glass
const PAPER = '#a4cd03'
const INK = '#2d3516'

const HEAD_SPRITE = [0b0110, 0b1111, 0b1111, 0b0110]
const BODY_SPRITE = [0b1111, 0b1001, 0b1001, 0b1111]
const FOOD_SPRITE = [0b0100, 0b1110, 0b0100, 0b0000]

// 3×5 glyphs, one 3-bit number per row, leftmost pixel on bit 2
const FONT: Record<string, number[]> = {
  '0': [7, 5, 5, 5, 7],
  '1': [2, 6, 2, 2, 7],
  '2': [7, 1, 7, 4, 7],
  '3': [7, 1, 3, 1, 7],
  '4': [5, 5, 7, 1, 1],
  '5': [7, 4, 7, 1, 7],
  '6': [7, 4, 7, 5, 7],
  '7': [7, 1, 2, 2, 2],
  '8': [7, 5, 7, 5, 7],
  '9': [7, 5, 7, 1, 7],
  '<': [1, 2, 4, 2, 1],
  '>': [4, 2, 1, 2, 4],
  A: [2, 5, 7, 5, 5],
  C: [7, 4, 4, 4, 7],
  D: [6, 5, 5, 5, 6],
  E: [7, 4, 6, 4, 7],
  G: [7, 4, 5, 5, 7],
  K: [5, 5, 6, 5, 5],
  L: [4, 4, 4, 4, 7],
  M: [5, 7, 7, 5, 5],
  N: [6, 5, 5, 5, 5],
  O: [7, 5, 5, 5, 7],
  P: [7, 5, 7, 4, 4],
  R: [7, 5, 6, 5, 5],
  S: [7, 4, 7, 1, 7],
  T: [7, 2, 2, 2, 2],
  U: [5, 5, 5, 5, 7],
  V: [5, 5, 5, 5, 2],
  W: [5, 5, 7, 7, 5],
  ' ': [0, 0, 0, 0, 0],
}

type Ctx = CanvasRenderingContext2D

type TextSpot = { x: number; y: number; scale?: number }

const textWidth = (text: string, scale: number) =>
  text.length * 4 * scale - scale

const drawGlyph = (ctx: Ctx, glyph: number[], spot: TextSpot) => {
  const scale = spot.scale ?? 1
  for (const [row, bits] of glyph.entries()) {
    for (const col of [0, 1, 2]) {
      if ((bits >> (2 - col)) & 1) {
        ctx.fillRect(spot.x + col * scale, spot.y + row * scale, scale, scale)
      }
    }
  }
}

const drawText = (ctx: Ctx, text: string, spot: TextSpot) => {
  const scale = spot.scale ?? 1
  for (const [index, char] of text.split('').entries()) {
    drawGlyph(ctx, FONT[char] ?? FONT[' '], {
      x: spot.x + index * 4 * scale,
      y: spot.y,
      scale,
    })
  }
}

const drawCentered = (ctx: Ctx, text: string, spot: Omit<TextSpot, 'x'>) => {
  const scale = spot.scale ?? 1
  drawText(ctx, text, {
    x: Math.round((LCD_W - textWidth(text, scale)) / 2),
    y: spot.y,
    scale,
  })
}

const drawSprite = (ctx: Ctx, cell: Vec, sprite: number[]) => {
  const x = ORIGIN_X + cell.x * CELL
  const y = ORIGIN_Y + cell.y * CELL
  for (const [row, bits] of sprite.entries()) {
    for (const col of [0, 1, 2, 3]) {
      if ((bits >> (3 - col)) & 1) ctx.fillRect(x + col, y + row, 1, 1)
    }
  }
}

const clear = (ctx: Ctx) => {
  ctx.fillStyle = PAPER
  ctx.fillRect(0, 0, LCD_W, LCD_H)
  ctx.fillStyle = INK
}

type FrameOptions = {
  statusIcons?: boolean
}

const drawStatusIcons = (ctx: Ctx, level: number) => {
  // Four one-bit reception bars and a five-pixel battery sit in the real
  // six-row Nokia status strip. They are opt-in so the current route remains
  // byte-for-byte faithful while the V2 handset can expose more game state.
  for (let bar = 0; bar < 4; bar++) {
    ctx.fillRect(54 + bar * 2, 4 - bar, 1, bar + 1)
  }
  ctx.fillRect(64, 0, 7, 1)
  ctx.fillRect(64, 4, 7, 1)
  ctx.fillRect(64, 0, 1, 5)
  ctx.fillRect(70, 0, 1, 5)
  ctx.fillRect(71, 1, 1, 3)
  ctx.fillRect(65, 1, 4, 3)
  drawText(ctx, `L${level}`, { x: 76, y: 0 })
}

const drawChrome = (
  ctx: Ctx,
  score: number,
  level: number,
  options: FrameOptions,
) => {
  drawText(ctx, String(score).padStart(4, '0'), { x: 1, y: 0 })
  if (options.statusIcons) drawStatusIcons(ctx, level)
  ctx.fillRect(0, FIELD_Y, LCD_W, 1)
  ctx.fillRect(0, LCD_H - 1, LCD_W, 1)
  ctx.fillRect(0, FIELD_Y, 1, LCD_H - FIELD_Y)
  ctx.fillRect(LCD_W - 1, FIELD_Y, 1, LCD_H - FIELD_Y)
}

const drawBoard = (ctx: Ctx, state: GameState) => {
  const [head, ...body] = state.snake
  drawSprite(ctx, head, HEAD_SPRITE)
  for (const cell of body) drawSprite(ctx, cell, BODY_SPRITE)
  drawSprite(ctx, state.food, FOOD_SPRITE)
}

const drawDialog = (ctx: Ctx, lines: string[]) => {
  const width = Math.max(...lines.map((line) => textWidth(line, 1))) + 8
  const height = lines.length * 8 + 5
  const x = Math.round((LCD_W - width) / 2)
  const y = Math.round((FIELD_Y + LCD_H - height) / 2)
  ctx.fillStyle = PAPER
  ctx.fillRect(x, y, width, height)
  ctx.fillStyle = INK
  ctx.fillRect(x, y, width, 1)
  ctx.fillRect(x, y + height - 1, width, 1)
  ctx.fillRect(x, y, 1, height)
  ctx.fillRect(x + width - 1, y, 1, height)
  for (const [index, line] of lines.entries()) {
    drawCentered(ctx, line, { y: y + 4 + index * 8 })
  }
}

const menuLabel = (state: GameState, index: number) =>
  index === 1 ? `LEVEL ${state.level}` : MENU_ITEMS[index]

const drawMenu = (ctx: Ctx, state: GameState) => {
  drawCentered(ctx, 'SNAKE', { y: 2 })
  ctx.fillRect(0, 9, LCD_W, 1)
  for (const [index] of MENU_ITEMS.entries()) {
    const y = 12 + index * 10
    if (index !== state.menuIndex) {
      drawText(ctx, menuLabel(state, index), { x: 4, y: y + 2 })
      continue
    }
    ctx.fillRect(1, y, LCD_W - 2, 9)
    ctx.fillStyle = PAPER
    drawText(ctx, menuLabel(state, index), { x: 4, y: y + 2 })
    ctx.fillStyle = INK
  }
}

const drawLevel = (ctx: Ctx, state: GameState) => {
  drawCentered(ctx, 'LEVEL', { y: 5 })
  drawText(ctx, '<', { x: 25, y: 20 })
  drawText(ctx, '>', { x: 56, y: 20 })
  drawText(ctx, String(state.level), { x: 39, y: 17, scale: 2 })
  drawCentered(ctx, 'PRESS 5', { y: 38 })
}

const drawTops = (ctx: Ctx, state: GameState) => {
  drawCentered(ctx, 'TOP SCORE', { y: 5 })
  drawCentered(ctx, String(state.top).padStart(4, '0'), { y: 16, scale: 2 })
  drawCentered(ctx, 'PRESS 5', { y: 38 })
}

const drawGame = (ctx: Ctx, state: GameState, options: FrameOptions) => {
  drawChrome(ctx, state.score, state.level, options)
  drawBoard(ctx, state)
  if (state.phase === 'paused') drawDialog(ctx, ['PAUSED'])
  if (state.phase === 'over') {
    const top = `TOP ${String(state.top).padStart(4, '0')}`
    drawDialog(ctx, ['GAME OVER', top, 'PRESS 5'])
  }
}

export const drawFrame = (
  ctx: Ctx,
  state: GameState,
  options: FrameOptions = {},
) => {
  clear(ctx)
  switch (state.phase) {
    case 'menu':
      return drawMenu(ctx, state)
    case 'level':
      return drawLevel(ctx, state)
    case 'tops':
      return drawTops(ctx, state)
    case 'running':
    case 'paused':
    case 'over':
      return drawGame(ctx, state, options)
  }
}
