(function () {
  const DEFAULT_LABELS = {
    idle: "Ready when you are",
    listening: "I'm listening",
    thinking: "Thinking through the best structure",
    speaking: "Explaining the next step",
    happy: "Let's build this together",
    confused: "I need a little more context",
    success: "Your draft is ready",
    building: "Building your draft",
    optimize: "Optimizing the experience",
    alert: "Important detail",
  };

  class AvatarAssistant {
    constructor(options = {}) {
      this.root = typeof options.root === "string" ? document.querySelector(options.root) : options.root;
      this.manager = options.manager || new window.AvatarStateManager(options.initialState || "idle");
      this.labels = { ...DEFAULT_LABELS, ...(options.labels || {}) };
      this.name = options.name || "Luma";
      this.imageUrl = options.imageUrl || "";
      this.imagePaths = options.imagePaths || {};
      this.lottiePaths = options.lottiePaths || {};
      this.compact = Boolean(options.compact);
      this.state = this.manager.getState();
      this.preloadImages();
      this.render();
      this.manager.addEventListener("avatar-state-change", (event) => {
        this.setState(event.detail.state);
      });
    }

    render() {
      if (!this.root) return;
      this.root.classList.add("avatar-assistant-host");
      this.root.innerHTML = `
        <div class="avatar-assistant ${this.compact ? "compact" : ""}" data-avatar-state="${this.state}">
          <div class="avatar-orb" aria-hidden="true">
            <div class="avatar-lottie-slot"></div>
            <div class="avatar-image-skin" ${this.imageUrl ? `style="background-image: url('${this.escapeAttribute(this.imageUrl)}')"` : ""}></div>
            <div class="avatar-effect-layer" aria-hidden="true">
              <span class="avatar-effect aura"></span>
              <span class="avatar-effect ring one"></span>
              <span class="avatar-effect ring two"></span>
              <span class="avatar-effect ring three"></span>
              <span class="avatar-effect voice one"></span>
              <span class="avatar-effect voice two"></span>
              <span class="avatar-effect trail one"></span>
              <span class="avatar-effect trail two"></span>
              <span class="avatar-effect build-grid"></span>
              <span class="avatar-effect thinking-dot one"></span>
              <span class="avatar-effect thinking-dot two"></span>
              <span class="avatar-effect thinking-dot three"></span>
              <span class="avatar-effect warning"></span>
              <span class="avatar-effect success-burst"></span>
            </div>
            <div class="avatar-css-face">
              <span class="avatar-eye left"></span>
              <span class="avatar-eye right"></span>
              <span class="avatar-mouth"></span>
              <span class="avatar-spark one"></span>
              <span class="avatar-spark two"></span>
              <span class="avatar-spark three"></span>
            </div>
            <div class="avatar-wave one"></div>
            <div class="avatar-wave two"></div>
          </div>
          <div class="avatar-caption">
            <strong>${this.escape(this.name)}</strong>
            <span class="avatar-state-label">${this.escape(this.labels[this.state])}</span>
          </div>
        </div>
      `;
      this.el = this.root.querySelector(".avatar-assistant");
      this.label = this.root.querySelector(".avatar-state-label");
      this.lottieSlot = this.root.querySelector(".avatar-lottie-slot");
      this.imageSkin = this.root.querySelector(".avatar-image-skin");
      this.el.classList.toggle("has-image-skin", Boolean(this.imageUrl));
      this.setState(this.state);
    }

    setState(state) {
      this.state = window.AvatarAssistantStates.includes(state) ? state : "idle";
      if (!this.el) return;
      this.el.dataset.avatarState = this.state;
      if (this.label) this.label.textContent = this.labels[this.state] || DEFAULT_LABELS[this.state];
      const stateImage = this.imagePaths[this.state] || this.imagePaths.idle || this.imageUrl;
      if (this.imageSkin && stateImage) {
        this.imageSkin.style.backgroundImage = `url('${this.escapeAttribute(stateImage)}')`;
        this.el.classList.add("has-image-skin");
      }
      this.loadLottiePlaceholder(this.state);
    }

    preloadImages() {
      const urls = new Set(Object.values(this.imagePaths || {}).filter(Boolean));
      if (this.imageUrl) urls.add(this.imageUrl);
      urls.forEach((url) => {
        const image = new Image();
        image.decoding = "async";
        image.src = url;
      });
    }

    loadLottiePlaceholder(state) {
      const path = this.lottiePaths[state];
      if (!this.lottieSlot) return;
      this.lottieSlot.dataset.lottiePath = path || "";
    }

    escapeAttribute(value) {
      return String(value || "").replace(/[&<>"']/g, (char) => ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        "\"": "&quot;",
        "'": "&#039;",
      }[char]));
    }

    escape(value) {
      return String(value || "").replace(/[&<>"']/g, (char) => ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        "\"": "&quot;",
        "'": "&#039;",
      }[char]));
    }
  }

  window.AvatarAssistant = AvatarAssistant;
})();
