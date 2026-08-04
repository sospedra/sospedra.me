import type { Route } from 'next'
import uses from './uses.json'

type RawSection = (typeof uses)[number]
type RawItem = RawSection['items'][number]

type Verdict = 'goat' | 'buy' | 'fine' | 'cheap'

export const PRICE = {
  goat: '¥1,300',
  buy: '¥980',
  fine: '¥750',
  cheap: '¥380',
} satisfies Record<Verdict, string>

export const VERDICT_SR = {
  goat: 'goat tier, house special',
  buy: 'buy tier',
  fine: 'fine tier',
  cheap: 'go-cheap tier',
} satisfies Record<Verdict, string>

type Course = { numeral: string; kanji: string; name: string; note: string }
type CourseTitle = 'Workstation' | 'Editor + Terminal' | 'Desktop Apps'

const COURSES = {
  Workstation: {
    numeral: '其の一',
    kanji: '器',
    name: 'The bowls',
    note: 'hardware: the vessels everything gets served in',
  },
  'Editor + Terminal': {
    numeral: '其の二',
    kanji: '出汁',
    name: 'The broth',
    note: 'the base everything else cooks in',
  },
  'Desktop Apps': {
    numeral: '其の三',
    kanji: '薬味',
    name: 'The toppings',
    note: 'small extras, strong flavor',
  },
} satisfies Record<CourseTitle, Course>

const isVerdict = (value: string): value is Verdict => value in PRICE
const isCourseTitle = (value: string): value is CourseTitle => value in COURSES

type DishLink =
  | { kind: 'external'; href: string }
  | { kind: 'internal'; href: Route }

export type Dish = {
  title: string
  description: string
  slot: string
  verdict: Verdict
  link: DishLink
}

type MenuCourse = {
  title: CourseTitle
  course: Course
  dishes: Dish[]
}

const toDish = (item: RawItem): Dish => {
  if (!isVerdict(item.verdict)) {
    throw new Error(`Unknown verdict in uses.json — ${item.verdict}`)
  }
  return {
    title: item.title,
    description: item.description,
    slot: item.slot,
    verdict: item.verdict,
    link: item.url.startsWith('http')
      ? { kind: 'external', href: item.url }
      : { kind: 'internal', href: item.url as Route },
  }
}

const toMenuCourse = (section: RawSection): MenuCourse => {
  if (!isCourseTitle(section.title)) {
    throw new Error(`Unknown course in uses.json — ${section.title}`)
  }
  return {
    title: section.title,
    course: COURSES[section.title],
    dishes: section.items.map(toDish),
  }
}

export const MENU = uses.map(toMenuCourse)
const DISHES = MENU.flatMap((section) => section.dishes)
export const DISH_COUNT = DISHES.length
export const SPECIAL_COUNT = DISHES.filter(
  (dish) => dish.verdict === 'goat',
).length
