# Nixie Master Source

This folder contains the animation-ready source for Nixie as a layered character asset.

Important:
- This is a design/source asset, not a public page.
- It only contains the character, not the full brand sheet.
- The master SVG keeps layers and state groups separated for Figma, Illustrator, SVG animation, Lottie conversion, or later 3D/avatar tooling.

Main file:
- `nixie-master.svg`

Layer groups inside the SVG:
- `layer-glow`
- `layer-tail-fluid`
- `layer-body`
- `layer-head`
- `layer-left-eye`
- `layer-right-eye`
- `layer-mouth-closed`
- `layer-mouth-open`
- `layer-mouth-smile`
- `layer-left-arm-idle`
- `layer-right-arm-idle`
- `layer-chest-symbol`
- `layer-code-texture`
- `layer-particles`

Expression/state groups:
- `state-idle`
- `state-listening`
- `state-thinking`
- `state-speaking`
- `state-building`
- `state-success`
- `state-alert`

The state groups are hidden by default in the master. Turn them on in the SVG/Figma layer panel or target them by ID during animation.

Next production step:
1. Review the master visually.
2. Adjust proportions if needed.
3. Export individual layers as transparent SVG/PNG.
4. Build Lottie or CSS animation from these named layers.
