import React from 'react';
import {AbsoluteFill, spring, useCurrentFrame, useVideoConfig} from 'remotion';
import {theme} from '../theme';
import type {SceneProps} from '../types';

export const Outro: React.FC<SceneProps> = ({data}) => {
  const f = useCurrentFrame(); const {fps} = useVideoConfig();
  const s = spring({frame: f, fps, config: {damping: 12}});
  const c = spring({frame: f - 15, fps});
  const pulse = 1 + 0.04 * Math.sin(f / 6);
  return (
    <AbsoluteFill style={{justifyContent: 'center', alignItems: 'center', textAlign: 'center', padding: theme.safe.side}}>
      <div style={{fontSize: theme.u(92), fontWeight: 900, opacity: s, transform: `scale(${0.85 + 0.15 * s})`}}>{data.text}</div>
      {data.cta && (
        <div style={{marginTop: theme.u(60), padding: `${theme.u(26)}px ${theme.u(56)}px`, borderRadius: 999, background: theme.accent, color: theme.bg,
          fontSize: theme.u(50), fontWeight: 800, opacity: c, transform: `scale(${c * pulse})`}}>{data.cta}</div>
      )}
    </AbsoluteFill>
  );
};
