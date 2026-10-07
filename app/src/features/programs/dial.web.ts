import { digitsOnly } from './callCenter';

// 새 탭을 열지 않고 같은 창에서 tel: 링크를 누른 것처럼 처리한다. 전화 앱이 없는 PC에서는 아무 일도 일어나지 않는다.
export async function openDial(phone: string): Promise<boolean> {
  const digits = digitsOnly(phone);
  if (!digits) return false;
  try {
    const a = document.createElement('a');
    a.href = `tel:${digits}`;
    a.style.display = 'none';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    return true;
  } catch {
    return false;
  }
}
