# 15 — sound

The market is scored by a 237-line synthesizer (app/bazaar/sounds.ts).
One audio file exists in the entire system; every other sound is
generated at call time with WebAudio. The pixel fiction stays honest:
chiptune-adjacent timbres from real oscillators, zero samples, zero
network weight.

## The engine

- Two primitives. `tone(spec)`: an oscillator (square, sine, triangle,
  sawtooth) with optional exponential pitch ramp and an exponential
  decay envelope. `noise(spec)`: a white-noise buffer through a biquad
  filter (lowpass or highpass, tunable Q). Every sound in the market is
  a stack of these two.
- Procedural reverb. A ConvolverNode fed a GENERATED impulse response:
  1.6 seconds of decaying stereo noise, (1 - i/len)^2.8 falloff. No IR
  file. Voices opt in with a `wet` flag; the door and the floor chime
  use it, so the big transitions sound underground and the small UI
  ticks stay dry.
- Autoplay discipline. The AudioContext is created lazily inside a user
  gesture (setSoundEnabled), master gain 0.7, resume() on suspended.
  Every voice early-returns when disabled. The toggle persists as
  localStorage 'bazaar-sound'; sound is opt-in, remembered per browser.
- The one file: /sounds/door.webm, the door slam. It decodes into a
  buffer once and replays; on decode failure (older Safari) a six-voice
  synth fallback plays the same gesture: highpass creak, a 75->30 Hz
  sine slam, filtered echo tails, all wet.

## Leitmotifs: every stall has a sting

Hovering a stall fires its signature (STALL_SFX), a half-second audio
identity matched to the keeper:

- uses: a 220->55 Hz sine drop plus a sizzle burst. A pot hitting a
  stove.
- games: three square-wave notes, 660/880/587 Hz. An arcade coin-up
  arpeggio.
- travel: two sine chirps bending up then down, 1100->1500 and
  1400->900. Alien small-talk.
- manual: triangle waves at 1568/1662 Hz, repeated. A polite shop
  doorbell, slightly detuned, slightly robotic.
- console (id "serve"): filtered noise thumps and a 150->90 Hz drop.
  Something heavy shifting in a dark den.
- w98 (id "projects"): two descending sine sweeps, 900->320 and
  1300->600. A machine powering down, or up, depending on your faith.
- talks: a 2 kHz highpass tick then a sawtooth sweeping 300->1800.
  A VHS spooling.
- papers: low sine thuds at 110 and 75 Hz under 250-350 Hz noise.
  Ledgers dropping on a counter.

The ids still speak bazaar-v4 dialect (serve, projects); the views map
modern stall ids through SFX_ID. A rename debt carried knowingly.

## UI voices

hover: one 35ms blip, 1200->900 Hz, quiet. click: a two-tone
confirmation, 660 then 990. floor: a lowpass whoosh plus a 90->55 Hz
sub, fired by the IntersectionObserver when a new floor wins visibility
(armed after the first observation so page load stays silent). bus:
three highpass hiss bursts and a long 120 Hz idle, an air-brake
impression. sign: a sawtooth buzz plus a tick for the wayfinding
flickers. door: the webm, then the synth if decoding fails.

## Design rules that emerged

- Synthesis over samples: repeatable, weightless, and stylistically
  locked to the pixel world. A recorded foley would read as a photo
  pasted into a drawing.
- One sting per stall, fired on hover, never looped. Audio identity
  works like the dialog voice: one personality beat per encounter.
- Wet equals big. Reverb marks transitions (door, floor); dry marks UI.
- Every voice is interruption-safe and gesture-gated; sound can never
  block, error, or autoplay.

## Adjacent: the console boot chime

The /console route has its own synthesized boot chime placeholder with
the same autoplay-gate pattern; the real chime swap is a pending
workstream, tracked in memory (serve-boot-audio). The bazaar engine and
the console chime are separate systems that share the discipline, not
the code.
