# NixieAvatarController

React controller for the Nixie AI avatar.

It switches between exported state assets. The default MVP assets are transparent PNGs generated from the approved Nixie concept sheet:

- `/assets/nixie_idle.png`
- `/assets/nixie_listening.png`
- `/assets/nixie_thinking.png`
- `/assets/nixie_speaking.png`
- `/assets/nixie_building.png`
- `/assets/nixie_optimize.png`
- `/assets/nixie_success.png`
- `/assets/nixie_alert.png`

Supported states:

- `idle`
- `listening`
- `thinking`
- `speaking`
- `building`
- `optimize`
- `success`
- `alert`

Global events:

```js
window.dispatchEvent(new CustomEvent("nixie:set-state", {
  detail: { state: "thinking" }
}));

window.dispatchEvent(new CustomEvent("ai:state-change", {
  detail: { aiState: "building" }
}));
```

Usage:

```jsx
import NixieAvatarController, { setNixieState } from "./components/NixieAvatarController.jsx";

export function BuilderAssistant() {
  return (
    <NixieAvatarController
      initialState="idle"
      onStateChange={({ state }) => console.log("Nixie state:", state)}
    />
  );
}

setNixieState("success");
```

Clipping prevention:

The component uses a square viewport, an oversized internal scale box, `overflow: visible`, and `object-fit: contain`. This lets exported PNG, SVG, MP4, WebM, or Lottie assets include glow, particles, bounce, tools, and body extensions without being cut off.

Asset replacement:

Any state can be upgraded later by passing an `assets` prop or replacing the files listed in `/assets/nixie_manifest.json`. Supported formats are PNG, JPG, WebP, AVIF, SVG, MP4, WebM, and Lottie JSON.
