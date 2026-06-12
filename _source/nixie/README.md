# Nixie Source Package

This is the corrected Nixie production source package.

It does not redesign Nixie.
It uses the supplied concept sheet as the visual source and extracts the real Nixie poses for animation planning.

Files:
- `nixie-master.svg`: editable source board with real pose references and named layer/state groups.
- `reference/nixie-original-concept.png`: original supplied concept sheet.
- `reference/poses/*-reference.png`: real cropped poses from the concept sheet.
- `reference/poses/*-transparent.png`: same poses with approximate transparency for tracing/compositing.

Current real pose references:
- `idle-main`
- `building-tools`
- `analytical-thinking`
- `optimization-boost`
- `alert-critical`

Required production layers to trace/export:
- body
- head
- left eye
- right eye
- mouth closed
- mouth open
- mouth smile
- left arm
- right arm
- chest symbol
- glow layer
- particles
- tail/fluid extensions

Expression/state plan:
- idle: main floating pose
- listening: main pose plus glow/rings
- thinking: analytical pose
- speaking: main pose with mouth-open cycle
- building: building-tools pose with tools/hologram
- success: celebratory pose derived from Nixie's style
- alert: alert-critical pose

Important:
The transparent PNGs are working/reference assets. Final professional separation should be traced or cleaned in Figma/Illustrator/PSD from these exact poses, not redrawn from imagination.
