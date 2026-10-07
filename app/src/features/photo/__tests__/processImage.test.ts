import { resizeActions } from '../processImage';

describe('resizeActions', () => {
  it('가로가 긴 큰 사진은 가로를 1024로 줄인다', () => {
    expect(resizeActions(4000, 3000)).toEqual([{ resize: { width: 1024 } }]);
  });
  it('세로가 긴 큰 사진은 세로를 1024로 줄인다', () => {
    expect(resizeActions(3000, 4000)).toEqual([{ resize: { height: 1024 } }]);
  });
  it('이미 작은 사진은 크기를 그대로 둔다', () => {
    expect(resizeActions(800, 600)).toEqual([]);
  });
});
