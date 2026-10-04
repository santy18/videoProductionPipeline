import React from 'react';
import {AbsoluteFill, Audio, Sequence, interpolate, staticFile, useCurrentFrame} from 'remotion';
import raw from './timesheet.json';
import type {SceneProps, Timesheet} from './types';
import {theme} from './theme';
import {Background} from './scenes/Background';
import {Captions} from './scenes/Captions';
import {Title} from './scenes/Title';
import {Kinetic} from './scenes/Kinetic';
import {Bullets} from './scenes/Bullets';
import {Stat} from './scenes/Stat';
import {Quote} from './scenes/Quote';
import {Outro} from './scenes/Outro';

const ts = raw as unknown as Timesheet;

// Register new scene types here (and document them in references/script.md)
const SCENES: Record<string, React.FC<SceneProps>> = {
  title: Title, kinetic: Kinetic, bullets: Bullets, stat: Stat, quote: Quote, outro: Outro,
};

const Fade: React.FC<{d: number; children: React.ReactNode}> = ({d, children}) => {
  const f = useCurrentFrame();
  const opacity = interpolate(f, [0, 8, d - 8, d], [0, 1, 1, 0], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'});
  return <AbsoluteFill style={{opacity}}>{children}</AbsoluteFill>;
};

export const Video: React.FC = () => (
  <AbsoluteFill style={{backgroundColor: theme.bg, fontFamily: theme.font, color: theme.fg}}>
    <Background />
    {ts.scenes.map((s) => {
      const Comp = SCENES[s.type] ?? Kinetic;
      return (
        <Sequence key={s.id} from={s.start_frame} durationInFrames={s.duration_frames} name={`${s.id} ${s.type}`}>
          <Fade d={s.duration_frames}>
            <Comp data={s.on_screen} durationInFrames={s.duration_frames} />
          </Fade>
          {s.audio && (
            <Sequence from={s.audio_offset_frames}>
              <Audio src={staticFile(s.audio)} />
            </Sequence>
          )}
          <Captions captions={s.captions} />
        </Sequence>
      );
    })}
    {ts.has_music && <Audio src={staticFile('music.mp3')} volume={ts.music_volume} loop />}
  </AbsoluteFill>
);
