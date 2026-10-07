import React, { forwardRef } from 'react';
import { Image, View } from 'react-native';
import { copy } from '../../config/copy';
import type { ConsultCard } from '../../services/storage';
import { Body, ForceLight, Meta, StatusText, Title, useTheme } from '../../ui';
import { confirmLines, homeLines, problemLine } from './cardText';
import { formatKoDate } from './format';

const LOGO_HEIGHT = 28;
const THUMB = 72;

const Paper = forwardRef<View, { card: ConsultCard }>(function Paper({ card }, ref) {
  const { colors, radius, space, logo } = useTheme();
  const problem = problemLine(card);
  return (
    <View
      ref={ref}
      collapsable={false}
      style={{ backgroundColor: colors.raised, borderRadius: radius.lg, padding: 28, gap: space.lg }}
    >
      <View style={{ gap: space.xs }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.xs }}>
          <Image
            source={logo}
            style={{ width: LOGO_HEIGHT, height: LOGO_HEIGHT }}
            resizeMode="contain"
            accessibilityLabel={copy.card.logoLabel}
          />
          <Meta>{copy.card.title}</Meta>
        </View>
        <Title accessibilityRole="header">{card.programName}</Title>
        <View style={{ gap: 4 }}>
          {card.placeName ? <Body>{card.placeName}</Body> : null}
          <Body>{card.phone ?? copy.card.noPhone}</Body>
          {card.applyState ? <StatusText state={card.applyState} nextMonth={card.nextMonth} /> : null}
        </View>
      </View>

      <View style={{ gap: space.xs }}>
        <Meta>{copy.card.myHome}</Meta>
        {homeLines(card).map((line) => (
          <Body key={line}>{line}</Body>
        ))}
        {problem || card.photoThumb ? (
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.sm }}>
            {card.photoThumb ? (
              <Image
                source={{ uri: card.photoThumb }}
                style={{ width: THUMB, height: THUMB, borderRadius: radius.sm, backgroundColor: colors.surface }}
                resizeMode="cover"
                accessibilityLabel={copy.card.thumbLabel}
              />
            ) : null}
            {problem ? <Body style={{ flex: 1 }}>{problem}</Body> : null}
          </View>
        ) : null}
      </View>

      <View style={{ gap: space.xs }}>
        <Meta tone="care">{copy.card.toConfirm}</Meta>
        {confirmLines(card).map((t) => (
          <Body key={t}>{`• ${t}`}</Body>
        ))}
      </View>

      <Meta>{copy.card.madeOn(formatKoDate(card.createdAt))}</Meta>
    </View>
  );
});

/** 상담 종이 한 장. 다크 모드에서도 라이트 값으로 그려, 화면에서 본 모습 그대로 이미지가 된다. ref 는 캡처할 종이 영역. */
export const CardPaper = forwardRef<View, { card: ConsultCard }>(function CardPaper({ card }, ref) {
  return (
    <ForceLight>
      <Paper ref={ref} card={card} />
    </ForceLight>
  );
});
