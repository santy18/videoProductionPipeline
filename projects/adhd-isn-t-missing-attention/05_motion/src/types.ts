export type Caption = {text: string; from: number; to: number};
export type Scene = {
  id: string; type: string; narration: string;
  visual?: {image: string | null; motion: string; shot?: string | null} | null;
  on_screen: Record<string, any>;
  start_frame: number; duration_frames: number;
  audio: string | null; audio_offset_frames: number;
  captions: Caption[];
};
export type Timesheet = {
  title: string; status: string; fps: number; width: number; height: number;
  total_frames: number; music_volume: number; has_music?: boolean;
  style: {bg: string; fg: string; accent: string; font: string};
  scenes: Scene[];
};
export type SceneProps = {data: Record<string, any>; durationInFrames: number; image?: boolean};
