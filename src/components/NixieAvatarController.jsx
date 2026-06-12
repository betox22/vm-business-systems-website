import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Lottie from "lottie-react";
import "./NixieAvatarController.css";

export const NIXIE_STATES = [
  "idle",
  "listening",
  "thinking",
  "speaking",
  "building",
  "optimize",
  "success",
  "alert",
];

const DEFAULT_ASSETS = {
  idle: "/assets/nixie_idle.png",
  listening: "/assets/nixie_listening.png",
  thinking: "/assets/nixie_thinking.png",
  speaking: "/assets/nixie_speaking.png",
  building: "/assets/nixie_building.png",
  optimize: "/assets/nixie_optimize.png",
  success: "/assets/nixie_success.png",
  alert: "/assets/nixie_alert.png",
};

const EVENT_NAMES = ["nixie:set-state", "ai:state-change"];
const SAFE_FALLBACK_STATE = "idle";

function normalizeState(value) {
  return NIXIE_STATES.includes(value) ? value : SAFE_FALLBACK_STATE;
}

function assetType(src = "") {
  const cleanSrc = src.split("?")[0].toLowerCase();
  if (cleanSrc.endsWith(".json")) return "lottie";
  if (cleanSrc.endsWith(".mp4") || cleanSrc.endsWith(".webm")) return "video";
  if (
    cleanSrc.endsWith(".png") ||
    cleanSrc.endsWith(".jpg") ||
    cleanSrc.endsWith(".jpeg") ||
    cleanSrc.endsWith(".webp") ||
    cleanSrc.endsWith(".avif") ||
    cleanSrc.endsWith(".svg")
  ) return "image";
  return "unknown";
}

function preloadVideo(src) {
  return new Promise((resolve, reject) => {
    const video = document.createElement("video");
    video.muted = true;
    video.loop = true;
    video.playsInline = true;
    video.preload = "auto";
    video.src = src;
    video.oncanplaythrough = () => resolve(src);
    video.onerror = () => reject(new Error(`Could not preload video asset: ${src}`));
    video.load();
  });
}

async function preloadAsset(src) {
  if (!src) throw new Error("Missing Nixie asset src.");
  const type = assetType(src);
  if (type === "image") {
    await preloadImage(src);
    return { type: "image", src };
  }
  if (type === "video") {
    await preloadVideo(src);
    return { type: "video", src };
  }
  if (type === "lottie") {
    const response = await fetch(src, { cache: "force-cache" });
    if (!response.ok) throw new Error(`Could not load Lottie asset: ${src}`);
    return { type: "lottie", src, animationData: await response.json() };
  }
  throw new Error(`Unsupported Nixie asset type: ${src}`);
}

function preloadImage(src) {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.decoding = "async";
    image.onload = () => resolve(src);
    image.onerror = () => reject(new Error(`Could not preload image asset: ${src}`));
    image.src = src;
  });
}

export default function NixieAvatarController({
  assets = DEFAULT_ASSETS,
  initialState = "idle",
  className = "",
  label = "Nixie AI assistant",
  showCaption = false,
  onStateChange,
  onAssetError,
}) {
  const [activeState, setActiveState] = useState(normalizeState(initialState));
  const [displayAsset, setDisplayAsset] = useState(null);
  const [pendingAsset, setPendingAsset] = useState(null);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const cacheRef = useRef(new Map());
  const requestIdRef = useRef(0);

  const normalizedAssets = useMemo(() => {
    return NIXIE_STATES.reduce((acc, state) => {
      acc[state] = assets[state] || DEFAULT_ASSETS[state];
      return acc;
    }, {});
  }, [assets]);

  const loadState = useCallback(async (nextState, source = "direct") => {
    const state = normalizeState(nextState);
    const src = normalizedAssets[state];
    const requestId = ++requestIdRef.current;

    try {
      setIsTransitioning(true);
      let loaded = cacheRef.current.get(src);
      if (!loaded) {
        loaded = await preloadAsset(src);
        cacheRef.current.set(src, loaded);
      }
      if (requestId !== requestIdRef.current) return;
      setPendingAsset({ ...loaded, state });
      window.setTimeout(() => {
        if (requestId !== requestIdRef.current) return;
        setDisplayAsset({ ...loaded, state });
        setPendingAsset(null);
        setActiveState(state);
        setIsTransitioning(false);
        onStateChange?.({ state, src, source });
      }, 120);
    } catch (error) {
      setPendingAsset(null);
      setIsTransitioning(false);
      onAssetError?.({ state, src, error });
      if (state !== SAFE_FALLBACK_STATE) loadState(SAFE_FALLBACK_STATE, "fallback");
    }
  }, [normalizedAssets, onAssetError, onStateChange]);

  useEffect(() => {
    const idleSrc = normalizedAssets[SAFE_FALLBACK_STATE];
    if (assetType(idleSrc) === "video") preloadVideo(idleSrc).catch(() => {});
    if (assetType(idleSrc) === "image") preloadImage(idleSrc).catch(() => {});
    loadState(initialState, "initial");
  }, [initialState, loadState, normalizedAssets]);

  useEffect(() => {
    const handler = (event) => {
      const detail = event.detail || {};
      const nextState = detail.state || detail.aiState || detail.status;
      loadState(nextState, event.type);
    };
    EVENT_NAMES.forEach((name) => window.addEventListener(name, handler));
    return () => EVENT_NAMES.forEach((name) => window.removeEventListener(name, handler));
  }, [loadState]);

  return (
    <figure
      className={`nixie-avatar-controller ${className}`}
      data-state={activeState}
      data-transitioning={isTransitioning ? "true" : "false"}
      aria-label={label}
    >
      <div className="nixie-avatar-viewport">
        <NixieStateEffects />
        <div className="nixie-avatar-scale-box">
          {displayAsset ? <NixieAsset asset={displayAsset} active /> : <NixieFallback />}
          {pendingAsset ? <NixieAsset asset={pendingAsset} pending /> : null}
        </div>
      </div>
      {showCaption ? <figcaption className="nixie-avatar-caption">{activeState}</figcaption> : null}
    </figure>
  );
}

function NixieStateEffects() {
  return (
    <div className="nixie-state-effects" aria-hidden="true">
      <span className="nixie-effect nixie-aura" />
      <span className="nixie-effect nixie-ring nixie-ring-one" />
      <span className="nixie-effect nixie-ring nixie-ring-two" />
      <span className="nixie-effect nixie-ring nixie-ring-three" />
      <span className="nixie-effect nixie-wave nixie-wave-one" />
      <span className="nixie-effect nixie-wave nixie-wave-two" />
      <span className="nixie-effect nixie-trail nixie-trail-one" />
      <span className="nixie-effect nixie-trail nixie-trail-two" />
      <span className="nixie-effect nixie-spark nixie-spark-one" />
      <span className="nixie-effect nixie-spark nixie-spark-two" />
      <span className="nixie-effect nixie-spark nixie-spark-three" />
      <span className="nixie-effect nixie-dot nixie-dot-one" />
      <span className="nixie-effect nixie-dot nixie-dot-two" />
      <span className="nixie-effect nixie-dot nixie-dot-three" />
      <span className="nixie-effect nixie-warning" />
      <span className="nixie-effect nixie-success-burst" />
      <span className="nixie-effect nixie-build-grid" />
      <span className="nixie-effect nixie-thinking-orbit" />
    </div>
  );
}

function NixieAsset({ asset, active = false, pending = false }) {
  const className = `nixie-avatar-asset ${active ? "is-active" : ""} ${pending ? "is-pending" : ""}`;
  if (asset.type === "lottie") {
    return (
      <Lottie
        className={className}
        animationData={asset.animationData}
        loop
        autoplay
        rendererSettings={{ preserveAspectRatio: "xMidYMid meet" }}
      />
    );
  }
  if (asset.type === "image") {
    return (
      <img
        className={className}
        src={asset.src}
        alt=""
        draggable={false}
        decoding="async"
      />
    );
  }
  return (
    <video
      className={className}
      src={asset.src}
      autoPlay
      loop
      muted
      playsInline
      preload="auto"
    />
  );
}

function NixieFallback() {
  return (
    <div className="nixie-avatar-fallback" aria-hidden="true">
      <span />
    </div>
  );
}

export function setNixieState(state, meta = {}) {
  window.dispatchEvent(new CustomEvent("nixie:set-state", {
    detail: { state, ...meta },
  }));
}
