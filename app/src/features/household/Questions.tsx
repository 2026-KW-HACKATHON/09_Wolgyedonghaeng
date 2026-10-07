import React, { useState } from 'react';
import { TextInput, View } from 'react-native';
import Animated, { FadeIn, ReduceMotion } from 'react-native-reanimated';
import { bands, needsCounselConfirm } from '../../config/income-2026';
import { copy } from '../../config/copy';
import type { Household, IncomeBand, Tenure, Trait, YesNoUnknown } from '../../services/api.models';
import { ChoiceButton, Meta, Title, useFocusBorder, useReducedMotion, useTheme } from '../../ui';
import { parseSize } from './logic';
import { TextChoice } from './TextChoice';

type Patch = (p: Partial<Household>) => void;

export function Question({ title, children }: { title: string; children: React.ReactNode }) {
  const { space } = useTheme();
  return (
    <View style={{ gap: space.lg }}>
      <Title accessibilityRole="header">{title}</Title>
      <View style={{ gap: space.sm }}>{children}</View>
    </View>
  );
}

// 질문 1: 인원
export function SizeQuestion({ size, onChange }: { size?: number; onChange: Patch }) {
  const { colors, radius, space, font, type, size: dim } = useTheme();
  const [customOpen, setCustom] = useState(size !== undefined && size > 4);
  const [text, setText] = useState(size !== undefined && size > 4 ? String(size) : '');
  const [clamped, setClamped] = useState(false);
  const focus = useFocusBorder();
  // 저장된 정보로 시작해 5명 이상이 들어오면 직접 입력 칸을 열고 숫자를 채운다
  const custom = customOpen;
  if (size !== undefined && size > 4 && !customOpen) {
    setCustom(true);
    setText(String(size));
  }

  return (
    <Question title={copy.household.q1}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between' }} accessibilityRole="radiogroup">
        {[1, 2, 3, 4].map((n) => (
          <ChoiceButton
            key={n}
            size="square72"
            title={String(n)}
            accessibilityLabel={size === n ? copy.household.sizeSelected(n) : copy.household.sizeLabel(n)}
            selected={size === n}
            onPress={() => {
              setCustom(false);
              setText('');
              setClamped(false);
              onChange({ size: n });
            }}
          />
        ))}
      </View>
      <TextChoice
        title={copy.household.q1More}
        accessibilityLabel={copy.household.q1MoreLabel}
        selected={custom}
        onPress={() => setCustom(true)}
      />
      {custom ? (
        <View style={{ gap: space.xs }}>
          <TextInput
            value={text}
            onChangeText={(v) => {
              const r = parseSize(v);
              setClamped(r.clamped);
              setText(r.size !== null ? String(r.size) : v.replace(/\D/g, ''));
              if (r.size !== null) onChange({ size: r.size });
            }}
            keyboardType="number-pad"
            inputMode="numeric"
            maxLength={2}
            placeholder={copy.household.q1InputPlaceholder}
            placeholderTextColor={colors.inkMuted}
            onFocus={focus.onFocus}
            onBlur={focus.onBlur}
            accessibilityLabel={copy.household.q1InputLabel}
            style={{
              minHeight: dim.buttonSecondary,
              borderRadius: radius.sm,
              paddingHorizontal: space.md,
              backgroundColor: colors.surface,
              borderWidth: dim.borderWidth,
              ...focus.style,
              color: colors.ink,
              fontSize: type.amount.size,
              ...font('700'),
            }}
          />
          {clamped ? <Meta>{copy.household.q1InputMax}</Meta> : null}
        </View>
      ) : null}
    </Question>
  );
}

// 질문 2: 소득 (인원에 따라 금액이 바뀐다)
export function IncomeQuestion({
  size,
  income,
  onChange,
}: {
  size?: number;
  income?: IncomeBand;
  onChange: (c: IncomeBand) => void;
}) {
  const { motion } = useTheme();
  const reduced = useReducedMotion();
  const items = size ? bands(size) : [];
  // 인원이 바뀌면 버튼이 새로 나타나며 opacity만 바뀐다
  const entering = reduced ? undefined : FadeIn.duration(motion.fast).reduceMotion(ReduceMotion.System);

  return (
    <Question title={copy.household.q2}>
      {size ? (
        <>
          <Animated.View key={size} entering={entering} style={{ gap: 12 }} accessibilityRole="radiogroup">
            {items.map((b) => (
              <ChoiceButton
                key={b.code}
                size="wide64"
                title={b.label}
                selected={income === b.code}
                onPress={() => onChange(b.code)}
              />
            ))}
          </Animated.View>
          {needsCounselConfirm(size) ? <Meta>{copy.household.q2Over7}</Meta> : null}
          <TextChoice
            title={copy.household.q2Unknown}
            selected={income === 'unknown'}
            onPress={() => onChange('unknown')}
          />
        </>
      ) : (
        <Meta>{copy.household.q2Pick}</Meta>
      )}
    </Question>
  );
}

// 질문 3: 주거급여 (소득 le48 일 때만)
export function HousingBenefitQuestion({
  value,
  onChange,
}: {
  value?: YesNoUnknown | null;
  onChange: (v: YesNoUnknown) => void;
}) {
  const options: [YesNoUnknown, string][] = [
    ['yes', copy.common.yes],
    ['no', copy.common.no],
    ['unknown', copy.household.tenureUnknown],
  ];
  return (
    <Question title={copy.household.q3}>
      <View style={{ gap: 12 }} accessibilityRole="radiogroup">
        {options.map(([code, name]) => (
          <ChoiceButton
            key={code}
            size="wide64"
            title={name}
            selected={value === code}
            onPress={() => onChange(code)}
          />
        ))}
      </View>
    </Question>
  );
}

// 질문 4: 집 형태
export function TenureQuestion({ value, onChange }: { value?: Tenure; onChange: (v: Tenure) => void }) {
  const options: [Tenure, string][] = [
    ['own', copy.household.tenureOwn],
    ['rent', copy.household.tenureRent],
    ['public_rent', copy.household.tenurePublic],
    ['unknown', copy.household.tenureUnknown],
  ];
  return (
    <Question title={copy.household.q4}>
      <View style={{ gap: 12 }} accessibilityRole="radiogroup">
        {options.map(([code, name]) => (
          <ChoiceButton
            key={code}
            size="wide64"
            title={name}
            selected={value === code}
            onPress={() => onChange(code)}
          />
        ))}
      </View>
    </Question>
  );
}

// 질문 5: 가구 특성 (여러 개)
export function TraitsQuestion({
  value,
  onToggle,
}: {
  value?: Household['traits'];
  onToggle: (t: Trait | 'none') => void;
}) {
  const options: [Trait | 'none', string][] = [
    ['elderly65', copy.household.traitElderly],
    ['disabled', copy.household.traitDisabled],
    ['welfare', copy.household.traitWelfare],
    ['none', copy.household.traitNone],
  ];
  return (
    <Question title={copy.household.q5}>
      <View style={{ gap: 12 }}>
        {options.map(([code, name]) => (
          <ChoiceButton
            key={code}
            size="wide64"
            title={name}
            selected={code === 'none' ? value === 'none' : Array.isArray(value) && value.includes(code)}
            onPress={() => onToggle(code)}
          />
        ))}
      </View>
    </Question>
  );
}
