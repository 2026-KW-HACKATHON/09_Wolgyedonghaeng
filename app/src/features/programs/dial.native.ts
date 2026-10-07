import { Linking } from 'react-native';
import { digitsOnly } from './callCenter';

export async function openDial(phone: string): Promise<boolean> {
  const digits = digitsOnly(phone);
  if (!digits) return false;
  try {
    await Linking.openURL(`tel:${digits}`);
    return true;
  } catch {
    return false;
  }
}
