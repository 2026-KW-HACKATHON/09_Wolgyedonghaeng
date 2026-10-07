import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  MAX_CARDS,
  createLocalStorage,
  createRemoteStorage,
  migrateLocalToRemote,
  type ConsultCard,
  type SavedProgram,
} from '../storage';

jest.mock('@react-native-async-storage/async-storage', () =>
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  require('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);

const saved = (id: string): SavedProgram => ({ programId: id, savedAt: '2026-10-07T00:00:00.000Z', reasons: ['이유'] });
const card = (id: string): ConsultCard => ({
  id,
  programId: 'C01',
  createdAt: '2026-10-07T00:00:00.000Z',
  household: null,
  address: { dong: '서울특별시 노원구 월계동' },
  buildYear: 1985,
  problemType: 'leak',
  programName: '주거급여 수선유지급여',
  placeName: null,
  phone: null,
  applyState: 'always',
  nextMonth: null,
  toConfirm: [],
});

describe('저장소', () => {
  beforeEach(async () => {
    await AsyncStorage.clear();
  });

  it('사업 저장은 토글로 넣고 뺀다', async () => {
    const s = createLocalStorage();
    expect(await s.getSavedPrograms()).toEqual([]);
    await s.toggleSavedProgram(saved('C01'));
    await s.toggleSavedProgram(saved('S01'));
    expect((await s.getSavedPrograms()).map((p) => p.programId)).toEqual(['S01', 'C01']);
    await s.toggleSavedProgram(saved('S01'));
    expect((await s.getSavedPrograms()).map((p) => p.programId)).toEqual(['C01']);
  });

  it('겹쳐 눌러도 값이 섞이지 않는다', async () => {
    const s = createLocalStorage();
    await Promise.all([s.toggleSavedProgram(saved('A')), s.toggleSavedProgram(saved('B')), s.toggleSavedProgram(saved('C'))]);
    expect((await s.getSavedPrograms()).length).toBe(3);
  });

  it('카드를 저장하고 지운다', async () => {
    const s = createLocalStorage();
    await s.saveCard(card('a'));
    await s.saveCard(card('b'));
    expect((await s.getCards()).map((c) => c.id)).toEqual(['b', 'a']);
    await s.deleteCard('b');
    expect((await s.getCards()).map((c) => c.id)).toEqual(['a']);
  });

  it('같은 id 카드는 하나만 둔다', async () => {
    const s = createLocalStorage();
    await s.saveCard(card('a'));
    await s.saveCard({ ...card('a'), buildYear: 1990 });
    const list = await s.getCards();
    expect(list).toHaveLength(1);
    expect(list[0].buildYear).toBe(1990);
  });

  it(`카드는 최근 ${MAX_CARDS}개만 둔다`, async () => {
    const s = createLocalStorage();
    for (let i = 0; i < MAX_CARDS + 5; i++) await s.saveCard(card(`c${i}`));
    const list = await s.getCards();
    expect(list).toHaveLength(MAX_CARDS);
    expect(list[0].id).toBe(`c${MAX_CARDS + 4}`);
    expect(list.some((c) => c.id === 'c0')).toBe(false);
  });

  it('내 정보와 표시 값을 저장한다', async () => {
    const s = createLocalStorage();
    expect(await s.getProfile()).toBeNull();
    await s.saveProfile({ household: null, address: null });
    expect(await s.getProfile()).toEqual({ household: null, address: null });
    expect(await s.getFlag('photoNotice')).toBe(false);
    await s.setFlag('photoNotice', true);
    expect(await s.getFlag('photoNotice')).toBe(true);
    await s.setFlag('photoNotice', false);
    expect(await s.getFlag('photoNotice')).toBe(false);
  });

  it('키에 접두어를 붙인다', async () => {
    const s = createLocalStorage();
    await s.setFlag('photoNotice', true);
    expect(await AsyncStorage.getItem('jipgyeol:v1:flag:photoNotice')).not.toBeNull();
  });

  it('읽기와 쓰기가 실패해도 던지지 않는다', async () => {
    const s = createLocalStorage();
    const origGet = (AsyncStorage.getItem as jest.Mock).getMockImplementation();
    const origSet = (AsyncStorage.setItem as jest.Mock).getMockImplementation();
    const get = jest.spyOn(AsyncStorage, 'getItem').mockRejectedValue(new Error('x'));
    const set = jest.spyOn(AsyncStorage, 'setItem').mockRejectedValue(new Error('x'));
    await expect(s.getCards()).resolves.toBeDefined();
    await expect(s.saveCard(card('z'))).resolves.toBeUndefined();
    await expect(s.getCards()).resolves.toEqual(expect.arrayContaining([expect.objectContaining({ id: 'z' })]));
    get.mockImplementation(origGet as never);
    set.mockImplementation(origSet as never);
  });

  it('깨진 값이 있어도 빈 목록을 돌려준다', async () => {
    await AsyncStorage.setItem('jipgyeol:v1:cards', '{깨짐');
    expect(await createLocalStorage().getCards()).toEqual([]);
  });

  it('로컬 값을 원격으로 한 번 올린다', async () => {
    const local = createLocalStorage();
    const remote = createRemoteStorage();
    await local.toggleSavedProgram(saved('C01'));
    await local.saveCard(card('a'));
    await migrateLocalToRemote(local, remote);
    await migrateLocalToRemote(local, remote);
    expect((await remote.getSavedPrograms()).length).toBe(1);
    expect((await remote.getCards()).length).toBe(1);
  });
});
