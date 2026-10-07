import React, { useState } from 'react';
import { Linking } from 'react-native';
import { copy } from '../../config/copy';
import { getCachedPrograms, getPrograms } from '../../services/api';
import { BigButton, Meta, type BigButtonVariant } from '../../ui';
import { digitsOnly } from './callCenter';

/** [행정복지센터에 전화하기]. 번호는 사업 데이터의 fallbackPhone 만 쓰고, 없으면 안내 문구만 보인다. */
export function CallCenterButton({ variant = 'secondary' }: { variant?: BigButtonVariant }) {
  const [noPhone, setNoPhone] = useState(false);

  const onPress = async () => {
    let phone = getCachedPrograms()?.fallbackPhone.phone ?? null;
    if (!phone) {
      try {
        phone = (await getPrograms()).fallbackPhone.phone ?? null;
      } catch {
        phone = null;
      }
    }
    const digits = phone ? digitsOnly(phone) : '';
    if (!digits) {
      setNoPhone(true);
      return;
    }
    setNoPhone(false);
    Linking.openURL(`tel:${digits}`).catch(() => setNoPhone(true));
  };

  return (
    <>
      <BigButton
        variant={variant}
        title={copy.common.callCenter}
        accessibilityLabel={copy.common.callCenterLabel}
        onPress={onPress}
      />
      {noPhone ? <Meta accessibilityRole="alert">{copy.common.callCenterNoPhone}</Meta> : null}
    </>
  );
}
