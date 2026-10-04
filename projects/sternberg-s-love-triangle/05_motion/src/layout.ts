import type {CSSProperties} from 'react';
import {theme} from './theme';

// When a scene sits on top of generated b-roll, text moves to the calm top zone and gets a shadow
// (image prompts reserve the top third as negative space). Without an image it stays centred.
export const zone = (image: boolean | undefined, extra: CSSProperties = {}): CSSProperties => ({
  justifyContent: image ? 'flex-start' : 'center',
  ...(image ? {
    paddingTop: theme.safe.top + theme.u(70),
    textShadow: '0 3px 22px rgba(0,0,0,.8), 0 1px 5px rgba(0,0,0,.65)',
  } : {}),
  ...extra,
});

// translucent panel behind dense text when over imagery
export const panel = (image: boolean | undefined): CSSProperties => image ? {
  background: 'rgba(8,12,24,.58)', borderRadius: theme.u(36), padding: `${theme.u(40)}px ${theme.u(44)}px`,
  backdropFilter: 'blur(6px)',
} : {};
