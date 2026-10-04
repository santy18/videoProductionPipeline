import React from 'react';
import {AbsoluteFill, spring, useCurrentFrame, useVideoConfig} from 'remotion';
import {theme} from '../theme';
import type {Caption} from '../types';

// Burned-in captions, frames are relative to the scene
export const Captions: React.FC<{captions: Caption[]}> = ({captions}) => {
  const f = useCurrentFrame(); const {fps} = useVideoConfig();
  const cur = captions.find((c) => f >= c.from && f < c.to);
  if (!cur) return null;
  const s = spring({frame: f - cur.from, fps, config: {damping: 18, mass: 0.4}});
  return (
    <AbsoluteFill style={{justifyContent: 'flex-end', alignItems: 'center', paddingBottom: theme.safe.bottom * (theme.portrait ? 0.62 : 0.5)}}>
      <div style={{
        fontSize: theme.u(theme.portrait ? 58 : 46), fontWeight: 800, textAlign: 'center', maxWidth: '86%',
        padding: `${theme.u(10)}px ${theme.u(24)}px`, borderRadius: theme.u(16), background: '#000000aa',
        transform: `scale(${0.9 + 0.1 * s})`, opacity: s,
      }}>{cur.text}</div>
    </AbsoluteFill>
  );
};
