import React from 'react';
import {AbsoluteFill, spring, useCurrentFrame, useVideoConfig} from 'remotion';
import {theme} from '../theme';
import type {SceneProps} from '../types';
import {zone, panel} from '../layout';

export const Bullets: React.FC<SceneProps> = ({data, durationInFrames, image}) => {
  const f = useCurrentFrame(); const {fps} = useVideoConfig();
  const items: string[] = data.items ?? [];
  // spread item reveals across the first ~60% of the scene so they land with the narration
  const step = Math.max(6, Math.floor((durationInFrames * 0.6) / Math.max(1, items.length)));
  const h = spring({frame: f, fps});
  return (
    <AbsoluteFill style={{padding: `${theme.safe.top}px ${theme.safe.side}px ${theme.safe.bottom}px`, ...zone(image)}}>
      <div style={panel(image)}>
      <div style={{fontSize: theme.u(84), fontWeight: 900, marginBottom: theme.u(50), opacity: h}}>{data.heading}</div>
      {items.map((it, i) => {
        const s = spring({frame: f - 10 - i * step, fps, config: {damping: 15}});
        return (
          <div key={i} style={{display: 'flex', alignItems: 'center', gap: theme.u(28), marginBottom: theme.u(34), opacity: s, transform: `translateX(${(1 - s) * -80}px)`}}>
            <div style={{flex: 'none', width: theme.u(64), height: theme.u(64), borderRadius: 99, background: theme.accent, color: theme.bg, fontWeight: 900, fontSize: theme.u(36), display: 'flex', alignItems: 'center', justifyContent: 'center'}}>{i + 1}</div>
            <div style={{fontSize: theme.u(60), fontWeight: 700, lineHeight: 1.15}}>{it}</div>
          </div>
        );
      })}
      </div>
    </AbsoluteFill>
  );
};
