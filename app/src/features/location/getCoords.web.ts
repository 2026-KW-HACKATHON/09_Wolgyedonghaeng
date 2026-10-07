import type { CoordsResult } from './getCoords';

const TIMEOUT_MS = 8000;

/** 브라우저 위치. HTTPS 또는 localhost 에서만 동작한다. */
export function getCoords(): Promise<CoordsResult> {
  return new Promise((resolve) => {
    const geo = typeof navigator !== 'undefined' ? navigator.geolocation : undefined;
    if (!geo) {
      resolve({ status: 'failed' });
      return;
    }
    geo.getCurrentPosition(
      (pos) => resolve({ status: 'ok', lat: pos.coords.latitude, lng: pos.coords.longitude }),
      (err) => resolve({ status: err.code === 1 ? 'denied' : 'failed' }),
      { enableHighAccuracy: false, timeout: TIMEOUT_MS, maximumAge: 60000 },
    );
  });
}
