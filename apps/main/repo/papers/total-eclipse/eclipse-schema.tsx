import type React from 'react'
import { SITE_URL } from 'services/site'

export type EclipseLang = 'en' | 'es' | 'pt' | 'fr' | 'is' | 'da' | 'ru'

type Copy = {
  name: string
  description: string
  faq: { q: string; a: string }[]
}

/** Totality on Earth, from the DE421 samples in ./data/shadow.json. */
const TOTALITY_START = '2026-08-12T17:00:08+00:00'
const TOTALITY_END = '2026-08-12T18:34:00+00:00'

const COPY: Record<EclipseLang, Copy> = {
  en: {
    name: 'Total solar eclipse of 12 August 2026',
    description:
      'Totality crosses Russia, northeast Greenland, western Iceland and northern Spain on 12 August 2026. The umbra touches Earth at 17:00 UTC and leaves at 18:34 UTC. Maximum totality lasts 2 minutes 18 seconds off western Iceland.',
    faq: [
      {
        q: 'When is the total solar eclipse of 2026?',
        a: 'Wednesday 12 August 2026. Totality starts over Siberia at 17:00 UTC and ends over the Mediterranean at 18:34 UTC. Iceland sees it around 17:48 local time, Spain around 20:28 local time.',
      },
      {
        q: 'Where is the eclipse total?',
        a: 'Russia, northeast Greenland, western Iceland and a band across northern Spain. The band is at most 294 kilometers wide. Portugal, France, Denmark, the United Kingdom and Ireland get a deep partial eclipse only.',
      },
      {
        q: 'How long does totality last?',
        a: 'Two minutes 18 seconds at maximum, 45 kilometers off western Iceland. On land: 2 minutes 14 seconds at Latrabjarg in Iceland, 1 minute 50 seconds in Oviedo, 1 minute 37 seconds in Palma, 20 seconds at Station Nord in Greenland.',
      },
      {
        q: 'Do I need eclipse glasses?',
        a: 'Yes, whenever any part of the photosphere shows. Use glasses certified to ISO 12312-2 or shade 14 welding glass. Sunglasses, smoked glass and stacked film all fail. During totality, and only during totality, watch with naked eyes.',
      },
      {
        q: 'Is a 99 percent partial eclipse good enough?',
        a: 'No. At 99 percent obscuration about 1,000 lux still reach the ground, the light of an overcast noon, and the corona stays invisible. Madrid, Santiago de Compostela and Pamplona reach 99.97 percent and still see no corona.',
      },
    ],
  },
  es: {
    name: 'Eclipse solar total del 12 de agosto de 2026',
    description:
      'La totalidad cruza Rusia, el noreste de Groenlandia, el oeste de Islandia y el norte de España el 12 de agosto de 2026. La umbra toca la Tierra a las 17:00 UTC y la abandona a las 18:34 UTC. La totalidad máxima dura 2 minutos y 18 segundos frente a Islandia.',
    faq: [
      {
        q: '¿Cuándo es el eclipse solar total de 2026?',
        a: 'El miércoles 12 de agosto de 2026. La totalidad empieza sobre Siberia a las 17:00 UTC y termina sobre el Mediterráneo a las 18:34 UTC. En Islandia ocurre hacia las 17:48 hora local. En España, hacia las 20:28 hora local.',
      },
      {
        q: '¿Dónde el eclipse es total?',
        a: 'En Rusia, el noreste de Groenlandia, el oeste de Islandia y una banda que cruza el norte de España. La banda mide 294 kilómetros de ancho como máximo. Portugal, Francia, Dinamarca, el Reino Unido e Irlanda solo ven un parcial profundo.',
      },
      {
        q: '¿Cuánto dura la totalidad?',
        a: 'Dos minutos y 18 segundos en el máximo, a 45 kilómetros de la costa oeste de Islandia. En tierra: 2 minutos y 14 segundos en Látrabjarg, 1 minuto y 50 segundos en Oviedo, 1 minuto y 37 segundos en Palma, 20 segundos en Station Nord.',
      },
      {
        q: '¿Hacen falta gafas de eclipse?',
        a: 'Sí, siempre que asome cualquier parte de la fotosfera. Use gafas certificadas ISO 12312-2 o cristal de soldador del grado 14. Las gafas de sol, el cristal ahumado y las películas apiladas fallan. Durante la totalidad, y solo entonces, mire a simple vista.',
      },
      {
        q: '¿Basta con un eclipse parcial del 99 por ciento?',
        a: 'No. Con el 99 por ciento de ocultación llegan al suelo unos 1.000 lux, la luz de un mediodía nublado, y la corona sigue invisible. Madrid, Santiago de Compostela y Pamplona llegan al 99,97 por ciento y no ven la corona.',
      },
    ],
  },
  pt: {
    name: 'Eclipse solar total de 12 de agosto de 2026',
    description:
      'A totalidade atravessa a Rússia, o nordeste da Gronelândia, o oeste da Islândia e o norte de Espanha a 12 de agosto de 2026. A umbra toca a Terra às 17:00 UTC e sai às 18:34 UTC. A totalidade máxima dura 2 minutos e 18 segundos ao largo da Islândia.',
    faq: [
      {
        q: 'Quando é o eclipse solar total de 2026?',
        a: 'Quarta-feira, 12 de agosto de 2026. A totalidade começa sobre a Sibéria às 17:00 UTC e termina sobre o Mediterrâneo às 18:34 UTC. Na Islândia ocorre por volta das 17:48 hora local. Em Espanha, por volta das 20:28 hora local.',
      },
      {
        q: 'Onde é que o eclipse é total?',
        a: 'Na Rússia, no nordeste da Gronelândia, no oeste da Islândia e numa faixa que atravessa o norte de Espanha. A faixa mede no máximo 294 quilómetros. Portugal, França, Dinamarca, Reino Unido e Irlanda só veem um parcial profundo.',
      },
      {
        q: 'Quanto dura a totalidade?',
        a: 'Dois minutos e 18 segundos no máximo, a 45 quilómetros da costa oeste da Islândia. Em terra: 2 minutos e 14 segundos em Látrabjarg, 1 minuto e 50 segundos em Oviedo, 1 minuto e 37 segundos em Palma, 20 segundos em Station Nord.',
      },
      {
        q: 'São precisos óculos de eclipse?',
        a: 'Sim, sempre que qualquer parte da fotosfera estiver a descoberto. Use óculos certificados ISO 12312-2 ou vidro de soldador grau 14. Óculos de sol, vidro fumado e películas sobrepostas falham. Durante a totalidade, e só nesse momento, olhe a olho nu.',
      },
      {
        q: 'Um eclipse parcial de 99 por cento chega?',
        a: 'Não. Com 99 por cento de obscurecimento chegam ao solo cerca de 1.000 lux, a luz de um meio-dia encoberto, e a coroa continua invisível. O Porto chega aos 98 por cento e não vê a coroa.',
      },
    ],
  },
  fr: {
    name: 'Éclipse solaire totale du 12 août 2026',
    description:
      "La totalité traverse la Russie, le nord-est du Groenland, l'ouest de l'Islande et le nord de l'Espagne le 12 août 2026. L'ombre touche la Terre à 17:00 UTC et la quitte à 18:34 UTC. La totalité maximale dure 2 minutes 18 secondes au large de l'Islande.",
    faq: [
      {
        q: "Quand a lieu l'éclipse solaire totale de 2026 ?",
        a: 'Le mercredi 12 août 2026. La totalité commence au-dessus de la Sibérie à 17:00 UTC et se termine au-dessus de la Méditerranée à 18:34 UTC. En Islande, vers 17:48 heure locale. En Espagne, vers 20:28 heure locale.',
      },
      {
        q: "Où l'éclipse est-elle totale ?",
        a: "En Russie, dans le nord-est du Groenland, dans l'ouest de l'Islande et sur une bande qui traverse le nord de l'Espagne. La bande fait 294 kilomètres de large au maximum. La France, le Portugal, le Danemark, le Royaume-Uni et l'Irlande obtiennent une éclipse partielle profonde.",
      },
      {
        q: 'Combien de temps dure la totalité ?',
        a: "Deux minutes 18 secondes au maximum, à 45 kilomètres au large de l'Islande. Sur terre : 2 minutes 14 secondes à Látrabjarg, 1 minute 50 secondes à Oviedo, 1 minute 37 secondes à Palma, 20 secondes à Station Nord.",
      },
      {
        q: "Faut-il des lunettes d'éclipse ?",
        a: "Oui, dès qu'une partie de la photosphère reste visible. Utilisez des lunettes certifiées ISO 12312-2 ou un verre de soudeur teinte 14. Les lunettes de soleil, le verre fumé et les films empilés échouent. Pendant la totalité, et seulement alors, regardez à l'oeil nu.",
      },
      {
        q: 'Une éclipse partielle à 99 pour cent suffit-elle ?',
        a: "Non. À 99 pour cent d'obscurcissement, environ 1 000 lux atteignent encore le sol, la lumière d'un midi couvert, et la couronne reste invisible. Toulouse atteint 98 pour cent et ne voit pas la couronne.",
      },
    ],
  },
  is: {
    name: 'Almyrkvi á sólu 12. ágúst 2026',
    description:
      'Almyrkvinn fer yfir Rússland, norðaustur Grænland, vesturhluta Íslands og norðurhluta Spánar 12. ágúst 2026. Alskugginn snertir jörðina klukkan 17:00 UTC og fer af henni klukkan 18:34 UTC. Lengsti almyrkvinn varir 2 mínútur og 18 sekúndur vestur af Íslandi.',
    faq: [
      {
        q: 'Hvenær er almyrkvi á sólu árið 2026?',
        a: 'Miðvikudaginn 12. ágúst 2026. Almyrkvinn hefst yfir Síberíu klukkan 17:00 UTC og endar yfir Miðjarðarhafi klukkan 18:34 UTC. Á Íslandi verður hann um klukkan 17:48 að staðartíma.',
      },
      {
        q: 'Hvar er myrkvinn algjör?',
        a: 'Á Rússlandi, norðaustur Grænlandi, vesturhluta Íslands og á belti yfir norðurhluta Spánar. Beltið er mest 294 kílómetra breitt. Portúgal, Frakkland, Danmörk, Bretland og Írland fá aðeins djúpan deildarmyrkva.',
      },
      {
        q: 'Hversu lengi varir almyrkvinn?',
        a: 'Tvær mínútur og 18 sekúndur þegar mest er, 45 kílómetra vestur af Íslandi. Á landi: 2 mínútur og 14 sekúndur á Látrabjargi, 1 mínúta og 41 sekúnda í Keflavík, 1 mínúta og 3 sekúndur í Reykjavík.',
      },
      {
        q: 'Þarf sólmyrkvagleraugu?',
        a: 'Já, alltaf þegar einhver hluti ljóshvolfsins sést. Notaðu gleraugu með ISO 12312-2 vottun eða suðugler af styrk 14. Sólgleraugu, sótað gler og filmur duga ekki. Á meðan almyrkvinn stendur, og aðeins þá, máttu horfa berum augum.',
      },
      {
        q: 'Nægir 99 prósenta deildarmyrkvi?',
        a: 'Nei. Við 99 prósent hulu ná um 1.000 lúx til jarðar, birta á skýjuðum hádegi, og kórónan sést ekki. Akureyri nær 98 prósentum og sér enga kórónu.',
      },
    ],
  },
  da: {
    name: 'Total solformørkelse den 12. august 2026',
    description:
      'Totaliteten krydser Rusland, det nordøstlige Grønland, det vestlige Island og det nordlige Spanien den 12. august 2026. Kerneskyggen rammer Jorden klokken 17:00 UTC og forlader den klokken 18:34 UTC. Den længste totalitet varer 2 minutter og 18 sekunder vest for Island.',
    faq: [
      {
        q: 'Hvornår er den totale solformørkelse i 2026?',
        a: 'Onsdag den 12. august 2026. Totaliteten begynder over Sibirien klokken 17:00 UTC og slutter over Middelhavet klokken 18:34 UTC. Station Nord i Grønland får den klokken 17:18 UTC.',
      },
      {
        q: 'Hvor er formørkelsen total?',
        a: 'I Rusland, det nordøstlige Grønland, det vestlige Island og et bælte over det nordlige Spanien. Bæltet er højst 294 kilometer bredt. Danmark, Portugal, Frankrig, Storbritannien og Irland får kun en dyb delvis formørkelse.',
      },
      {
        q: 'Hvor længe varer totaliteten?',
        a: 'To minutter og 18 sekunder når den er størst, 45 kilometer vest for Island. På land: 2 minutter og 14 sekunder ved Latrabjarg, 1 minut og 50 sekunder i Oviedo, og kun 20 sekunder ved Station Nord i Grønland.',
      },
      {
        q: 'Skal jeg bruge formørkelsesbriller?',
        a: 'Ja, hver gang en del af fotosfæren er synlig. Brug briller certificeret til ISO 12312-2 eller svejseglas grad 14. Solbriller, sodet glas og stablet film dur ikke. Under totaliteten, og kun der, må du se med det blotte øje.',
      },
      {
        q: 'Er en delvis formørkelse på 99 procent nok?',
        a: 'Nej. Ved 99 procent dækning når omkring 1.000 lux stadig jorden, lyset fra en overskyet middag, og koronaen forbliver usynlig. København når 84 procent og ser ingen korona.',
      },
    ],
  },
  ru: {
    name: 'Полное солнечное затмение 12 августа 2026 года',
    description:
      'Полоса полной фазы проходит по России, северо-востоку Гренландии, западу Исландии и северу Испании 12 августа 2026 года. Тень касается Земли в 17:00 UTC и сходит с неё в 18:34 UTC. Максимальная полная фаза длится 2 минуты 18 секунд к западу от Исландии.',
    faq: [
      {
        q: 'Когда произойдёт полное солнечное затмение 2026 года?',
        a: 'В среду 12 августа 2026 года. Полная фаза начинается над Сибирью в 17:00 UTC и заканчивается над Средиземным морем в 18:34 UTC. В России это около полуночи по местному времени.',
      },
      {
        q: 'Где затмение будет полным?',
        a: 'В России, на северо-востоке Гренландии, на западе Исландии и в полосе через север Испании. Ширина полосы не более 294 километров. Португалия, Франция, Дания, Великобритания и Ирландия увидят только глубокое частное затмение.',
      },
      {
        q: 'Сколько длится полная фаза?',
        a: 'Две минуты 18 секунд в максимуме, в 45 километрах к западу от Исландии. На суше: мыс Прончищева в России получает 1 минуту 36 секунд, Латрабьярг в Исландии 2 минуты 14 секунд, Овьедо в Испании 1 минуту 50 секунд.',
      },
      {
        q: 'Нужны ли очки для наблюдения затмения?',
        a: 'Да, пока видна любая часть фотосферы. Используйте очки с сертификатом ISO 12312-2 или сварочное стекло степени 14. Солнцезащитные очки, закопчённое стекло и сложенная плёнка не защищают. Только во время полной фазы можно смотреть невооружённым глазом.',
      },
      {
        q: 'Достаточно ли частного затмения на 99 процентов?',
        a: 'Нет. При покрытии 99 процентов до земли доходит около 1000 люкс, свет пасмурного полудня, и корона остаётся невидимой. Хатанга получает 98 процентов и короны не увидит.',
      },
    ],
  },
}

const pagePath = (lang: EclipseLang) =>
  lang === 'en' ? '/papers/total-eclipse' : `/papers/total-eclipse/${lang}`

const eventGraph = (lang: EclipseLang) => {
  const copy = COPY[lang]
  const url = `${SITE_URL}${pagePath(lang)}`
  return {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'Event',
        '@id': `${url}#eclipse`,
        name: copy.name,
        description: copy.description,
        startDate: TOTALITY_START,
        endDate: TOTALITY_END,
        eventAttendanceMode: 'https://schema.org/OfflineEventAttendanceMode',
        eventStatus: 'https://schema.org/EventScheduled',
        inLanguage: lang,
        url,
        location: [
          { '@type': 'Country', name: 'Russia' },
          { '@type': 'Place', name: 'Greenland' },
          { '@type': 'Country', name: 'Iceland' },
          { '@type': 'Country', name: 'Spain' },
        ],
      },
      {
        '@type': 'FAQPage',
        '@id': `${url}#faq`,
        inLanguage: lang,
        mainEntity: copy.faq.map((item) => ({
          '@type': 'Question',
          name: item.q,
          acceptedAnswer: { '@type': 'Answer', text: item.a },
        })),
      },
    ],
  }
}

const EclipseSchema: React.FC<{ lang: EclipseLang }> = (props) => (
  <script
    type='application/ld+json'
    // biome-ignore lint/security/noDangerouslySetInnerHtml: static event json-ld
    dangerouslySetInnerHTML={{ __html: JSON.stringify(eventGraph(props.lang)) }}
  />
)

export default EclipseSchema
