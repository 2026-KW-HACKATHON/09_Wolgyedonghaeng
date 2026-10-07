/**
 * S1에 들어올 때 부르는 주소·건물 조회 시작점 (spec 6.1).
 * 권한 -> 좌표 -> /address/reverse -> /building 순서로 store에 쌓는다.
 * 좌표·주소는 로그에 남기지 않는다.
 */
import { getBuilding, reverseAddress } from '../../services/api';
import { useFlow } from '../../store/flow';
import { getCoords } from './getCoords';

let inflight: Promise<void> | null = null;
let runId = 0;

export function startLookup(): Promise<void> {
  const { lookup } = useFlow.getState();
  if (lookup === 'done') return Promise.resolve();
  // 이미 도는 중이면 그 조회를 기다린다 (처음 상태로 돌아간 뒤에는 새로 시작)
  if (lookup === 'running' && inflight) return inflight;

  const id = ++runId;
  const alive = () => id === runId && useFlow.getState().lookup === 'running';
  useFlow.getState().setLookup('running');

  const run = (async () => {
    const coords = await getCoords();
    if (!alive()) return;
    if (coords.status !== 'ok') {
      useFlow.getState().setLookup('failed');
      return;
    }
    try {
      const address = await reverseAddress(coords.lat, coords.lng);
      if (!alive()) return;
      // 그 사이 직접 고른 주소가 있으면 덮어쓰지 않는다
      if (useFlow.getState().address) {
        useFlow.getState().setLookup('done');
        return;
      }
      useFlow.getState().setAddress(address);
      useFlow.getState().setLookup('done');
      try {
        const building = await getBuilding(address);
        if (id === runId && useFlow.getState().address === address) useFlow.getState().setBuilding(building);
      } catch {
        if (id === runId && useFlow.getState().address === address) {
          useFlow.getState().setBuilding({ fetchedOk: false });
        }
      }
    } catch {
      if (alive()) useFlow.getState().setLookup('failed');
    }
  })();

  const tracked: Promise<void> = run.finally(() => {
    if (inflight === tracked) inflight = null;
  });
  inflight = tracked;
  return tracked;
}

/** 조회가 도는 중이면 끝날 때까지 기다린다 (건물 정보까지). */
export function waitLookup(): Promise<void> {
  return inflight ?? Promise.resolve();
}
