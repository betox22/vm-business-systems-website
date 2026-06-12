(function () {
  const STATES = ["idle", "listening", "thinking", "speaking", "building", "optimize", "happy", "confused", "success", "alert"];

  class AvatarStateManager extends EventTarget {
    constructor(initialState = "idle") {
      super();
      this.state = this.normalize(initialState);
    }

    normalize(state) {
      return STATES.includes(state) ? state : "idle";
    }

    setState(nextState, detail = {}) {
      const normalized = this.normalize(nextState);
      const previous = this.state;
      this.state = normalized;
      this.dispatchEvent(new CustomEvent("avatar-state-change", {
        detail: { state: normalized, previous, ...detail },
      }));
    }

    getState() {
      return this.state;
    }

    bindTyping(input) {
      if (!input) return;
      let typingTimer;
      input.addEventListener("input", () => {
        this.setState("listening", { source: "typing" });
        window.clearTimeout(typingTimer);
        typingTimer = window.setTimeout(() => this.setState("idle", { source: "typing-idle" }), 1200);
      });
    }
  }

  window.AvatarStateManager = AvatarStateManager;
  window.AvatarAssistantStates = STATES;
})();
