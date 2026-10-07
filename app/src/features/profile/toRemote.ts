import type { RemoteProfile } from '../../services/api.models';
import type { Profile } from '../../services/storage';

/** 기기에 저장한 내 정보를 서버 모양으로 바꾼다. */
export function toRemoteProfile(p: Profile): RemoteProfile {
  return {
    household: p.household ? { ...p.household } : null,
    address: p.address ? { ...p.address } : null,
  };
}
