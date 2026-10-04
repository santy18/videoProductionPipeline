import React from 'react';
import {AbsoluteFill, spring, useCurrentFrame, useVideoConfig} from 'remotion';
import {theme} from '../theme';
import {zone} from '../layout';
import type {SceneProps} from '../types';

// Words pop in one by one; *wrapped* words get the accent colour. (No scale on highlights: it eats the gap to the next word.) Words are laid out as inline text with
// real spaces (not flex gaps), so adjacent highlighted words can never run together.
export const Kinetic: React.FC<SceneProps> = ({data, image}) => {
  const f = useCurrentFrame(); const {fps} = useVideoConfig();
  const tokens = String(data.text ?? '').split(/\s+/).filter(Boolean);
  return (
    <AbsoluteFill style={{alignItems: 'center', padding: theme.safe.side, ...zone(image)}}>
      <div style={{textAlign: 'center', maxWidth: '100%', lineHeight: 1.12, fontSize: theme.u(theme.portrait ? 104 : 96), fontWeight: 850}}>
        {tokens.map((tok, i) => {
          const hl = tok.includes('*');
          const s = spring({frame: f - i * 4, fps, config: {damping: 12, mass: 0.6}});
          return (
            <React.Fragment key={i}>
              <span style={{
                color: hl ? theme.accent : theme.fg, opacity: s, display: 'inline-block',
                transform: `translateY(${(1 - s) * 40}px)`, fontWeight: hl ? 900 : 850,
              }}>{tok.replace(/\*/g, '')}</span>{' '}
            </React.Fragment>
          );
        })}
      </div>
    </AbsoluteFill>
  );
};
