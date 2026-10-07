import React, { useState } from 'react';
import { Image, View } from 'react-native';
import { PROBLEM_TYPES } from '../src/config/problemTypes';
import {
  Amount,
  BigButton,
  Body,
  ChoiceButton,
  FixedBottomBar,
  Label,
  Meta,
  ProblemIcon,
  Row,
  Screen,
  StatusText,
  StepHeader,
  Title,
  VoiceLine,
  useReducedMotion,
  useTheme,
  type ThemeSetting,
} from '../src/ui';

const SETTINGS: [ThemeSetting, string][] = [
  ['auto', '자동'],
  ['light', '밝게'],
  ['dark', '어둡게'],
];

export default function DesignDemo() {
  const t = useTheme();
  const reduced = useReducedMotion();
  const [people, setPeople] = useState(2);
  const [income, setIncome] = useState(1);

  return (
    <Screen
      scroll
      footer={
        <FixedBottomBar>
          <BigButton variant="secondary" title="저장" onPress={() => {}} />
          <View style={{ flexDirection: 'row', gap: 12 }}>
            <BigButton style={{ flex: 1 }} title="전화하기" onPress={() => {}} />
            <BigButton style={{ flex: 1 }} variant="secondary" title="상담 카드 만들기" onPress={() => {}} />
          </View>
        </FixedBottomBar>
      }
    >
      <StepHeader step={2} onBack={() => {}} />
      <View style={{ gap: t.space.lg, paddingTop: t.space.sm }}>
        <Image source={t.logo} style={{ height: 40, width: 120 }} resizeMode="contain" accessibilityLabel="집결 로고" />
        <Meta>
          모드 {t.mode} · 설정 {t.setting} · 동작 줄이기 {reduced ? '켜짐' : '꺼짐'} · 글꼴 {t.fontsReady ? '로드됨' : '시스템'}
        </Meta>
        <View style={{ flexDirection: 'row', gap: 12 }}>
          {SETTINGS.map(([k, name]) => (
            <ChoiceButton
              key={k}
              size="wide64"
              style={{ flex: 1 }}
              title={name}
              selected={t.setting === k}
              onPress={() => t.setSetting(k)}
            />
          ))}
        </View>

        <VoiceLine before="" strong="누수" after=" 문제 있으시네요" />
        <Title>몇 명이 함께 사나요?</Title>
        <Body>설명 글은 20px 본문입니다. 크게, 또렷하게 읽혀야 해요.</Body>
        <Label>사업명 Label</Label>
        <Amount>1,234,000원</Amount>
        <Meta>기준일 2026-10-01 · Meta 17px</Meta>

        <View style={{ flexDirection: 'row', gap: 12 }}>
          {[1, 2, 3, 4].map((n) => (
            <ChoiceButton key={n} size="square72" title={`${n}`} accessibilityLabel={`${n}명`} selected={people === n} onPress={() => setPeople(n)} />
          ))}
        </View>
        {['123만 원 이하', '123만~154만 원', '154만~256만 원', '256만 원보다 많아요'].map((s, i) => (
          <ChoiceButton key={s} size="wide64" title={s} selected={income === i} onPress={() => setIncome(i)} />
        ))}
        <BigButton variant="text" title="잘 모르겠어요" onPress={() => {}} />

        <BigButton title="다음" onPress={() => {}} />
        <BigButton variant="secondary" title="다시 찍기" onPress={() => {}} />
        <BigButton title="다음" disabled disabledReason="사진을 넣으면 다음으로 갈 수 있어요" onPress={() => {}} />

        <View style={{ gap: 12 }}>
          <Row title="희망의 집수리" reason="오래된 집의 누수를 고칠 수 있을 수도 있어요" amount="최대 600만 원" state="open" onPress={() => {}} />
          <Row title="집수리 융자" reason="이자를 낮춰 빌릴 수 있을 수도 있어요" amountPrefix="대출이에요" amount="최대 1,000만 원" state="check" onPress={() => {}} />
          <Row title="수선유지급여" reason="올해 모집이 끝났어요" amount="최대 457만 원" state="closed_next" nextMonth={3} onPress={() => {}} />
          <Row title="저장한 사업" statusText="저장일 2026-10-07" onPress={() => {}} />
        </View>
        <View style={{ gap: 4 }}>
          <StatusText state="always" />
          <StatusText state="open" />
          <StatusText state="check" />
          <StatusText state="closed_next" nextMonth={3} />
        </View>

        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 20 }}>
          {PROBLEM_TYPES.map((p) => (
            <View key={p.id} style={{ width: 130, gap: 8 }}>
              <ProblemIcon name={p.icon} label={p.label} />
              <Label>{p.label}</Label>
              <Meta>{p.criterion}</Meta>
            </View>
          ))}
        </View>
      </View>
    </Screen>
  );
}
