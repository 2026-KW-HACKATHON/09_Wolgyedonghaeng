import { create } from 'zustand';
import type { Address } from '../../services/api.models';

/** 내 정보 화면에서 [주소 다시 찾기]로 고른 주소 (저장 전까지만 둔다). */
interface DraftState {
  address?: Address;
  setAddress: (a?: Address) => void;
}

export const useProfileDraft = create<DraftState>((set) => ({
  address: undefined,
  setAddress: (address) => set({ address }),
}));
