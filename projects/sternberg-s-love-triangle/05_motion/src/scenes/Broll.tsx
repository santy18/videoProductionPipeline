import React from 'react';
import {AbsoluteFill, spring, useCurrentFrame, useVideoConfig} from 'remotion';
import {theme} from '../theme';
import {zone} from '../layout';
import type {SceneProps} from '../types';

// A pure visual beat: the backdrop does the work. Optional short `text` appears as a small label.
export const Broll: React.FC<SceneProps> = ({data, image}) => {
  const f = useCurrentFrame(); const {fps} = useVideoConfig();
  const s = spring({frame: f - 8, fps, config: {damping: 14}});
  if (!data.text) return null;
  return (
    <AbsoluteFill style={{alignItems: 'center', padding: theme.safe.side, ...zone(image)}}>
      <div style={{fontSize: theme.u(62), fontWeight: 800, padding: `${theme.u(14)}px ${theme.u(36)}px`, borderRadius: 999,
        background: 'rgba(8,12,24,.62)', border: `${theme.u(3)}px solid ${theme.accent}`, opacity: s, transform: `translateY(${(1 - s) * 30}px)`}}>
        {data.text}
      </div>
    </AbsoluteFill>
  );
};
