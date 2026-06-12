(function () {
  const stateLabels = {
    idle: {
      title: "Nixie is ready",
      text: "Fluid assistant mode with the original Nixie shape and glow.",
    },
    listening: {
      title: "Listening",
      text: "Nixie focuses on the client input while the listening rings pulse.",
    },
    thinking: {
      title: "Thinking",
      text: "Analytical pose inspired by the original concept sheet.",
    },
    speaking: {
      title: "Speaking",
      text: "Nixie answers with voice waves and a subtle body motion.",
    },
    building: {
      title: "Building",
      text: "Nixie works on the website using tools and code panels.",
    },
    optimization: {
      title: "Optimizing",
      text: "Boost mode for performance, layout, and conversion improvements.",
    },
    success: {
      title: "Success",
      text: "Celebration state for generated drafts, approvals, and published sites.",
    },
    alert: {
      title: "Alert",
      text: "Critical check mode for errors, missing info, or warnings.",
    },
  };

  class NixieWebAvatar {
    constructor(root, options = {}) {
      this.root = typeof root === "string" ? document.querySelector(root) : root;
      this.state = options.state || "idle";
      this.onStateChange = options.onStateChange || null;
      this.render();
      this.setState(this.state);
    }

    render() {
      if (!this.root) return;
      this.root.classList.add("nixie-avatar");
      this.root.innerHTML = `
        <div class="nixie-listening-rings nixie-fx"><i></i><i></i></div>
        <div class="nixie-speech-waves nixie-fx"><i></i><i></i></div>
        <div class="nixie-build-tools nixie-fx"><span></span><span></span><span></span></div>
        <div class="nixie-success-burst nixie-fx"><span></span><span></span><span></span><span></span></div>
        <div class="nixie-alert-pulse nixie-fx"><span></span></div>
        <div class="nixie-pose idle"><img src="/public/brand/nixie/poses/idle-main-transparent.png" alt=""></div>
        <div class="nixie-pose thinking"><img src="/public/brand/nixie/poses/analytical-thinking-transparent.png" alt=""></div>
        <div class="nixie-pose building"><img src="/public/brand/nixie/poses/building-tools-transparent.png" alt=""></div>
        <div class="nixie-pose optimization"><img src="/public/brand/nixie/poses/optimization-boost-transparent.png" alt=""></div>
        <div class="nixie-pose alert"><img src="/public/brand/nixie/poses/alert-critical-transparent.png" alt=""></div>
      `;
    }

    setState(state) {
      this.state = stateLabels[state] ? state : "idle";
      if (this.root) this.root.dataset.state = this.state;
      if (this.onStateChange) this.onStateChange(this.state, stateLabels[this.state]);
    }
  }

  window.NixieWebAvatar = NixieWebAvatar;
  window.NixieWebAvatarLabels = stateLabels;
})();
