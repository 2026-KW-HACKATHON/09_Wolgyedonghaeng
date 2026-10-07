import { useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { View } from 'react-native';
import { copy } from '../src/config/copy';
import { auth, useAuthUser } from '../src/features/auth';
import { incomePatch, showsHousingBenefit } from '../src/features/household/logic';
import {
  HousingBenefitQuestion,
  IncomeQuestion,
  Question,
  SizeQuestion,
  TenureQuestion,
} from '../src/features/household/Questions';
import { canSaveHousehold, draftToHousehold, type HouseholdDraft } from '../src/features/profile/defaults';
import { useProfileDraft } from '../src/features/profile/draft';
import { toRemoteProfile } from '../src/features/profile/toRemote';
import { putMyProfile } from '../src/services/api';
import { clearLocalData, getProfile, saveProfile, type Profile } from '../src/services/storage';
import { BigButton, Body, ChoiceButton, FixedBottomBar, Meta, Screen, Title, Voice, useTheme, type ThemeSetting } from '../src/ui';

const THEME_OPTIONS: [ThemeSetting, string][] = [
  ['auto', copy.home.themeAuto],
  ['light', copy.home.themeLight],
  ['dark', copy.home.themeDark],
];

type LogoutStep = 'idle' | 'confirm' | 'keep';

/** S7 내 정보: 로그인 상태, 사는 곳과 가구 정보 고치기, 화면 밝기, 로그아웃. */
export default function ProfileScreen() {
  const router = useRouter();
  const { space, setting, setSetting } = useTheme();
  const user = useAuthUser();
  const pickedAddress = useProfileDraft((s) => s.address);

  const [saved, setSaved] = useState<Profile | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [household, setHousehold] = useState<HouseholdDraft>({});
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [step, setStep] = useState<LogoutStep>('idle');

  useEffect(() => {
    let alive = true;
    getProfile()
      .then((p) => {
        if (!alive) return;
        setSaved(p);
        setHousehold(p?.household ? { ...p.household } : {});
      })
      .catch(() => {})
      .finally(() => {
        if (alive) setLoaded(true);
      });
    return () => {
      alive = false;
    };
  }, []);

  const goHome = () => {
    if (router.canGoBack()) router.back();
    else router.replace('/');
  };

  const address = pickedAddress ?? saved?.address ?? null;
  const patch = (p: Partial<HouseholdDraft>) => {
    setNotice(null);
    setHousehold((h) => ({ ...h, ...p }));
  };
  const canSave = canSaveHousehold(household);

  const onSave = async () => {
    if (busy) return;
    setBusy(true);
    const next: Profile = { household: draftToHousehold(household), address };
    await saveProfile(next);
    setSaved(next);
    useProfileDraft.getState().setAddress(undefined);
    let message: string = copy.profile.saved;
    const token = auth.getToken();
    if (user && token) {
      try {
        await putMyProfile(token, toRemoteProfile(next));
      } catch {
        message = copy.profile.savedLocalOnly; // 서버에 못 올려도 기기 저장은 그대로 둔다
      }
    }
    setNotice(message);
    setBusy(false);
  };

  const logout = async (keepData: boolean) => {
    setBusy(true);
    await auth.signOut();
    if (!keepData) await clearLocalData();
    setBusy(false);
    router.replace('/');
  };

  if (step !== 'idle') {
    return (
      <Screen
        footer={
          <FixedBottomBar>
            {step === 'confirm' ? (
              <>
                <BigButton
                  title={copy.profile.logoutYes}
                  accessibilityLabel={copy.profile.logoutLabel}
                  onPress={() => setStep('keep')}
                />
                <BigButton variant="secondary" title={copy.profile.logoutNo} onPress={() => setStep('idle')} />
              </>
            ) : (
              <>
                <BigButton title={copy.profile.keepYes} disabled={busy} onPress={() => logout(true)} />
                <BigButton
                  variant="secondary"
                  title={copy.profile.keepNo}
                  accessibilityLabel={copy.profile.keepNoLabel}
                  disabled={busy}
                  onPress={() => logout(false)}
                />
              </>
            )}
          </FixedBottomBar>
        }
      >
        <View style={{ paddingTop: space.xxl }}>
          <Voice accessibilityRole="header">
            {step === 'confirm' ? copy.profile.logoutAsk : copy.profile.keepAsk}
          </Voice>
        </View>
      </Screen>
    );
  }

  return (
    <Screen
      scroll
      footer={
        <FixedBottomBar>
          <BigButton
            title={copy.profile.save}
            accessibilityLabel={copy.profile.saveLabel}
            disabled={!loaded || !canSave || busy}
            disabledReason={!canSave ? copy.profile.saveDisabledReason : undefined}
            onPress={onSave}
          />
          {notice ? (
            <Meta accessibilityLiveRegion="polite" style={{ textAlign: 'center' }}>
              {notice}
            </Meta>
          ) : null}
        </FixedBottomBar>
      }
    >
      <View style={{ gap: space.xl, paddingTop: space.sm, paddingBottom: space.lg }}>
        <View style={{ alignItems: 'flex-start' }}>
          <BigButton
            variant="text"
            title={copy.profile.back}
            accessibilityLabel={copy.profile.backLabel}
            onPress={goHome}
            style={{ marginLeft: -space.screen }}
          />
        </View>

        <View style={{ gap: space.xs }}>
          <Title accessibilityRole="header">{copy.profile.title}</Title>
          {user ? (
            <Meta>{user.nickname ? copy.profile.signedInAs(user.nickname) : copy.profile.signedInNoName}</Meta>
          ) : (
            <Meta>{copy.profile.signedOut}</Meta>
          )}
        </View>

        {loaded ? (
          <>
            <Question title={copy.profile.addressTitle}>
              <Body>{address ? address.road : copy.profile.addressNone}</Body>
              <BigButton
                variant="secondary"
                title={copy.profile.addressAgain}
                accessibilityLabel={copy.profile.addressAgainLabel}
                onPress={() => router.push('/address?pick=profile')}
              />
            </Question>

            <SizeQuestion size={household.size} onChange={patch} />
            <IncomeQuestion
              size={household.size}
              income={household.income}
              onChange={(code) => patch(incomePatch(household, code))}
            />
            {showsHousingBenefit(household.income) ? (
              <HousingBenefitQuestion value={household.housingBenefit} onChange={(v) => patch({ housingBenefit: v })} />
            ) : null}
            <TenureQuestion value={household.tenure} onChange={(v) => patch({ tenure: v })} />
          </>
        ) : null}

        <Question title={copy.profile.themeTitle}>
          <View style={{ flexDirection: 'row', gap: space.xs }} accessibilityRole="radiogroup">
            {THEME_OPTIONS.map(([key, name]) => (
              <ChoiceButton
                key={key}
                size="wide64"
                title={name}
                selected={setting === key}
                onPress={() => setSetting(key)}
                style={{ flex: 1 }}
              />
            ))}
          </View>
        </Question>

        {user ? (
          <BigButton
            variant="secondary"
            title={copy.profile.logout}
            accessibilityLabel={copy.profile.logoutLabel}
            onPress={() => setStep('confirm')}
          />
        ) : (
          <Meta>{copy.profile.signedOutHelp}</Meta>
        )}
      </View>
    </Screen>
  );
}
