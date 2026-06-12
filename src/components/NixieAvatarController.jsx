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
  idle: "/assets/nixie_idle.mp4",
  listening: "/assets/nixie_listening.mp4",
  thinking: "/assets/nixie_thinking.json",
  speaking: "/assets/nixie_speaking.mp4",
  building: "/assets/nixie_building.json",
  optimize: "/assets/nixie_optimize.mp4",
  success: "/assets/nixie_success.json",
  alert: "/assets/nixie_alert.mp4",
};

const EVENT_NAMES = ["nixie:set-state", "ai:state-change"];
const SAFE_FALLBACK_STATE = "idle";

function normalizeState(value) {
  return NIXIE_STATES.includes(value) ? value : SAFE_FALLBACK_STATE;
}

function assetType(src = "") {
  if (src.endsWith(".json")) return "lottie";
  if (src.endsWith(".mp4") || src.endsWith(".webm")) return "video";
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
  if (assetType(src) === "video") {
    await preloadVideo(src);
    return { type: "video", src };
  }
  if (assetType(src) === "lottie") {
    const response = await fetch(src, { cache: "force-cache" });
    if (!response.ok) throw new Error(`Could not load Lottie asset: ${src}`);
    return { type: "lottie", src, animationData: await response.json() };
  }
  throw new Error(`Unsupported Nixie asset type: ${src}`);
}

export default function NixieAvatarController({
  assets = DEFAULT_ASSETS,
  initialState = "idle",
  className = "",
  label = "Nixie AI assistant",
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
        <div className="nixie-avatar-scale-box">
          {displayAsset ? <NixieAsset asset={displayAsset} active /> : <NixieFallback />}
          {pendingAsset ? <NixieAsset asset={pendingAsset} pending /> : null}
        </div>
      </div>
      <figcaption className="nixie-avatar-caption">{activeState}</figcaption>
    </figure>
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
