import React from 'react';
import {AbsoluteFill, Easing, Img, interpolate, staticFile, useCurrentFrame} from 'remotion';

const grain = `url("data:image/svg+xml;utf8,${encodeURIComponent(
  "<svg xmlns='http://www.w3.org/2000/svg' width='220' height='220'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='.9' numOctaves='2' stitchTiles='stitch'/></filter><rect width='100%' height='100%' filter='url(#n)' opacity='.55'/></svg>",
)}")`;

// Full-bleed generated image with a slow camera move (Ken Burns), scrims for text/captions, vignette and grain.
// motion: push-in | pull-out | pan-left | pan-right | drift
export const Backdrop: React.FC<{src: string; motion?: string; durationInFrames: number}> = ({src, motion = 'push-in', durationInFrames}) => {
  const f = useCurrentFrame();
  const t = Easing.inOut(Easing.quad)(interpolate(f, [0, Math.max(1, durationInFrames)], [0, 1], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'}));
  let scale = 1.1, x = 0, y = 0, origin = '50% 62%';
  if (motion === 'push-in') scale = 1.06 + 0.17 * t;
  else if (motion === 'pull-out') scale = 1.23 - 0.17 * t;
  else if (motion === 'pan-left') { scale = 1.2; x = 4 - 8 * t; }
  else if (motion === 'pan-right') { scale = 1.2; x = -4 + 8 * t; }
  else { scale = 1.14; x = 2.2 * Math.sin(t * Math.PI * 1.4); y = 1.6 * Math.cos(t * Math.PI * 1.1); origin = '50% 50%'; }
  return (
    <AbsoluteFill style={{backgroundColor: '#0b0f1a', overflow: 'hidden'}}>
      <Img src={staticFile(src)} style={{width: '100%', height: '100%', objectFit: 'cover', transformOrigin: origin, transform: `translate(${x}%, ${y}%) scale(${scale})`}} />
      <AbsoluteFill style={{background: 'linear-gradient(to bottom, rgba(5,8,18,.5) 0%, rgba(5,8,18,0) 34%, rgba(5,8,18,0) 68%, rgba(5,8,18,.5) 100%)'}} />
      <AbsoluteFill style={{background: 'radial-gradient(ellipse at 50% 50%, transparent 55%, rgba(0,0,0,.45) 100%)'}} />
      <AbsoluteFill style={{backgroundImage: grain, opacity: 0.07, mixBlendMode: 'overlay'}} />
    </AbsoluteFill>
  );
};
