"use client";

import { useState } from "react";
import type { ReactNode } from "react";

interface UserAvatarProps {
  src?: string | null;
  className?: string;
  fallback: ReactNode;
}

/** Google profile photos need no-referrer; fall back if URL is broken or expired. */
export default function UserAvatar({ src, className, fallback }: UserAvatarProps) {
  const [failed, setFailed] = useState(false);

  if (!src || failed) {
    return <>{fallback}</>;
  }

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={src}
      alt=""
      className={className}
      referrerPolicy="no-referrer"
      onError={() => setFailed(true)}
    />
  );
}
