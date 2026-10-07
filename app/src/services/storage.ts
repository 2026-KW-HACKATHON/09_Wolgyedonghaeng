// 저장소 (spec 6.2). 저장한 사업, 상담 카드, 내 정보, 작은 표시 값(flag)을 기기에 둔다.
// 화면은 이 파일의 함수·훅만 쓴다. 로그인 후에는 같은 인터페이스의 원격 구현으로 바꿔 끼운다.
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useEffect, useState } from 'react';
import type { Address, Household } from './api.models';
import type { ApplyStateValue } from '../features/programs/resultRows';

export interface SavedProgram {
  programId: string;
  /** ISO 시각 */
  savedAt: string;
  /** 저장할 때 보여 준 "해당될 수 있는 이유" */
  reasons: string[];
}

export interface ConsultCard {
  id: string;
  programId: string;
  /** ISO 시각 */
  createdAt: string;
  /** S1 답변. 답이 없으면 null (사업 상세만 보고 만든 카드) */
  household: Household | null;
  /** 동 단위까지만. 번지는 저장하지 않는다 */
  address: { dong: string } | null;
  buildYear: number | null;
  problemType: string;
  /** 가로 200px 안팎의 JPEG data URI */
  photoThumb?: string;
  /** 사업 정보 사본. 사업 목록을 받지 못한 오프라인에서도 카드가 열리도록 만들 때 함께 담는다 */
  programName: string;
  placeName: string | null;
  phone: string | null;
  applyState: ApplyStateValue | null;
  nextMonth: number | null;
  toConfirm: string[];
}

export interface Profile {
  household: Household | null;
  address: Address | null;
}

export interface Storage {
  getSavedPrograms(): Promise<SavedProgram[]>;
  toggleSavedProgram(p: SavedProgram): Promise<void>;
  getCards(): Promise<ConsultCard[]>;
  saveCard(c: ConsultCard): Promise<void>;
  deleteCard(id: string): Promise<void>;
  getProfile(): Promise<Profile | null>;
  saveProfile(p: Profile): Promise<void>;
  getFlag(key: string): Promise<boolean>;
  setFlag(key: string, v: boolean): Promise<void>;
}

export const KEY_PREFIX = 'jipgyeol:v1:';
export const MAX_CARDS = 20;

const K = {
  saved: `${KEY_PREFIX}savedPrograms`,
  cards: `${KEY_PREFIX}cards`,
  profile: `${KEY_PREFIX}profile`,
  flag: (key: string) => `${KEY_PREFIX}flag:${key}`,
};

// 같은 시각에 읽고 쓰는 일이 겹쳐도 값이 섞이지 않게 한 줄로 세운다.
let chain: Promise<unknown> = Promise.resolve();
function enqueue<T>(job: () => Promise<T>): Promise<T> {
  const next = chain.then(job, job);
  chain = next.catch(() => undefined);
  return next;
}

// 읽기·쓰기가 실패해도 앱이 멈추지 않게, 마지막으로 다룬 값을 메모리에도 둔다.
const memory = new Map<string, string>();

async function readJson<T>(key: string, fallback: T): Promise<T> {
  let raw: string | null | undefined;
  try {
    raw = await AsyncStorage.getItem(key);
  } catch {
    raw = memory.get(key);
  }
  if (raw == null) return fallback;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

async function writeRaw(key: string, raw: string): Promise<void> {
  memory.set(key, raw);
  try {
    await AsyncStorage.setItem(key, raw);
  } catch {
    // 저장 공간이 모자라거나 막혀 있어도 이번 실행 동안은 메모리 값으로 이어 간다
  }
}

const listeners = new Set<() => void>();
function emit(): void {
  listeners.forEach((l) => l());
}

export function createLocalStorage(): Storage {
  return {
    getSavedPrograms: () => readJson<SavedProgram[]>(K.saved, []),

    toggleSavedProgram: (p) =>
      enqueue(async () => {
        const list = await readJson<SavedProgram[]>(K.saved, []);
        const exists = list.some((x) => x.programId === p.programId);
        const next = exists ? list.filter((x) => x.programId !== p.programId) : [p, ...list];
        await writeRaw(K.saved, JSON.stringify(next));
        emit();
      }),

    getCards: () => readJson<ConsultCard[]>(K.cards, []),

    saveCard: (c) =>
      enqueue(async () => {
        const list = await readJson<ConsultCard[]>(K.cards, []);
        const next = [c, ...list.filter((x) => x.id !== c.id)].slice(0, MAX_CARDS);
        await writeRaw(K.cards, JSON.stringify(next));
        emit();
      }),

    deleteCard: (id) =>
      enqueue(async () => {
        const list = await readJson<ConsultCard[]>(K.cards, []);
        await writeRaw(K.cards, JSON.stringify(list.filter((x) => x.id !== id)));
        emit();
      }),

    getProfile: () => readJson<Profile | null>(K.profile, null),

    saveProfile: (p) =>
      enqueue(async () => {
        await writeRaw(K.profile, JSON.stringify(p));
        emit();
      }),

    getFlag: async (key) => (await readJson<string | null>(K.flag(key), null)) === '1',

    setFlag: (key, v) =>
      enqueue(async () => {
        await writeRaw(K.flag(key), JSON.stringify(v ? '1' : '0'));
      }),
  };
}

/**
 * 로그인 후에 쓸 원격 저장소. 서버 연결 전까지는 이번 실행 동안만 메모리에 둔다.
 */
export function createRemoteStorage(): Storage {
  let saved: SavedProgram[] = [];
  let cards: ConsultCard[] = [];
  let profile: Profile | null = null;
  const flags = new Map<string, boolean>();
  return {
    getSavedPrograms: async () => saved,
    toggleSavedProgram: async (p) => {
      saved = saved.some((x) => x.programId === p.programId)
        ? saved.filter((x) => x.programId !== p.programId)
        : [p, ...saved];
    },
    getCards: async () => cards,
    saveCard: async (c) => {
      cards = [c, ...cards.filter((x) => x.id !== c.id)].slice(0, MAX_CARDS);
    },
    deleteCard: async (id) => {
      cards = cards.filter((x) => x.id !== id);
    },
    getProfile: async () => profile,
    saveProfile: async (p) => {
      profile = p;
    },
    getFlag: async (key) => flags.get(key) ?? false,
    setFlag: async (key, v) => {
      flags.set(key, v);
    },
  };
}

/** 로그인할 때 기기에 있는 저장 값을 원격으로 한 번 올린다. 이미 원격에 있는 것은 건드리지 않는다. */
export async function migrateLocalToRemote(local: Storage, remote: Storage): Promise<void> {
  const [savedLocal, savedRemote, cardsLocal, cardsRemote, profileLocal, profileRemote] = await Promise.all([
    local.getSavedPrograms(),
    remote.getSavedPrograms(),
    local.getCards(),
    remote.getCards(),
    local.getProfile(),
    remote.getProfile(),
  ]);
  for (const p of [...savedLocal].reverse()) {
    if (!savedRemote.some((x) => x.programId === p.programId)) await remote.toggleSavedProgram(p);
  }
  for (const c of [...cardsLocal].reverse()) {
    if (!cardsRemote.some((x) => x.id === c.id)) await remote.saveCard(c);
  }
  if (profileLocal && !profileRemote) await remote.saveProfile(profileLocal);
}

/** 이 기기에 저장한 사업·카드·내 정보를 모두 지운다 (로그아웃할 때 [지울게요]). */
export function clearLocalData(): Promise<void> {
  return enqueue(async () => {
    for (const key of [K.saved, K.cards, K.profile]) {
      memory.delete(key);
      try {
        await AsyncStorage.removeItem(key);
      } catch {
        // 지우지 못해도 다음 읽기에서 빈 목록으로 보이도록 아래 빈 값을 쓴다
      }
    }
    await writeRaw(K.saved, '[]');
    await writeRaw(K.cards, '[]');
    await writeRaw(K.profile, 'null');
    emit();
  });
}

let current: Storage = createLocalStorage();

/** 저장소 구현을 바꾼다 (로그인 후 원격). */
export function setStorage(next: Storage): void {
  current = next;
  emit();
}

export const getSavedPrograms: Storage['getSavedPrograms'] = () => current.getSavedPrograms();
export const toggleSavedProgram: Storage['toggleSavedProgram'] = (p) => current.toggleSavedProgram(p);
export const getCards: Storage['getCards'] = () => current.getCards();
export const saveCard: Storage['saveCard'] = (c) => current.saveCard(c);
export const deleteCard: Storage['deleteCard'] = (id) => current.deleteCard(id);
export const getProfile: Storage['getProfile'] = () => current.getProfile();
export const saveProfile: Storage['saveProfile'] = (p) => current.saveProfile(p);
export const getFlag: Storage['getFlag'] = (key) => current.getFlag(key);
export const setFlag: Storage['setFlag'] = (key, v) => current.setFlag(key, v);

/** 저장 값이 바뀔 때마다 다시 읽는 훅. 홈과 상세 화면이 같은 값을 보게 한다. */
function useStored<T>(read: () => Promise<T>, initial: T): { items: T; loaded: boolean } {
  const [state, setState] = useState<{ items: T; loaded: boolean }>({ items: initial, loaded: false });
  useEffect(() => {
    let alive = true;
    const load = () => {
      read()
        .then((items) => {
          if (alive) setState({ items, loaded: true });
        })
        .catch(() => {
          if (alive) setState((s) => ({ ...s, loaded: true }));
        });
    };
    load();
    listeners.add(load);
    return () => {
      alive = false;
      listeners.delete(load);
    };
  }, [read]);
  return state;
}

const EMPTY_SAVED: SavedProgram[] = [];
const EMPTY_CARDS: ConsultCard[] = [];

export function useSavedPrograms(): { items: SavedProgram[]; loaded: boolean } {
  return useStored(getSavedPrograms, EMPTY_SAVED);
}

export function useCards(): { items: ConsultCard[]; loaded: boolean } {
  return useStored(getCards, EMPTY_CARDS);
}
