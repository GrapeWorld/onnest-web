"use client";

import { useState } from "react";
import Image from "next/image";

export function FeatureImage({
  src,
  alt,
  sizes,
  priority,
  objectPosition,
}: {
  src: string;
  alt: string;
  sizes: string;
  priority?: boolean;
  objectPosition?: string;
}) {
  const [failed, setFailed] = useState(false);

  if (failed) {
    return (
      <div
        aria-hidden
        className="absolute inset-0 bg-gradient-to-br from-[#F7F2E8] via-[#EDE6D6] to-[#DCEFE6]"
      />
    );
  }

  return (
    <Image
      src={src}
      alt={alt}
      fill
      sizes={sizes}
      priority={priority}
      className="object-cover transition duration-500 group-hover:scale-[1.02] motion-reduce:transform-none motion-reduce:transition-none"
      style={objectPosition ? { objectPosition } : undefined}
      onError={() => setFailed(true)}
    />
  );
}
