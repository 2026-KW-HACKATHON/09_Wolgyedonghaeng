import React, { useEffect, useState } from 'react';
import { View } from 'react-native';
import { copy } from '../../config/copy';
import { getProfile, type Profile } from '../../services/storage';
import { useFlow } from '../../store/flow';
import { BigButton, Voice, useTheme } from '../../ui';
import { profileToFlowPatch, shouldOfferProfile } from './defaults';

/** 저장된 정보가 있고 이번 검색이 비어 있으면 "저장된 정보로 시작할까요?"를 묻는다 (S1, S2). */
export function StartFromSaved({ scope }: { scope: 'household' | 'address' }) {
  const { space } = useTheme();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [done, setDone] = useState(false);

  useEffect(() => {
    let alive = true;
    getProfile()
      .then((p) => {
        const s = useFlow.getState();
        if (alive && shouldOfferProfile(p, s, scope)) setProfile(p);
      })
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, [scope]);

  if (!profile || done) return null;

  const accept = () => {
    const s = useFlow.getState();
    const patch = profileToFlowPatch(profile, s);
    if (patch.household) s.setHousehold(patch.household);
    if (patch.address) {
      s.setAddress(patch.address);
      s.setBuilding(undefined);
      s.setLookup('done');
    }
    setDone(true);
  };

  return (
    <View style={{ gap: space.sm, paddingTop: space.sm, paddingBottom: space.lg }}>
      <Voice accessibilityRole="header">{copy.startFromSaved.ask}</Voice>
      <BigButton title={copy.startFromSaved.yes} accessibilityLabel={copy.startFromSaved.yesLabel} onPress={accept} />
      <BigButton variant="secondary" title={copy.startFromSaved.no} onPress={() => setDone(true)} />
    </View>
  );
}
