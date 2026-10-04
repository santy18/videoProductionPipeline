import React from 'react';
import {AbsoluteFill, spring, useCurrentFrame, useVideoConfig} from 'remotion';
import {theme} from '../theme';
import type {SceneProps} from '../types';

// Words pop in one by one; *wrapped* words get the accent colour
export const Kinetic: React.FC<SceneProps> = ({data}) => {
  const f = useCurrentFrame(); const {fps} = useVideoConfig();
  const tokens = String(data.text ?? '').split(/\s+/).filter(Boolean);
  return (
    <AbsoluteFill style={{justifyContent: 'center', alignItems: 'center', padding: theme.safe.side}}>
      <div style={{display: 'flex', flexWrap: 'wrap', justifyContent: 'center', gap: `${theme.u(10)}px ${theme.u(26)}px`, maxWidth: '100%'}}>
        {tokens.map((tok, i) => {
          const hl = tok.startsWith('*') || tok.endsWith('*') || tok.includes('*');
          const s = spring({frame: f - i * 4, fps, config: {damping: 12, mass: 0.6}});
          return (
            <span key={i} style={{
              fontSize: theme.u(theme.portrait ? 104 : 96), fontWeight: 850, lineHeight: 1.1,
              color: hl ? theme.accent : theme.fg, opacity: s,
              transform: `translateY(${(1 - s) * 40}px) scale(${hl ? 1 + 0.08 * s : 1})`, display: 'inline-block',
            }}>{tok.replace(/\*/g, '')}</span>
          );
        })}
      </div>
    </AbsoluteFill>
  );
};
