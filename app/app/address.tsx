import { useRouter } from 'expo-router';
import React, { useCallback, useEffect, useState } from 'react';
import { Linking, View } from 'react-native';
import { copy } from '../src/config/copy';
import { AddressSearch } from '../src/features/location/AddressSearch';
import { OUT_OF_REGION_URL, isOutOfRegion } from '../src/features/location/region';
import { startLookup, waitLookup } from '../src/features/location/startLookup';
import { getBuilding, type Address } from '../src/services/api';
import { useFlow } from '../src/store/flow';
import { BigButton, Body, FixedBottomBar, Meta, Screen, StepHeader, Title, Voice, useTheme } from '../src/ui';

/** 조회가 이 시간을 넘기면 직접 입력으로 넘어간다 (prd S2). */
const LOOKUP_WAIT_MS = 5000;

export default function AddressScreen() {
  const router = useRouter();
  const { space } = useTheme();
  const lookup = useFlow((s) => s.lookup);
  const address = useFlow((s) => s.address);
  const building = useFlow((s) => s.building);
  const setAddress = useFlow((s) => s.setAddress);
  const setBuilding = useFlow((s) => s.setBuilding);

  const [manual, setManual] = useState(false);
  const [timedOut, setTimedOut] = useState(false);
  const [busy, setBusy] = useState(false);
  /** 서울 밖 주소를 골랐을 때 계속할지 묻는 중인 주소 */
  const [outside, setOutside] = useState<Address | null>(null);

  useEffect(() => {
    startLookup().catch(() => {});
  }, []);

  useEffect(() => {
    if (lookup !== 'running') return;
    const t = setTimeout(() => setTimedOut(true), LOOKUP_WAIT_MS);
    return () => clearTimeout(t);
  }, [lookup]);

  /** 건물 정보가 없으면 받아 오고(실패해도 계속), 결과 화면으로 간다. */
  const proceed = useCallback(
    async (a: Address) => {
      setBusy(true);
      try {
        await waitLookup();
        const s = useFlow.getState();
        if (!s.building || s.address !== a) {
          try {
            setBuilding(await getBuilding(a));
          } catch {
            setBuilding({ fetchedOk: false });
          }
        }
        router.push('/results');
      } finally {
        setBusy(false);
      }
    },
    [router, setBuilding],
  );

  const confirm = useCallback(
    (a: Address) => {
      if (useFlow.getState().address !== a) {
        setAddress(a);
        setBuilding(undefined);
      }
      if (isOutOfRegion(a)) {
        setOutside(a);
        return;
      }
      void proceed(a);
    },
    [proceed, setAddress, setBuilding],
  );

  const header = <StepHeader step={3} onBack={() => (outside ? setOutside(null) : router.back())} />;

  // 서울 밖
  if (outside) {
    return (
      <Screen
        scroll
        footer={
          <FixedBottomBar>
            <BigButton
              title={copy.address.outOfRegionKeep}
              disabled={busy}
              onPress={() => {
                void proceed(outside);
              }}
            />
            <BigButton variant="secondary" title={copy.address.outOfRegionBack} onPress={() => setOutside(null)} />
          </FixedBottomBar>
        }
      >
        {header}
        <View style={{ gap: space.lg, paddingTop: space.lg }}>
          <Voice accessibilityRole="header">{copy.address.outOfRegion}</Voice>
          <BigButton
            variant="text"
            title={copy.address.outOfRegionLink}
            accessibilityLabel={copy.address.outOfRegionLinkLabel}
            style={{ alignSelf: 'flex-start', marginLeft: -space.screen }}
            onPress={() => {
              Linking.openURL(OUT_OF_REGION_URL).catch(() => {});
            }}
          />
        </View>
      </Screen>
    );
  }

  // 조회 중 (5초까지)
  if (lookup === 'running' && !manual && !timedOut) {
    return (
      <Screen>
        {header}
        <View style={{ paddingTop: space.xxl }}>
          <Voice accessibilityRole="header" accessibilityLiveRegion="polite">
            {copy.address.searching}
          </Voice>
        </View>
      </Screen>
    );
  }

  // 자동 조회 성공
  if (lookup === 'done' && address && !manual) {
    return (
      <Screen
        scroll
        footer={
          <FixedBottomBar>
            <BigButton
              title={copy.address.yes}
              disabled={busy}
              accessibilityLabel={`${copy.address.yes}, ${address.road}`}
              onPress={() => confirm(address)}
            />
            <BigButton variant="secondary" title={copy.address.manual} onPress={() => setManual(true)} />
          </FixedBottomBar>
        }
      >
        {header}
        <View style={{ gap: space.lg, paddingTop: space.lg }}>
          <Voice accessibilityRole="header">{copy.address.askHere}</Voice>
          <View style={{ gap: space.xs }}>
            <Title>{address.road}</Title>
            {address.jibun ? (
              <Meta>
                {copy.address.jibunPrefix} {address.jibun}
              </Meta>
            ) : null}
          </View>
          {building && !building.fetchedOk ? <Body tone="inkSoft">{copy.address.buildingUnknown}</Body> : null}
        </View>
      </Screen>
    );
  }

  // 직접 입력 (조회 실패·권한 거부·시간 초과·"아니요")
  return (
    <Screen scroll>
      {header}
      <View style={{ gap: space.lg, paddingTop: space.lg, paddingBottom: space.xl }}>
        <Voice accessibilityRole="header">{copy.address.searchTitle}</Voice>
        {lookup === 'failed' && !manual ? <Body tone="inkSoft">{copy.address.permissionDenied}</Body> : null}
        <AddressSearch disabled={busy} onPick={confirm} />
        {busy ? <Meta accessibilityLiveRegion="polite">{copy.address.checking}</Meta> : null}
      </View>
    </Screen>
  );
}
