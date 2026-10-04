import React from 'react';
import {Composition} from 'remotion';
import {Video} from './Video';
import raw from './timesheet.json';
import type {Timesheet} from './types';

const ts = raw as unknown as Timesheet;

export const RemotionRoot: React.FC = () => (
  <Composition
    id="Main"
    component={Video}
    durationInFrames={Math.max(1, ts.total_frames)}
    fps={ts.fps}
    width={ts.width}
    height={ts.height}
  />
);
