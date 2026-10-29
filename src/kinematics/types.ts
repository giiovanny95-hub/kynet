export type JointId =
  | 'nose' | 'lEye' | 'rEye' | 'lEar' | 'rEar'
  | 'lShoulder' | 'rShoulder' | 'lElbow' | 'rElbow' | 'lWrist' | 'rWrist'
  | 'lHip' | 'rHip' | 'lKnee' | 'rKnee' | 'lAnkle' | 'rAnkle'
  | 'lHeel' | 'rHeel' | 'lFootIndex' | 'rFootIndex';

export interface ModelSpec {
  readonly id: 'movenet17' | 'blazepose33';
  readonly count: 17 | 33;
  readonly hasZ: boolean;
  readonly index: Readonly<Partial<Record<JointId, number>>>;
  /** MoveNet entrega (y, x, score); MediaPipe (x, y, z, visibility). */
  readonly layout: 'yxs' | 'xyzv';
  readonly visThreshold: number;
  readonly capabilities: Readonly<{ heel: boolean; footIndex: boolean; z: boolean }>;
}

export interface Landmark {
  readonly x: number;
  readonly y: number;
  readonly z: number;
  readonly v: number;
}

export interface Vec2 {
  readonly x: number;
  readonly y: number;
}

export interface FrameMeta {
  /** Marca de tiempo de cámara en ms. */
  readonly tMs: number;
  /** Medidas del cuadro ya rotado a vertical. */
  readonly width: number;
  readonly height: number;
  readonly rotation: 0 | 90 | 180 | 270;
  readonly mirrored: boolean;
}

export interface PoseFrame {
  readonly meta: FrameMeta;
  readonly model: ModelSpec['id'];
  readonly raw: readonly Landmark[];
}

export interface Pose {
  readonly tMs: number;
  readonly joints: Readonly<Partial<Record<JointId, Landmark>>>;
  /** Distancia entre el punto medio de los hombros y el de las caderas, o `null`. */
  readonly torso: number | null;
}
