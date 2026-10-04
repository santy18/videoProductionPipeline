import React from 'react';
import {AbsoluteFill, interpolate, spring, useCurrentFrame, useVideoConfig} from 'remotion';
import {theme} from '../theme';
import type {SceneProps} from '../types';

// Animated triangle with 3 labelled vertices (e.g. Sternberg's love triangle).
// on_screen: {labels: [top, bottom-left, bottom-right], highlight?: [indices], caption?, heading?}
// highlight with 2 indices lights the edge between them; with 3 it fills the triangle.
export const Diagram: React.FC<SceneProps> = ({data}) => {
  const f = useCurrentFrame(); const {fps} = useVideoConfig();
  const labels: string[] = data.labels ?? ['', '', ''];
  const hi: number[] = data.highlight ?? [];
  const P = [[500, 150], [235, 770], [765, 770]];
  const edges = [[0, 1], [1, 2], [2, 0]];
  const L = 700;
  const size = theme.u(960);
  const lit = (i: number) => hi.includes(i);
  const edgeLit = ([a, b]: number[]) => lit(a) && lit(b);
  const fill = interpolate(f, [18, 36], [0, 1], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'});
  const cap = spring({frame: f - 22, fps, config: {damping: 14}});
  return (
    <AbsoluteFill style={{alignItems: 'center', justifyContent: 'center', textAlign: 'center', paddingBottom: theme.safe.bottom * 0.4}}>
      {data.heading && <div style={{fontSize: theme.u(76), fontWeight: 900, marginBottom: theme.u(10)}}>{data.heading}</div>}
      <svg width={size} height={size * 0.98} viewBox="0 0 1000 980" style={{overflow: 'visible'}}>
        {hi.length === 3 && <polygon points={P.map((p) => p.join(',')).join(' ')} fill={theme.accent} opacity={0.22 * fill} />}
        {edges.map(([a, b], i) => {
          const d = interpolate(f, [4 + i * 5, 24 + i * 5], [0, 1], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'});
          const on = edgeLit([a, b]);
          return <line key={i} x1={P[a][0]} y1={P[a][1]} x2={P[b][0]} y2={P[b][1]} stroke={on ? theme.accent : theme.fg}
            strokeOpacity={on ? 1 : 0.4} strokeWidth={on ? 20 : 8} strokeLinecap="round" strokeDasharray={L} strokeDashoffset={L * (1 - d)} />;
        })}
        {P.map((p, i) => {
          const s = spring({frame: f - 8 - i * 5, fps, config: {damping: 11}});
          const on = lit(i);
          const above = i === 0;
          return (
            <g key={i} transform={`translate(${p[0]} ${p[1]}) scale(${s})`}>
              <circle r={on ? 46 : 36} fill={on ? theme.accent : theme.bg} stroke={theme.accent} strokeWidth={8} />
              <text y={above ? -80 : 110} textAnchor="middle" fontSize={60} fontWeight={800} fill={on ? theme.accent : theme.fg}
                style={{fontFamily: theme.font}}>{labels[i]}</text>
            </g>
          );
        })}
      </svg>
      {data.caption && (
        <div style={{fontSize: theme.u(80), fontWeight: 900, color: theme.accent, opacity: cap, transform: `scale(${0.85 + 0.15 * cap})`}}>{data.caption}</div>
      )}
    </AbsoluteFill>
  );
};
