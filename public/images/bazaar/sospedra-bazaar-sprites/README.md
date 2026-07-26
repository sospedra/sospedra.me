# sospedra.me bazaar sprite pack

This pack contains the complete production output from the bazaar sprite brief.

- `assets/`: 167 individually named production PNGs.
- `sheets/`: section and stall source sheets with chroma-key areas converted to alpha.
- `sources/`: untouched built-in image-generator outputs retained for provenance.
- `manifest.json`: exact vpx size, exported pixel size, alpha, anchor, tileability, source sheet, and cell for every production file.
- `sospedra-bazaar-sprites.zip`: portable bundle containing `assets/`, `sheets/`, this README, and the manifest.

All production PNGs are exported at 8 output pixels per virtual pixel. Transparent assets use PNG alpha. Horizontal tiles have identical first and last pixel columns. Animation frames share their declared canvas size and anchor.

Rebuild and verify from the repository root:

```sh
node scripts/build-bazaar-sprites.mjs
node scripts/verify-bazaar-sprites.mjs
```
