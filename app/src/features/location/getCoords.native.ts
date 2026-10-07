import * as Location from 'expo-location';
import type { CoordsResult } from './getCoords';

export async function getCoords(): Promise<CoordsResult> {
  try {
    const perm = await Location.requestForegroundPermissionsAsync();
    if (!perm.granted) return { status: 'denied' };
    const pos = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
    return { status: 'ok', lat: pos.coords.latitude, lng: pos.coords.longitude };
  } catch {
    return { status: 'failed' };
  }
}
