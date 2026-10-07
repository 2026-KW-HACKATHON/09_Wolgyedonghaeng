import { useCallback, useEffect, useRef, useState } from 'react';
import { copy } from '../../config/copy';
import {
  analyze,
  getCachedPrograms,
  getPrograms,
  isApiError,
  type AnalyzeResponse,
  type Household,
  type ProblemType,
} from '../../services/api';
import { useFlow } from '../../store/flow';
import { buildRows, type ResultRows } from './resultRows';

/** 이 시간이 지나도 답이 없으면 "조금 더 걸리고 있어요" (prd S3) */
export const SLOW_MS = 20000;

export type AnalyzePhase =
  | { kind: 'loading'; changing: boolean }
  | { kind: 'error'; message: string }
  | { kind: 'ready'; res: AnalyzeResponse; rows: ResultRows };

/** S3·S4 요청. 들어오면 한 번 보내고, 유형을 바꾸면 overrideType 으로 다시 보낸다. */
export function useAnalyze() {
  const [phase, setPhase] = useState<AnalyzePhase>({ kind: 'loading', changing: false });
  const [slow, setSlow] = useState(false);
  const token = useRef(0);
  const slowTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clearSlow = () => {
    if (slowTimer.current) clearTimeout(slowTimer.current);
    slowTimer.current = null;
  };

  /** 요청 본체. 화면 상태를 바꾸는 일은 응답이 온 뒤에만 한다. */
  const fetchResult = useCallback(async (id: number, overrideType?: ProblemType) => {
    clearSlow();
    slowTimer.current = setTimeout(() => {
      if (id === token.current) setSlow(true);
    }, SLOW_MS);
    const s = useFlow.getState();
    try {
      const res = await analyze({
        images: s.images,
        household: s.household as Household,
        address: s.address ?? null,
        building: s.building ?? null,
        overrideType: overrideType ?? null,
      });
      const programs = getCachedPrograms() ?? (await getPrograms());
      if (id !== token.current) return;
      clearSlow();
      useFlow.getState().setResult(res);
      setPhase({ kind: 'ready', res, rows: buildRows(res, programs) });
    } catch (e) {
      if (id !== token.current) return;
      clearSlow();
      setPhase({ kind: 'error', message: isApiError(e) ? e.message : copy.failure.unknown });
    }
  }, []);

  /** 다시 시도, 유형 바꾸기 */
  const run = useCallback(
    (overrideType?: ProblemType) => {
      const id = ++token.current;
      setPhase({ kind: 'loading', changing: !!overrideType });
      setSlow(false);
      return fetchResult(id, overrideType);
    },
    [fetchResult],
  );

  const cancel = useCallback(() => {
    token.current++;
    clearSlow();
  }, []);

  useEffect(() => {
    useFlow.getState().setResult(undefined);
    void fetchResult(++token.current);
    return cancel;
  }, [fetchResult, cancel]);

  return { phase, slow, run };
}
