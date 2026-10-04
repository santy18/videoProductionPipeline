import React from 'react';
import {AbsoluteFill, interpolate, spring, useCurrentFrame, useVideoConfig} from 'remotion';
import {theme} from '../theme';
import type {SceneProps} from '../types';
import {zone, panel} from '../layout';

export const Title: React.FC<SceneProps> = ({data, image}) => {
  const f = useCurrentFrame(); const {fps} = useVideoConfig();
  const s = spring({frame: f, fps, config: {damping: 14}});
  const sub = spring({frame: f - 10, fps});
  const bar = interpolate(f, [6, 24], [0, 1], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'});
  return (
    <AbsoluteFill style={{alignItems: 'center', padding: theme.safe.side, textAlign: 'center', ...zone(image)}}>
      <div style={{fontSize: theme.u(120), fontWeight: 900, lineHeight: 1.05, transform: `scale(${0.8 + 0.2 * s})`, opacity: s}}>
        {data.title}
      </div>
      <div style={{height: theme.u(10), width: `${bar * 40}%`, background: theme.accent, margin: `${theme.u(36)}px 0`, borderRadius: 99}} />
      {data.subtitle && (
        <div style={{fontSize: theme.u(56), opacity: sub, transform: `translateY(${(1 - sub) * 30}px)`}}>{data.subtitle}</div>
      )}
    </AbsoluteFill>
  );
};
