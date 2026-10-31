export type FeedbackCode =
  | 'SQ_DEPTH_SHALLOW'
  | 'SQ_TRUNK_LEAN'
  | 'SQ_HEELS_LIFT'
  | 'SQ_TOO_FAST'
  | 'SQ_TOO_SLOW'
  | 'JJ_ARMS_LOW'
  | 'JJ_FEET_NARROW'
  | 'JJ_ASYMMETRY'
  | 'JJ_FACE_CAMERA'
  | 'PU_POSITION'
  | 'PU_DEPTH_SHALLOW'
  | 'PU_HIPS_SAG'
  | 'PU_HIPS_PIKE'
  | 'PU_TOO_FAST'
  | 'PU_TOO_SLOW'
  | 'VIS_LOW'
  | 'OUT_OF_FRAME'
  | 'VIEW_WRONG_FRONT'
  | 'VIEW_WRONG_SIDE'
  | 'SUBJECT_CHANGED'
  | 'CAL_ROM_TOO_SMALL'
  | 'CAL_INCONSISTENT';

export type Severity = 'low' | 'medium' | 'high' | 'pause';

/** Tabla de spec-cinematica §7. Los de calibración ("info" en la spec) van como `low`. */
export const SEVERITY: Readonly<Record<FeedbackCode, Severity>> = {
  SQ_DEPTH_SHALLOW: 'high',
  SQ_TRUNK_LEAN: 'medium',
  SQ_HEELS_LIFT: 'medium',
  SQ_TOO_FAST: 'low',
  SQ_TOO_SLOW: 'low',
  JJ_ARMS_LOW: 'high',
  JJ_FEET_NARROW: 'high',
  JJ_ASYMMETRY: 'low',
  JJ_FACE_CAMERA: 'pause',
  PU_POSITION: 'pause',
  PU_DEPTH_SHALLOW: 'high',
  PU_HIPS_SAG: 'medium',
  PU_HIPS_PIKE: 'medium',
  PU_TOO_FAST: 'low',
  PU_TOO_SLOW: 'low',
  VIS_LOW: 'pause',
  OUT_OF_FRAME: 'pause',
  VIEW_WRONG_FRONT: 'pause',
  VIEW_WRONG_SIDE: 'pause',
  SUBJECT_CHANGED: 'pause',
  CAL_ROM_TOO_SMALL: 'low',
  CAL_INCONSISTENT: 'low',
};

export function severityRank(s: Severity): number {
  'worklet';
  return s === 'pause' ? 3 : s === 'high' ? 2 : s === 'medium' ? 1 : 0;
}

export interface FeedbackEvent {
  readonly type: 'FEEDBACK';
  readonly code: FeedbackCode;
  readonly severity: Severity;
  readonly escalated: boolean;
  readonly tMs: number;
  readonly rep: number | null;
}
