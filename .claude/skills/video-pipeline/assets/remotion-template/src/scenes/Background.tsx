import React from 'react';
import {AbsoluteFill, useCurrentFrame, useVideoConfig} from 'remotion';
import {theme} from '../theme';

// Slow drifting glow blobs — cheap, always-on motion so no frame is static
export const Background: React.FC = () => {
  const f = useCurrentFrame();
  const {width, height} = useVideoConfig();
  const blob = (i: number) => {
    const t = f / 90 + i * 2.1;
    const x = width * (0.5 + 0.35 * Math.sin(t * 0.7 + i));
    const y = height * (0.5 + 0.3 * Math.cos(t * 0.5 + i * 1.7));
    return `radial-gradient(circle at ${x}px ${y}px, ${i % 2 ? theme.accent : '#4f6bff'}22 0%, transparent ${Math.max(width, height) * 0.35}px)`;
  };
  return <AbsoluteFill style={{background: [0, 1, 2].map(blob).join(',')}} />;
};
