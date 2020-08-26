import { NextPage } from 'next'
import cn from 'classnames'
import Shell from 'components/Shell'
import Link from 'components/Link'
import SpriteBust from 'components/Sprite/Bust'
import SpriteManual from 'components/Sprite/Manual'
import Page from 'components/Manual/Page'
import Piece from 'components/Manual/Piece'
import Pictogram from 'components/Manual/Pictogram'
import Step from 'components/Manual/Step'
import css from './manual.module.css'
import Head from 'next/head'

export const MANUAL_DESC =
  'How to work with Rubén Sospedra. A manual of instructions. What I value, how I look at problems, what are my blind spots, and how to build trust with me.'

const Manual: NextPage<{}> = () => {
  return (
    <Shell
      canonical='/manual'
      className='relative w-full max-w-2xl min-h-full px-4 pt-12 mx-auto mb-12'
      description={MANUAL_DESC}
      title='Manual of instructions'
    >
      <Head>
        <link rel='preload' as='image' href='/sospedra.png' />
      </Head>

      <Page className='justify-start p-4 pt-12'>
        <h1 className={css.title} aria-label='Sospedra'>
          <span>SOS</span>
          <span>PE</span>
          <span>DRA</span>
        </h1>
        <div className={css.bust}>
          <SpriteBust />
        </div>
        <img src='/sospedra.png' className={css.logo} />
      </Page>

      <Page>
        <div className={cn(css.griddy, 'grid-rows-3')}>
          <div className='flex flex-row row-span-1'>
            <SpriteManual name='support' />
            <Pictogram
              willHide
              left={<SpriteManual name='gameboy' className='p-8' />}
              right={<SpriteManual name='handshake' className='p-8' />}
            />
          </div>
          <div className='row-span-1'>
            <Pictogram
              left={<SpriteManual name='lost' />}
              right={
                <Link url='/' className={css.home}>
                  <SpriteManual name='home' />
                </Link>
              }
            />
          </div>
          <div className='flex flex-row row-span-1'>
            <div className='flex-1'>
              <p>
                <b>WARNING</b>
              </p>
              <p>
                Serious or fatal emotion injuries can occur from not reading
                this document in advance. To prevent this situation you must be
                acknowledge what's on the manual with the included attached pun
                jokes.
              </p>
            </div>
            <div className='flex-1 hidden pl-2 sm:block'>
              <p>
                <b>ATENCIÓ</b>
              </p>
              <p>
                Risc de lesions emocionals series o fatals és poden produir si
                no es llegeix aquest document. Per prevenir aquesta situación
                vosté ha de comprendre allò qué está escrit en el manual.
                Incloses les bromes dolentes.
              </p>
            </div>
            <div className='flex-1 hidden pl-2 lg:block'>
              <p>
                <b>ADVERTENCIA</b>
              </p>
              <p>
                Pueden producirse lesiones emocionales graves o fatales si no
                lee este documento. Para evitar dicha situación, debe entenderse
                lo que se encuentra escrito en el manual. Incluidas las bromas
                adjuntas.
              </p>
            </div>
          </div>
        </div>
      </Page>

      <Page>
        <div className={cn(css.griddy, 'grid-rows-4')}>
          <div className={cn(css.center, 'row-span-1')}>
            <Piece quantity={19} id={101811}>
              <SpriteManual name='demons' />
            </Piece>
            <Piece quantity={91} id={101933}>
              <SpriteManual name='triangle' />
            </Piece>
          </div>
          <div className={cn(css.center, 'row-span-1')}>
            <Piece quantity={12} id={102053}>
              <SpriteManual name='insert' />
            </Piece>
            <Piece quantity={1} id={101697}>
              <SpriteManual name='mobius' />
            </Piece>
          </div>
          <div className={cn(css.center, 'row-span-2 p-8')}>
            <Piece quantity={11} id={102287}>
              <SpriteManual name='count' />
            </Piece>
          </div>
        </div>
      </Page>
      <Page className='h-auto'>
        <Step number={1} title='How I view success'>
          <p>
            Success isn't vertical. Nor a straight path. Resiliency is the real
            success. Failing over and over, until you get there.
          </p>
          <p>
            But there's more. All the winds are bad if a ship doesn't know
            where's heading. You need a goal, a clear one. And to focus on it.
          </p>
          <p>
            In the software industry. You need also to find balance between
            achieving your perfect goal, and being quick. We work in a
            fast-paced world. Every minute counts, make it valuable.
          </p>
          <p>
            Finally, there's no winning without honor. The rule is simple: if
            it's not right, don't do it.
          </p>
        </Step>
        <Step number={2} title='How I communicate'>
          <p>
            Right to the point. I don't like blatantly. Short yet accurate
            sentences. I appreciate funny messages, as well. I don't think
            you're more righteous if you speak more seriously.
          </p>
          <p>
            Everything is about the content. The envelope is nice, but focus on
            the content. Don't waste anyone time. Make sure that you checked
            first.
          </p>
          <p>
            Async and distributed over everything else. Does this need to be a
            meeting? Probably could be an email. Or a slack message. Rule of
            thumb: think about me as if I'm working from Jupiter thus real-time
            comms don't work.
          </p>
        </Step>
      </Page>
      <Page className='h-auto'>
        <Step number={3} title='Things I do that may annoy you'>
          <p>
            I can be too harsh sometimes. Well, not really. I can sound too
            harsh. It's probably a side-effect caused by the async comms. It
            takes a lot for me to get angry, so don't really worry about it.
          </p>
          <p>
            I don't want to listent to opinions (if I don't ask for them). I'm
            driven by data only. I already have an opinion about almost
            anything. And I don't need another.
          </p>
          <p>
            I have a dark sense of humor. If I offend you I'm sorry. Reall I am.
            Please, let me know and I'll adapt my jokes to you.
          </p>
        </Step>
        <Step number={4} title='What gains and loses my trust'>
          <p>
            Loyalty is the best. Lying is the worst. I can understand almost
            anything. Just try to explain it. Don't lie to me.
          </p>
          <p>
            Now, regarding day-to-day work. Taking ownership of your task is a
            massive trust boost. I deeply respect people that does that.
          </p>
          <p>
            Does that mean that you have to work extra hours? Extra effort?
            Extra extra? Nope, that's bad. In my culture, such behaviour means
            that you need to overwork to achieve your goals. If there's
            something that goes bad, just be transparent. No big deal.
          </p>
        </Step>
      </Page>
      <Page className='h-auto'>
        <Step number={5} title='My strengths'>
          <p>
            I'm thoughtful. I'm strategic and I like to plan ahead. Having a
            good amount of data around me to make the right decision.
          </p>
          <p>
            I'm also stubborn, but in the good way. Since I try to not be
            opinionated, I have a clear focus and a well-defined goal. So, being
            stubborn means a better output.
          </p>
          <p>
            I understand. Understand others problems and needs. Understand
            business operations and the market. Understand the context. This
            life is about adapting.
          </p>
        </Step>
        <Step number={6} title='My grow areas'>
          <p>
            More efficiency. I don't think I'm unefficient. But sometimes I take
            too many things in my basket. Thus, everything slows down a little
            each time. One task at a time.
          </p>
          <p>
            Alternative thinking. Not lateral, but alternative. What is this? I
            hear you asking. Well, you know when you're presented with a
            problem. You think of a solution. And that's it. You fail to
            continue elaborate alternative solutions. That's something that
            happens to me quite often. If I don't realize it's happening then
            I'm usually stuck with my first thought. That's one of the reasons I
            love team-work so much.
          </p>
        </Step>
      </Page>
    </Shell>
  )
}

export default Manual
