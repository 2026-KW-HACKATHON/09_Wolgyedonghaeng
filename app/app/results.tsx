import { useRouter, type Href } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { View } from 'react-native';
import { copy } from '../src/config/copy';
import { getProblemType, type ProblemTypeId } from '../src/config/problemTypes';
import { CallCenterButton } from '../src/features/programs/CallCenterButton';
import { ProblemPicker } from '../src/features/programs/ProblemPicker';
import { SearchingView } from '../src/features/programs/SearchingView';
import { resultKind, type ResultRow } from '../src/features/programs/resultRows';
import { useAnalyze } from '../src/features/programs/useAnalyze';
import { goHomeClean } from '../src/features/programs/goHome';
import { useFlow } from '../src/store/flow';
import {
  BackLink,
  BigButton,
  Body,
  FixedBottomBar,
  Label,
  Meta,
  Row,
  Screen,
  Title,
  Voice,
  VoiceLine,
  useTheme,
} from '../src/ui';

export default function ResultsScreen() {
  const router = useRouter();
  const { space } = useTheme();
  const hasImages = useFlow((s) => s.images.length > 0);
  const { phase, slow, run } = useAnalyze();
  const [confirmed, setConfirmed] = useState(false);
  const [picking, setPicking] = useState(false);
  const [showWhy, setShowWhy] = useState(false);

  // 사진이 없으면(새로고침 등) 처음으로
  useEffect(() => {
    if (!hasImages) router.replace('/');
  }, [hasImages, router]);

  const openProgram = (id: string) => router.push(`/program/${id}` as Href);
  const pick = (id: ProblemTypeId) => {
    setPicking(false);
    setConfirmed(true);
    void run(id);
  };

  // S3 찾는 중
  if (phase.kind === 'loading') {
    const sentences = slow ? [copy.searching.long] : phase.changing ? [copy.results.changing] : undefined;
    return (
      <Screen
        footer={
          slow ? (
            <FixedBottomBar>
              <BigButton title={copy.common.retry} onPress={() => run()} />
            </FixedBottomBar>
          ) : undefined
        }
      >
        <SearchingView key={slow ? 'slow' : 'normal'} sentences={sentences} />
      </Screen>
    );
  }

  // 실패
  if (phase.kind === 'error') {
    return (
      <Screen
        footer={
          <FixedBottomBar>
            <BigButton title={copy.common.retry} onPress={() => run()} />
            <CallCenterButton />
          </FixedBottomBar>
        }
      >
        <View style={{ gap: space.lg, paddingTop: space.xxl }}>
          <Voice accessibilityRole="header">{copy.results.errorVoice}</Voice>
          <Body tone="inkSoft">{phase.message}</Body>
        </View>
      </Screen>
    );
  }

  // S4 결과
  const { res, rows } = phase;
  const type = getProblemType(res.classification.type);
  const kind = resultKind(res, confirmed, rows);

  if (kind === 'confirm' && !picking) {
    const line = copy.results.confirmAsk(type.label);
    return (
      <Screen
        footer={
          <FixedBottomBar>
            <BigButton title={copy.results.confirmYes} onPress={() => setConfirmed(true)} />
            <BigButton variant="secondary" title={copy.results.confirmNo} onPress={() => setPicking(true)} />
          </FixedBottomBar>
        }
      >
        <View style={{ paddingTop: space.xxl }}>
          <VoiceLine {...line} />
        </View>
      </Screen>
    );
  }

  if (kind === 'other' || picking) {
    return (
      <Screen scroll>
        <View style={{ gap: space.lg, paddingTop: space.xl, paddingBottom: space.xl }}>
          {kind === 'other' ? (
            <>
              <Voice accessibilityRole="header">{copy.results.otherVoice}</Voice>
              <Body tone="inkSoft">{copy.results.otherPick}</Body>
            </>
          ) : (
            <Title accessibilityRole="header">{copy.results.pickTitle}</Title>
          )}
          <ProblemPicker onPick={pick} current={res.classification.type} />
          {kind === 'other' ? <CallCenterButton /> : null}
          {picking && kind !== 'other' ? (
            <BigButton variant="text" title={copy.common.back} onPress={() => setPicking(false)} />
          ) : null}
        </View>
      </Screen>
    );
  }

  const seen = copy.results.seenAs(type.label);
  const renderRow = (r: ResultRow, label?: string) => (
    <Row
      key={r.programId}
      title={r.title}
      note={r.note}
      reason={r.reason}
      amount={r.amount}
      amountPrefix={r.amountPrefix}
      state={r.state}
      nextMonth={r.nextMonth}
      statusText={r.statusText}
      accessibilityLabel={label}
      onPress={() => openProgram(r.programId)}
    />
  );

  return (
    <Screen scroll>
      <View style={{ gap: space.lg, paddingTop: space.sm, paddingBottom: space.xl }}>
        <BackLink
          onBack={() => goHomeClean(router)}
          label={copy.results.toStart}
          accessibilityLabel={copy.results.toStartLabel}
        />
        <View style={{ gap: space.xs }}>
          <VoiceLine {...seen} />
          <BigButton
            variant="text"
            title={copy.results.change}
            accessibilityLabel={copy.results.changeLabel}
            style={{ alignSelf: 'flex-start', marginLeft: -space.screen }}
            onPress={() => setPicking(true)}
          />
        </View>

        {kind === 'empty' ? (
          <View style={{ gap: space.md }}>
            <Voice accessibilityRole="header">{copy.results.emptyVoice}</Voice>
            <Body tone="inkSoft">{copy.results.emptyHelp}</Body>
            <CallCenterButton variant="primary" />
          </View>
        ) : (
          <View style={{ gap: space.sm }}>
            {rows.main.map((r) => renderRow(r))}
            {rows.checkup.length > 0 ? (
              <View style={{ paddingTop: space.md, gap: space.sm }}>
                {rows.checkup.map((r) =>
                  renderRow(
                    { programId: r.programId, title: copy.results.checkupRow },
                    copy.results.checkupLabel(r.title),
                  ),
                )}
              </View>
            ) : null}
          </View>
        )}

        {kind === 'list' ? (
          <View style={{ gap: space.xs }}>
            <Body>{copy.common.estimateNote}</Body>
            <Meta>{copy.common.assetNote}</Meta>
          </View>
        ) : null}

        {rows.excluded.length > 0 ? (
          <View style={{ gap: space.sm }}>
            <BigButton
              variant="text"
              title={showWhy ? copy.results.whyNotClose : copy.results.whyNot}
              style={{ alignSelf: 'flex-start', marginLeft: -space.screen }}
              onPress={() => setShowWhy((v) => !v)}
            />
            {showWhy
              ? rows.excluded.map((e) => (
                  <View key={e.programId} style={{ gap: 4 }}>
                    <Label>{e.name}</Label>
                    <Body tone="inkSoft">{e.why}</Body>
                  </View>
                ))
              : null}
          </View>
        ) : null}
      </View>
    </Screen>
  );
}
