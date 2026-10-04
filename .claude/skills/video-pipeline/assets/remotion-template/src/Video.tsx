import React from 'react';
import {AbsoluteFill, Audio, Easing, Sequence, interpolate, staticFile, useCurrentFrame} from 'remotion';
import raw from './timesheet.json';
import type {SceneProps, Timesheet} from './types';
import {theme} from './theme';
import {Background} from './scenes/Background';
import {Backdrop} from './scenes/Backdrop';
import {Captions} from './scenes/Captions';
import {Title} from './scenes/Title';
import {Kinetic} from './scenes/Kinetic';
import {Bullets} from './scenes/Bullets';
import {Stat} from './scenes/Stat';
import {Quote} from './scenes/Quote';
import {Outro} from './scenes/Outro';
import {Broll} from './scenes/Broll';
import {Diagram} from './scenes/Diagram';

const ts = raw as unknown as Timesheet;

// Register new scene types here (and document them in references/script.md)
const SCENES: Record<string, React.FC<SceneProps>> = {
  title: Title, kinetic: Kinetic, bullets: Bullets, stat: Stat, quote: Quote, outro: Outro, broll: Broll, diagram: Diagram,
};

// Scene-to-scene transitions. The incoming scene animates in over the previous one, which is kept alive for
// TRANSITION extra frames underneath. Scene start frames never move, so audio/caption timing is untouched.
const TRANSITION = 10;
const KINDS = ['slide-up', 'zoom', 'wipe', 'slide-left', 'fade'] as const;

const Enter: React.FC<{index: number; children: React.ReactNode}> = ({index, children}) => {
  const f = useCurrentFrame();
  if (index === 0) return <AbsoluteFill>{children}</AbsoluteFill>;
  const p = interpolate(f, [0, TRANSITION], [0, 1], {extrapolateRight: 'clamp', easing: Easing.out(Easing.cubic)});
  const kind = KINDS[(index - 1) % KINDS.length];
  const style: React.CSSProperties =
    kind === 'slide-up' ? {transform: `translateY(${(1 - p) * 100}%)`} :
    kind === 'slide-left' ? {transform: `translateX(${(1 - p) * 100}%)`} :
    kind === 'wipe' ? {clipPath: `inset(0 ${(1 - p) * 100}% 0 0)`} :
    kind === 'zoom' ? {transform: `scale(${1.25 - 0.25 * p})`, opacity: p} : {opacity: p};
  return <AbsoluteFill style={style}>{children}</AbsoluteFill>;
};

const FadeOut: React.FC<{d: number; last: boolean; children: React.ReactNode}> = ({d, last, children}) => {
  const f = useCurrentFrame();
  const opacity = last ? interpolate(f, [d - 10, d], [1, 0], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'}) : 1;
  return <AbsoluteFill style={{opacity}}>{children}</AbsoluteFill>;
};

export const Video: React.FC = () => (
  <AbsoluteFill style={{backgroundColor: theme.bg, fontFamily: theme.font, color: theme.fg}}>
    {ts.scenes.map((s, i) => {
      const Comp = SCENES[s.type] ?? Kinetic;
      const last = i === ts.scenes.length - 1;
      const img = s.visual?.image ?? null;
      return (
        <Sequence key={s.id} from={s.start_frame} durationInFrames={s.duration_frames + (last ? 0 : TRANSITION)} name={`${s.id} ${s.type}`}>
          <FadeOut d={s.duration_frames} last={last}>
            <Enter index={i}>
              {/* every scene paints its own opaque base so the previous scene never shows through */}
              <AbsoluteFill style={{backgroundColor: theme.bg}} />
              {img ? <Backdrop src={img} motion={s.visual?.motion} durationInFrames={s.duration_frames} /> : <Background />}
              <Comp data={s.on_screen} durationInFrames={s.duration_frames} image={!!img} />
            </Enter>
            {s.audio && (
              <Sequence from={s.audio_offset_frames}>
                <Audio src={staticFile(s.audio)} />
              </Sequence>
            )}
            <Sequence durationInFrames={s.duration_frames}><Captions captions={s.captions} /></Sequence>
          </FadeOut>
        </Sequence>
      );
    })}
    {ts.has_music && <Audio src={staticFile('music.mp3')} volume={ts.music_volume} loop />}
  </AbsoluteFill>
);
