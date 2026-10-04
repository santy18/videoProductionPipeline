import React from 'react';
import {AbsoluteFill, interpolate, spring, useCurrentFrame, useVideoConfig} from 'remotion';
import {theme} from '../theme';
import type {SceneProps} from '../types';
import {zone, panel} from '../layout';

// Typewriter reveal
export const Quote: React.FC<SceneProps> = ({data, durationInFrames, image}) => {
  const f = useCurrentFrame(); const {fps} = useVideoConfig();
  const text = String(data.text ?? '');
  const chars = Math.floor(interpolate(f, [6, durationInFrames * 0.55], [0, text.length], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'}));
  const a = spring({frame: f - durationInFrames * 0.5, fps});
  return (
    <AbsoluteFill style={{padding: theme.safe.side, ...zone(image)}}>
      <div style={{fontSize: theme.u(200), color: theme.accent, lineHeight: 0.6, fontFamily: 'Georgia, serif'}}>“</div>
      <div style={{fontSize: theme.u(68), fontWeight: 600, lineHeight: 1.25, fontFamily: 'Georgia, serif'}}>
        {text.slice(0, chars)}<span style={{opacity: f % 30 < 15 ? 1 : 0}}>|</span>
      </div>
      <div style={{fontSize: theme.u(44), marginTop: theme.u(36), opacity: a, color: theme.accent}}>— {data.author}</div>
    </AbsoluteFill>
  );
};
