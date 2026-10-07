export type CoordsResult = { status: 'ok'; lat: number; lng: number } | { status: 'denied' | 'failed' };

/** 현재 위치 좌표. 권한 요청 포함. 좌표를 로그에 남기지 않는다. */
export function getCoords(): Promise<CoordsResult>;
