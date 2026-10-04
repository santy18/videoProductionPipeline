export type StageState = 'done' | 'partial' | 'missing'
export interface Stage { id: string; label: string; state: StageState; detail?: string }
export interface ProjectSummary {
  slug: string; title: string; format: string | null; width: number | null; height: number | null
  duration: number | null; sceneCount: number; visualCount: number; hasFinal: boolean
  stages: Stage[]; size: number; mtime: number; hook: string | null
}
export interface TreeNode { name: string; path: string; dir: boolean; size: number; mtime: number; children?: TreeNode[] }
export interface Info { root: string; readonly: boolean; queue: string }

export interface ScriptScene {
  id: string; type: string; narration: string
  on_screen?: { text?: string; heading?: string; labels?: string[]; [k: string]: unknown }
  visual?: { prompt?: string; characters?: string[]; shot?: string; motion?: string; [k: string]: unknown } | null
  [k: string]: unknown
}
export interface Script { title: string; scenes: ScriptScene[]; [k: string]: unknown }
export interface SheetScene {
  id: string; start_sec: number; duration_sec: number; start_frame: number; duration_frames: number
  narration: string; type: string; audio?: string; visual?: { image?: string } | null
  captions?: { text: string; from: number; to: number }[]
}
export interface Timesheet { title: string; total_sec: number; fps: number; width: number; height: number; status: string; scenes: SheetScene[] }
