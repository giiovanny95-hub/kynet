// API pública del módulo de cinemática.
export { createEngine, step } from './engine';
export type { EngineConfig, EngineEvent, EngineExercise, EngineState, Hud, ScoredRep } from './engine';
export { fromFlat, toPose } from './landmarks/adapter';
export { BLAZEPOSE33 } from './landmarks/models/blazepose33';
export { MOVENET17 } from './landmarks/models/movenet17';
export type { FrameMeta, JointId, Landmark, ModelSpec, Pose, PoseFrame, Vec2 } from './types';
export type { RepEvent } from './fsm/machine';
export type { Quality } from './scoring/quality';
