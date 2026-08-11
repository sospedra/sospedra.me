import type { PaperLocale } from 'services/markdown/paper.locales.ts'
import type { PaperTranslation } from 'services/markdown/paper.types.ts'

/** Each locale keeps its own head copy, so search engines index real prose. */
const translations: Record<PaperLocale, PaperTranslation> = {
  es: {
    title:
      'Cómo situarse dentro del eclipse solar total del 12 de agosto de 2026',
    description:
      'La totalidad cruza Rusia, Groenlandia, Islandia y España el 12 de agosto de 2026. Horas locales, la banda de totalidad y por qué el 99 por ciento no cuenta.',
    excerpt:
      'Mil. Esa es la diferencia de luz entre un eclipse del 99 por ciento y uno del 100 por ciento. Al 99 por ciento la esquirla de fotosfera que queda abierta todavía derrama unos 1.000 lux sobre ti, la luz de un mediodía nublado. Tus pupilas se adaptan y nada parece raro. Al 100 por ciento la luz cae al nivel de la luna llena. La corona se despliega, Venus se enciende y el horizonte monta un atardecer de 360 grados. El miércoles 12 de agosto de 2026 el eclipse solar total repite ese experimento sobre nueve países en una sola tarde.',
    keywords: [
      'eclipse solar total 2026',
      'eclipse 12 de agosto de 2026',
      'banda de totalidad',
      'eclipse España 2026',
      'gafas de eclipse ISO 12312-2',
      'horas del eclipse',
      'saros 126',
    ],
    load: () => import('./index.es.mdx'),
  },
  pt: {
    title: 'Como ficar dentro do eclipse solar total de 12 de agosto de 2026',
    description:
      'A totalidade atravessa a Rússia, a Gronelândia, a Islândia e Espanha a 12 de agosto de 2026. Horas locais, a faixa da totalidade e porque 98 por cento não conta.',
    excerpt:
      'Mil. É essa a diferença de luz entre um eclipse de 99 por cento e um de 100 por cento. Aos 99 por cento a lasca de fotosfera que fica aberta ainda despeja cerca de 1.000 lux sobre si, a luz de um meio-dia encoberto. As pupilas adaptam-se e nada parece errado. Aos 100 por cento a luz cai ao nível da lua cheia. A coroa abre-se, Vénus acende-se e o horizonte monta um pôr do sol de 360 graus. Na quarta-feira, 12 de agosto de 2026, o eclipse solar total repete essa experiência sobre nove países numa só tarde.',
    keywords: [
      'eclipse solar total 2026',
      'eclipse 12 de agosto de 2026',
      'faixa da totalidade',
      'eclipse Portugal 2026',
      'óculos de eclipse ISO 12312-2',
      'horas do eclipse',
      'saros 126',
    ],
    load: () => import('./index.pt.mdx'),
  },
  fr: {
    title: "Comment se placer dans l'éclipse solaire totale du 12 août 2026",
    description:
      "La totalité traverse la Russie, le Groenland, l'Islande et l'Espagne le 12 août 2026. Heures locales, la bande de totalité, et pourquoi 98 pour cent ne compte pas.",
    excerpt:
      "Mille. Voilà l'écart de lumière entre une éclipse à 99 pour cent et une éclipse à 100 pour cent. À 99 pour cent, l'éclat de photosphère encore visible déverse près de 1 000 lux sur vous, la lumière d'un midi couvert. Vos pupilles s'adaptent et rien ne semble anormal. À 100 pour cent, la lumière tombe au niveau de la pleine lune. La couronne se déploie, Vénus s'allume et l'horizon monte un coucher de soleil à 360 degrés. Le mercredi 12 août 2026, l'éclipse solaire totale rejoue cette expérience sur neuf pays en une seule soirée.",
    keywords: [
      'éclipse solaire totale 2026',
      'éclipse 12 août 2026',
      'bande de totalité',
      'éclipse France 2026',
      "lunettes d'éclipse ISO 12312-2",
      "heures de l'éclipse",
      'saros 126',
    ],
    load: () => import('./index.fr.mdx'),
  },
  is: {
    title: 'Hvernig á að standa inni í almyrkvanum 12. ágúst 2026',
    description:
      'Almyrkvi fer yfir Rússland, Grænland, Ísland og Spán 12. ágúst 2026. Staðartímar, myrkvabeltið og hvers vegna 99 prósent duga ekki.',
    excerpt:
      'Eitt þúsund. Það er birtumunurinn á 99 prósenta myrkva og 100 prósenta myrkva. Við 99 prósent hellir sneiðin af ljóshvolfinu sem eftir stendur enn um 1.000 lúxum yfir þig, birtu skýjaðs hádegis. Sjáöldrin aðlagast og ekkert finnst þér að. Við 100 prósent fellur birtan niður í fullt tungl. Kórónan breiðir úr sér, Venus kviknar og sjóndeildarhringurinn keyrir sólarlag í 360 gráður. Miðvikudaginn 12. ágúst 2026 endurtekur almyrkvi á sólu þessa tilraun yfir níu löndum á einu kvöldi.',
    keywords: [
      'almyrkvi á sólu 2026',
      'sólmyrkvi 12. ágúst 2026',
      'myrkvabelti',
      'sólmyrkvi Ísland',
      'sólmyrkvagleraugu ISO 12312-2',
      'Látrabjarg almyrkvi',
      'saros 126',
    ],
    load: () => import('./index.is.mdx'),
  },
  da: {
    title: 'Sådan står du inde i den totale solformørkelse 12. august 2026',
    description:
      'Totaliteten krydser Rusland, Grønland, Island og Spanien den 12. august 2026. Lokale tider, totalitetsbæltet, og hvorfor 84 procent ikke tæller.',
    excerpt:
      'Et tusind. Det er lysforskellen mellem en formørkelse på 99 procent og en på 100 procent. Ved 99 procent hælder den åbne flig af fotosfæren stadig omkring 1.000 lux ned over dig, lyset fra en overskyet middag. Pupillerne tilpasser sig, og intet føles galt. Ved 100 procent falder lyset til niveauet for en fuldmåne. Koronaen folder sig ud, Venus tænder, og horisonten kører en solnedgang hele vejen rundt. Onsdag den 12. august 2026 gentager den totale solformørkelse det forsøg over ni lande på én aften.',
    keywords: [
      'total solformørkelse 2026',
      'solformørkelse 12. august 2026',
      'totalitetsbæltet',
      'solformørkelse Danmark',
      'formørkelsesbriller ISO 12312-2',
      'Station Nord formørkelse',
      'saros 126',
    ],
    load: () => import('./index.da.mdx'),
  },
  ru: {
    title:
      'Как оказаться внутри полного солнечного затмения 12 августа 2026 года',
    description:
      'Полоса полной фазы проходит по России, Гренландии, Исландии и Испании 12 августа 2026 года. Местное время, полоса и высота солнца над горизонтом.',
    excerpt:
      'Тысяча. Такова разница в свете между затмением на 99 процентов и затмением на 100 процентов. При 99 процентах открытая полоска фотосферы всё ещё льёт на вас около 1000 люкс, свет пасмурного полудня. Зрачки подстраиваются, и ничего странного вы не чувствуете. При 100 процентах свет падает до уровня полной луны. Корона разворачивается, загорается Венера, а горизонт устраивает закат на 360 градусов. В среду 12 августа 2026 года полное солнечное затмение повторяет этот опыт над девятью странами за один вечер.',
    keywords: [
      'полное солнечное затмение 2026',
      'затмение 12 августа 2026',
      'полоса полной фазы',
      'затмение в России 2026',
      'очки для затмения ISO 12312-2',
      'мыс Прончищева затмение',
      'сарос 126',
    ],
    load: () => import('./index.ru.mdx'),
  },
}

export default translations
