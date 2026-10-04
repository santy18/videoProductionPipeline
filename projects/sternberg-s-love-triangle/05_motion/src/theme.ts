import raw from './timesheet.json';
import type {Timesheet} from './types';

const ts = raw as unknown as Timesheet;
const portrait = ts.height > ts.width;
const unit = Math.min(ts.width, ts.height) / 1080; // scale factor for sizes

export const theme = {
  ...ts.style,
  portrait,
  u: (n: number) => n * unit,
  // safe area: Shorts/Reels UI covers the bottom and right edges
  safe: portrait
    ? {top: 160 * unit, bottom: 420 * unit, side: 80 * unit}
    : {top: 90 * unit, bottom: 140 * unit, side: 140 * unit},
};
