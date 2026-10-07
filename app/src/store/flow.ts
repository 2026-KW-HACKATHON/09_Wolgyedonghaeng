import { create } from 'zustand';
import type {
  Address,
  AnalyzeResponse,
  Building,
  Household,
  LocalImage,
} from '../services/api.models';

export type LookupState = 'idle' | 'running' | 'done' | 'failed' | 'denied' | 'noCoords';

export const MAX_IMAGES = 3;

interface FlowData {
  images: LocalImage[];
  household: Partial<Household>;
  address?: Address;
  building?: Building | null;
  /** S1에서 시작한 주소·건물 조회 상태 */
  lookup: LookupState;
  result?: AnalyzeResponse;
}

interface FlowActions {
  setImages: (images: LocalImage[]) => void;
  addImage: (image: LocalImage) => void;
  replaceImage: (index: number, image: LocalImage) => void;
  removeImage: (index: number) => void;
  setHousehold: (patch: Partial<Household>) => void;
  setAddress: (address?: Address) => void;
  setBuilding: (building?: Building | null) => void;
  setLookup: (lookup: LookupState) => void;
  setResult: (result?: AnalyzeResponse) => void;
  /** 처음 상태로 (홈 초기 화면) */
  reset: () => void;
}

export type FlowState = FlowData & FlowActions;

const initial: FlowData = {
  images: [],
  household: {},
  address: undefined,
  building: undefined,
  lookup: 'idle',
  result: undefined,
};

export const useFlow = create<FlowState>((set) => ({
  ...initial,
  setImages: (images) => set({ images: images.slice(0, MAX_IMAGES) }),
  addImage: (image) =>
    set((s) => (s.images.length >= MAX_IMAGES ? s : { images: [...s.images, image] })),
  replaceImage: (index, image) =>
    set((s) => ({ images: s.images.map((im, i) => (i === index ? image : im)) })),
  removeImage: (index) => set((s) => ({ images: s.images.filter((_, i) => i !== index) })),
  setHousehold: (patch) => set((s) => ({ household: { ...s.household, ...patch } })),
  setAddress: (address) => set({ address }),
  setBuilding: (building) => set({ building }),
  setLookup: (lookup) => set({ lookup }),
  setResult: (result) => set({ result }),
  reset: () => set({ ...initial }),
}));
