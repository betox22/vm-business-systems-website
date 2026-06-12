import Lottie from "lottie-react";

export const avatarStates = [
  "idle",
  "listening",
  "thinking",
  "speaking",
  "happy",
  "confused",
  "success",
];

const defaultLabels = {
  idle: "Ready when you are",
  listening: "I'm listening",
  thinking: "Thinking through the best structure",
  speaking: "Explaining the next step",
  happy: "Let's build this together",
  confused: "I need a little more context",
  success: "Your draft is ready",
};

export function AvatarAssistant({
  state = "idle",
  name = "Luma",
  labels = {},
  animations = {},
  compact = false,
}) {
  const safeState = avatarStates.includes(state) ? state : "idle";
  const animationData = animations[safeState];
  const stateLabel = labels[safeState] || defaultLabels[safeState];

  return (
    <div className={`avatar-assistant ${compact ? "compact" : ""}`} data-avatar-state={safeState}>
      <div className="avatar-orb" aria-hidden="true">
        {animationData ? (
          <Lottie animationData={animationData} loop autoplay className="avatar-lottie" />
        ) : (
          <div className="avatar-css-face">
            <span className="avatar-eye left" />
            <span className="avatar-eye right" />
            <span className="avatar-mouth" />
            <span className="avatar-spark one" />
            <span className="avatar-spark two" />
            <span className="avatar-spark three" />
          </div>
        )}
        <div className="avatar-wave one" />
        <div className="avatar-wave two" />
      </div>
      <div className="avatar-caption">
        <strong>{name}</strong>
        <span>{stateLabel}</span>
      </div>
    </div>
  );
}

export default AvatarAssistant;
