import React, { useState } from "react";
import { getInitials } from "../utils/avatars";

const SIZE_MAP = {
  xs: "w-6 h-6 text-xs",
  sm: "w-8 h-8 text-xs",
  md: "w-10 h-10 text-sm",
  lg: "w-12 h-12 text-base",
  xl: "xl",
  xxl: "xxl"
};

// Distinct pastel gradient backgrounds for initials
const GRADIENTS = [
  "linear-gradient(135deg, #6366f1, #8b5cf6)",
  "linear-gradient(135deg, #3b82f6, #06b6d4)",
  "linear-gradient(135deg, #10b981, #14b8a6)",
  "linear-gradient(135deg, #f59e0b, #ef4444)",
  "linear-gradient(135deg, #ec4899, #8b5cf6)",
  "linear-gradient(135deg, #0ea5e9, #3b82f6)"
];

const getGradient = (str = "") => {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash);
  }
  return GRADIENTS[Math.abs(hash) % GRADIENTS.length];
};

export default function Avatar({ src, name = "", size = "md", className = "", style = {} }) {
  const [imgError, setImgError] = useState(false);
  const initials = getInitials(name);
  const hasImage = src && !imgError;

  return (
    <div
      className={`app-avatar ${size} ${className}`}
      style={{
        background: hasImage ? "transparent" : getGradient(name || "User"),
        ...style
      }}
      title={name}
    >
      {hasImage ? (
        <img
          src={src}
          alt={name || "Avatar"}
          onError={() => setImgError(true)}
          className="avatar-img"
        />
      ) : (
        <span className="avatar-initials">{initials}</span>
      )}
    </div>
  );
}
