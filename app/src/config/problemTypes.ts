// 원본은 contracts/problem-types.json. Metro가 app 밖 경로를 읽지 못해 같은 내용을 복사해 둔다.
// 고칠 때는 contracts 쪽을 먼저 고치고 ./problem-types.json 에 그대로 복사한다.
import data from './problem-types.json';

export type ProblemTypeId =
  | 'leak'
  | 'mold'
  | 'window_insulation'
  | 'heating'
  | 'plumbing'
  | 'safety'
  | 'electric'
  | 'other';

export type ProblemIconKey =
  | 'leak'
  | 'mold'
  | 'window'
  | 'heating'
  | 'plumbing'
  | 'safety'
  | 'electric'
  | 'other';

export interface ProblemType {
  id: ProblemTypeId;
  label: string;
  criterion: string;
  icon: ProblemIconKey;
}

export const PROBLEM_TYPES: readonly ProblemType[] = data.types as ProblemType[];

export function getProblemType(id: string): ProblemType {
  return PROBLEM_TYPES.find((t) => t.id === id) ?? PROBLEM_TYPES[PROBLEM_TYPES.length - 1];
}

export function isProblemTypeId(id: string): id is ProblemTypeId {
  return PROBLEM_TYPES.some((t) => t.id === id);
}
