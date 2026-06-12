# NixieAvatarController

React controller for the Nixie AI avatar.

It does not define the final art. It switches between final exported assets:

- `/assets/nixie_idle.mp4`
- `/assets/nixie_listening.mp4`
- `/assets/nixie_thinking.json`
- `/assets/nixie_speaking.mp4`
- `/assets/nixie_building.json`
- `/assets/nixie_optimize.mp4`
- `/assets/nixie_success.json`
- `/assets/nixie_alert.mp4`

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

The component uses a square viewport, an oversized internal scale box, `overflow: visible`, and `object-fit: contain`. This lets exported MP4/Lottie assets include glow, particles, bounce, tools, and body extensions without being cut off.
