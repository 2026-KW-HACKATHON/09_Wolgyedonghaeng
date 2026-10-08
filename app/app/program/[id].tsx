import { useLocalSearchParams, useRouter, type Href } from 'expo-router';
import React, { useCallback, useState } from 'react';
import { Linking, View } from 'react-native';
import { copy } from '../../src/config/copy';
import { createCard } from '../../src/features/cards/buildCard';
import { formatKoDate } from '../../src/features/cards/format';
import { Group, Item, Lines } from '../../src/features/programs/DetailParts';
import { openDial } from '../../src/features/programs/dial';
import {
  extractLinks,
  findProgram,
  findRecommendation,
  mergeToConfirm,
  resolvePhone,
} from '../../src/features/programs/detail';
import { amountLine, parseNextMonth } from '../../src/features/programs/resultRows';
import { usePrograms } from '../../src/features/programs/usePrograms';
import { saveCard, toggleSavedProgram, useSavedPrograms } from '../../src/services/storage';
import { useFlow } from '../../src/store/flow';
import {
  Amount,
  BackLink,
  PhoneButton,
  BigButton,
  Body,
  FixedBottomBar,
  Meta,
  Screen,
  StatusText,
  Title,
  Voice,
  useTheme,
} from '../../src/ui';

export default function ProgramDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { space } = useTheme();
  const { file, loading } = usePrograms();
  const result = useFlow((s) => s.result);
  const { items: savedList } = useSavedPrograms();
  const [amountOpen, setAmountOpen] = useState(false);
  const [noPhone, setNoPhone] = useState(false);
  const [making, setMaking] = useState(false);

  const program = findProgram(file, String(id));
  const rec = findRecommendation(result, String(id));
  const saved = savedList.find((s) => s.programId === String(id));

  const goBack = useCallback(() => {
    if (router.canGoBack()) router.back();
    else router.replace('/');
  }, [router]);

  if (!program) {
    return (
      <Screen
        footer={
          <FixedBottomBar>
            <BigButton
              variant="secondary"
              title={copy.program.goBack}
              accessibilityLabel={copy.program.goBackLabel}
              onPress={goBack}
            />
          </FixedBottomBar>
        }
      >
        <View style={{ paddingTop: space.xxl }}>
          <Voice accessibilityRole="header">{loading ? copy.program.loading : copy.program.notFound}</Voice>
        </View>
      </Screen>
    );
  }

  const phone = resolvePhone(program, file);
  const reason = rec?.reason ?? saved?.reasons[0];
  const confirms = mergeToConfirm(program, rec);
  const links = extractLinks(program.display.sourcesText);
  const nextText = program.apply.nextText;

  const onSave = () => {
    void toggleSavedProgram({
      programId: program.id,
      savedAt: new Date().toISOString(),
      reasons: reason ? [reason] : [],
    });
  };

  const onCall = async () => {
    if (!phone.phone) {
      setNoPhone(true);
      return;
    }
    setNoPhone(false);
    await openDial(phone.phone);
  };

  const onMakeCard = async () => {
    if (making) return;
    setMaking(true);
    try {
      const s = useFlow.getState();
      const card = await createCard(program, file, {
        household: s.household,
        address: s.address,
        building: s.building,
        result: s.result,
        images: s.images,
      });
      await saveCard(card);
      // 로그인 안내는 카드를 보여 준 뒤, 카드 화면에서 이미지를 저장·공유했을 때 한 번 한다
      router.push(`/card/${card.id}` as Href);
    } finally {
      setMaking(false);
    }
  };

  const saveButton = (
    <BigButton
      style={{ flex: 1 }}
      variant="secondary"
      compact
      title={saved ? copy.program.saved : copy.program.save}
      accessibilityLabel={saved ? copy.program.savedLabel : copy.program.saveLabel}
      onPress={onSave}
    />
  );
  const cardButton = (
    <BigButton
      style={{ flex: 1.3 }}
      variant="secondary"
      compact
      title={making ? copy.program.makingCard : copy.program.makeCard}
      accessibilityLabel={copy.program.makeCardLabel}
      disabled={making}
      onPress={onMakeCard}
    />
  );

  return (
    <Screen
      scroll
      footer={
        <FixedBottomBar>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.sm }}>
            {saveButton}
            {cardButton}
            <PhoneButton accessibilityLabel={copy.program.callLabel} onPress={onCall} />
          </View>
        </FixedBottomBar>
      }
    >
      <View style={{ gap: space.xl, paddingTop: space.xs, paddingBottom: space.lg }}>
        <BackLink onBack={goBack} />
        <View style={{ gap: space.xs }}>
          <Title accessibilityRole="header">{program.name}</Title>
          <Meta>{program.display.operatorText}</Meta>
          {program.dataConfidence === 'low' ? <Meta>{copy.program.infoChecking}</Meta> : null}
        </View>

        <Group>
          <Item title={copy.program.support}>
            <Lines text={program.display.supportItemsText} />
          </Item>

          <Item title={copy.program.amount}>
            <Amount>{amountLine(program, rec?.variant)}</Amount>
            {program.amount.detail ? (
              <>
                {amountOpen ? <Body>{program.amount.detail}</Body> : null}
                <BigButton
                  variant="text"
                  title={amountOpen ? copy.program.amountLess : copy.program.amountMore}
                  accessibilityLabel={amountOpen ? copy.program.amountLessLabel : copy.program.amountMoreLabel}
                  style={{ alignSelf: 'flex-start', marginLeft: -space.screen }}
                  onPress={() => setAmountOpen((v) => !v)}
                />
              </>
            ) : null}
          </Item>

          <Item title={copy.program.who}>
            <View style={{ gap: space.md }}>
              {(
                [
                  [copy.program.whoIncome, program.display.incomeText],
                  [copy.program.whoBuilding, program.display.buildingAgeText],
                  [copy.program.whoRegion, program.display.regionText],
                  [copy.program.whoConditions, program.display.conditionsText],
                ] as const
              ).map(([label, text]) =>
                text ? (
                  <View key={label} style={{ gap: 4 }}>
                    <Meta>{label}</Meta>
                    <Body>{text}</Body>
                  </View>
                ) : null,
              )}
            </View>
          </Item>

          {reason ? (
            <Item title={copy.program.whyMaybe}>
              <Body>{reason}</Body>
            </Item>
          ) : null}
        </Group>

        <Group>
          <Item title={copy.program.period}>
            <StatusText state={rec?.applyState ?? program.apply.state} nextMonth={parseNextMonth(nextText)} />
            {(rec?.applyState ?? program.apply.state) === 'check' ? <Body>{program.apply.text}</Body> : null}
            {nextText ? <Body>{nextText}</Body> : null}
            <Lines text={program.display.periodText} />
          </Item>

          <Item title={copy.program.howTo}>
            <Lines text={program.display.howToApplyText} />
          </Item>

          <Item title={copy.program.phone}>
            {phone.name ? <Body>{phone.name}</Body> : null}
            {phone.phone ? (
              <Body>{phone.phone}</Body>
            ) : (
              <Body>{copy.program.phoneChecking}</Body>
            )}
            {!phone.phone ? <Body tone="inkSoft">{copy.program.phoneFallbackHelp}</Body> : null}
            {noPhone ? <Meta accessibilityRole="alert">{copy.common.callCenterNoPhone}</Meta> : null}
          </Item>
        </Group>

        <Group>
          <Item title={copy.program.toConfirm}>
            {confirms.map((t) => (
              <Body key={t}>{`• ${t}`}</Body>
            ))}
            <Body>{copy.program.assetLine}</Body>
          </Item>
        </Group>

        <Group>
          <Item title={copy.program.source}>
            <Meta>{program.display.sourcesText}</Meta>
            {links.map((l) => (
              <BigButton
                key={l.url}
                variant="text"
                title={copy.program.openSource(l.host)}
                accessibilityLabel={copy.program.openSourceLabel(l.host)}
                style={{ alignSelf: 'flex-start', marginLeft: -space.screen }}
                onPress={() => {
                  Linking.openURL(l.url).catch(() => {});
                }}
              />
            ))}
          </Item>
          <View style={{ gap: space.xs }}>
            <Meta>{copy.program.asOf(file ? formatKoDate(file.asOf) || file.asOf : '')}</Meta>
            {program.dataNote ? <Meta>{program.dataNote}</Meta> : null}
          </View>
        </Group>
      </View>
    </Screen>
  );
}
