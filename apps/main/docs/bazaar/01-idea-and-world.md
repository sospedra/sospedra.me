# 01 — idea and world

## The concept

The personal site needed an index that wasn't a list of links. The answer:
a place. An underground night market where every stall IS a section of the
site. Navigation becomes wandering. The reference cocktail: Final Fantasy
IX item shops (hover dialogs, typewriter text, shopkeeper personalities),
Blade Runner / neo-Tokyo / vaporwave street density (neon, rust, cables,
rain-less rain mood), and 16-bit pixel-art market scenes (chunky color,
outlined sprites, flat depth).

The market is vertical: a street level at the top (the way in), then
market floors connected by spiral stairs. You scroll down into the
underground. The street sells the fiction: a bus stop (exit back to the
city = the homepage), a neon BAZAAR sign, a door that opens.

## Stalls map to routes

| stall   | route      | keeper                         | dialog voice |
|---------|------------|--------------------------------|--------------|
| uses    | /uses      | chef behind a counter          | omakase menu, terse |
| papers  | /papers    | hologram archivist             | signal static, epistemics |
| manual  | /manual    | British repair robot           | "Right then, colleague!" |
| console | /console   | Ed (Cowboy Bebop homage)       | "Ooh! A human cursor!" |
| talks   | /videoclub | video club clerk               | "Be kind. Rewind." |
| w98     | /w98       | gardener robot watering plants | "Mind the hose." |
| games   | /snake+/rubiks | two kids at an arcade      | sibling banter, 4-turn conversation |
| travel  | /travel    | small alien                    | "Supernova in twenty-two. Coming?" |

The mapping rule: the stall's fiction rhymes with the route's content.
The console stall is a hacker den because /console is a terminal. The
talks stall is a video club because talks are tapes. w98 grows plants
because the /w98 easter egg is a living old machine. The games kids argue
about who plays because the games are two-player-sibling energy.

Characters carry the personality budget. Every stall has exactly one
focusable interaction; the character zone is hover-only. Dialogs use FFIX
bubble styling with a per-character voice and a typewriter reveal (9ms per
char, links type in last).

## Theme and continuity with the rest of the site

The site's design system is dark, quiet, typographic. The bazaar is the
loud room in a quiet house, and that contrast is deliberate: per-route art
direction departs boldly from the site palette (route-theming doctrine).
The bridge back: the bus stop goes home, the stalls go to normal routes,
and the pixel-art sensibility (chunky, low-color, authored) matches the
site's taste for restraint even when the palette screams.

History: bazaar (v1) and bazaar2 established the concept and the CSS
effects language (motes, neon blink, parallax foreground, dialogs).
bazaar3 was the AI-asset takeover campaign (the takeover docs, now docs/bazaar/takeover/).
bazaar4 mounted the r17 layered animated stalls plus r15 architecture and
r19 decoration on bazaar2's skeleton. bazaar5 is the validated-layout
rebuild, final assets only, built for hand-placement.

## Idea-generation method (how the world grew)

- Start from the route list, not from art. Every asset must justify a
  navigation.
- One reference image per decision, pasted into chat: Pinterest for the
  arasaka tower sign, Cowboy Bebop stills for Ed, cube renders for the
  recess, real lamp posts for the sign redesign. The user rules by
  reference; the model follows the reference, not the adjective.
- Personality before pixels: the dialog text existed before the final
  character art. The art then had to match the voice (flabbergasted
  British robot demanded an excited hover animation).
- The decoration inventory (92 props: graffiti with in-jokes like
  "pertinax vincit" and "@sospedra", pachinko, torii gate, ramen machine,
  server towers, grow lamps) exists to make the world lived-in; props are
  placeable furniture, not baked backgrounds, so composition stays
  editable.
