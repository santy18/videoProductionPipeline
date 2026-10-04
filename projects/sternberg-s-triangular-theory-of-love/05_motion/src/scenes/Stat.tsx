import React from 'react';
import {AbsoluteFill, Easing, interpolate, spring, useCurrentFrame, useVideoConfig} from 'remotion';
import {theme} from '../theme';
import type {SceneProps} from '../types';

export const Stat: React.FC<SceneProps> = ({data}) => {
  const f = useCurrentFrame(); const {fps} = useVideoConfig();
  const target = Number(data.value ?? 0);
  const decimals = data.decimals ?? (Number.isInteger(target) ? 0 : 1);
  const v = interpolate(f, [5, 5 + fps * 1.4], [0, target], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: Easing.out(Easing.cubic)});
  const label = spring({frame: f - fps, fps});
  const ring = interpolate(f, [5, 5 + fps * 1.4], [0, 1], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: Easing.out(Easing.cubic)});
  const R = theme.u(300), C = 2 * Math.PI * R;
  return (
    <AbsoluteFill style={{justifyContent: 'center', alignItems: 'center', textAlign: 'center'}}>
      <svg width={R * 2 + 40} height={R * 2 + 40} style={{position: 'absolute'}}>
        <circle cx={R + 20} cy={R + 20} r={R} fill="none" stroke={theme.accent} strokeOpacity={0.15} strokeWidth={theme.u(14)} />
        <circle cx={R + 20} cy={R + 20} r={R} fill="none" stroke={theme.accent} strokeWidth={theme.u(14)} strokeLinecap="round"
          strokeDasharray={C} strokeDashoffset={C * (1 - ring)} transform={`rotate(-90 ${R + 20} ${R + 20})`} />
      </svg>
      <div style={{fontSize: theme.u(150), fontWeight: 900, color: theme.accent, fontVariantNumeric: 'tabular-nums'}}>
        {data.prefix ?? ''}{v.toLocaleString('en-US', {minimumFractionDigits: decimals, maximumFractionDigits: decimals})}{data.suffix ?? ''}
      </div>
      <div style={{fontSize: theme.u(54), maxWidth: R * 1.6, opacity: label, transform: `translateY(${(1 - label) * 20}px)`}}>{data.label}</div>
    </AbsoluteFill>
  );
};
