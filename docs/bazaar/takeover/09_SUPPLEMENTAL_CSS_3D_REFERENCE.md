# Supplemental CSS 3D reference

User-supplied article:

<https://frontend.horse/articles/creating-3d-illustrations-with-css/>

This is a supplemental implementation technique, not a replacement for the
pixel-art Gospel or the master-first approval process.

## Relevant ideas from the article

- Build complex forms from reusable cuboids.
- Use `transform-style: preserve-3d` so child faces retain depth.
- Parameterize width, height, and depth instead of hand-authoring every face.
- Create irregular hard-edged shapes with hard-stop gradients or borders.
- Choose one explicit light source.
- Shade each object face with three variants:
  - light/direct;
  - medium/indirect;
  - dark/no direct light.
- Animate small functional parts before considering movement of the whole
  object.

## Possible Bazaar 3 use

The technique may be useful for responsive code-native architecture:

- floor slabs and fascia;
- H-beams and brackets;
- stair aperture/collar;
- landing depth;
- wall recesses;
- cable/service trays;
- foreground occluder lips.

If explored, the CSS system must be calibrated to Bazaar 3's fixed shallow
parallel camera. It must not become a free-rotating perspective scene.

## Constraints

- Do not use it to replace the authored stall or character sprites.
- Do not change the approved frontal-oblique camera.
- Do not add smooth gradients; hard stops only.
- Do not add soft 3D shadows or global perspective.
- Use the same semantic palette and three-tone face logic as the sprites.
- Keep the DOM and GPU cost modest.
- Respect reduced motion.
- Whole architecture does not bounce, scale, rotate, or change on hover.
- CSS 3D cannot be used as an excuse to skip full-floor master approval.

The article's “everything is a cube” method is potentially useful for making
responsive structural depth coherent. It is not visual authority.

