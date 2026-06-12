export const avatarStates = ["idle", "listening", "thinking", "speaking", "happy", "confused", "success"];

export class AvatarStateManager extends EventTarget {
  constructor(initialState = "idle") {
    super();
    this.state = this.normalize(initialState);
  }

  normalize(state) {
    return avatarStates.includes(state) ? state : "idle";
  }

  setState(nextState, detail = {}) {
    const previous = this.state;
    const state = this.normalize(nextState);
    this.state = state;
    this.dispatchEvent(new CustomEvent("avatar-state-change", {
      detail: { state, previous, ...detail },
    }));
  }

  getState() {
    return this.state;
  }
}

export default AvatarStateManager;
