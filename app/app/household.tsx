import { useRouter } from 'expo-router';
import React, { useEffect } from 'react';
import { View } from 'react-native';
import { copy } from '../src/config/copy';
import { incomePatch, isHouseholdComplete, showsHousingBenefit, toggleTrait } from '../src/features/household/logic';
import {
  HousingBenefitQuestion,
  IncomeQuestion,
  SizeQuestion,
  TenureQuestion,
  TraitsQuestion,
} from '../src/features/household/Questions';
import { StartFromSaved } from '../src/features/profile/StartFromSaved';
import { startLookup } from '../src/features/location/startLookup';
import { useFlow } from '../src/store/flow';
import { BigButton, FixedBottomBar, Screen, StepHeader, useTheme } from '../src/ui';

export default function HouseholdScreen() {
  const router = useRouter();
  const { space } = useTheme();
  const household = useFlow((s) => s.household);
  const setHousehold = useFlow((s) => s.setHousehold);

  // 이 화면에 들어오면 화면 뒤에서 주소·건물 조회를 시작한다
  useEffect(() => {
    startLookup().catch(() => {});
  }, []);

  const complete = isHouseholdComplete(household);

  return (
    <Screen
      scroll
      footer={
        <FixedBottomBar>
          <BigButton
            title={copy.common.next}
            disabled={!complete}
            disabledReason={copy.household.nextDisabledReason}
            onPress={() => router.push('/address')}
          />
        </FixedBottomBar>
      }
    >
      <StepHeader step={2} onBack={() => router.back()} />
      <StartFromSaved scope="household" />
      <View style={{ gap: space.xxl, paddingTop: space.sm }}>
        <SizeQuestion size={household.size} onChange={setHousehold} />
        <IncomeQuestion
          size={household.size}
          income={household.income}
          onChange={(code) => setHousehold(incomePatch(household, code))}
        />
        {showsHousingBenefit(household.income) ? (
          <HousingBenefitQuestion
            value={household.housingBenefit}
            onChange={(v) => setHousehold({ housingBenefit: v })}
          />
        ) : null}
        <TenureQuestion value={household.tenure} onChange={(v) => setHousehold({ tenure: v })} />
        <TraitsQuestion
          value={household.traits}
          onToggle={(t) => setHousehold({ traits: toggleTrait(household.traits, t) })}
        />
      </View>
    </Screen>
  );
}
