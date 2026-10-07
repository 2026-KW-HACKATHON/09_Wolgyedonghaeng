import { useRouter, type Href } from 'expo-router';
import React from 'react';
import { View } from 'react-native';
import { copy } from '../../config/copy';
import { useCards, useSavedPrograms } from '../../services/storage';
import { Label, Meta, Row, useTheme } from '../../ui';
import { formatShortDate } from '../cards/format';
import { findProgram } from './detail';
import { usePrograms } from './usePrograms';

/** 홈 아래 "저장한 지원사업", "저장한 상담 카드" 목록 (design 7-9). */
export function SavedLists() {
  const router = useRouter();
  const { space } = useTheme();
  const { items: saved } = useSavedPrograms();
  const { items: cards } = useCards();
  const { file } = usePrograms();

  return (
    <View style={{ gap: space.xl, paddingTop: space.lg }}>
      <View style={{ gap: space.sm }}>
        <Label accessibilityRole="header">{copy.home.savedPrograms}</Label>
        {saved.length === 0 ? (
          <Meta>{copy.home.savedEmpty}</Meta>
        ) : (
          saved.map((s) => {
            const name = findProgram(file, s.programId)?.name ?? copy.home.programUnknown;
            return (
              <Row
                key={s.programId}
                title={name}
                statusText={copy.home.savedOn(formatShortDate(s.savedAt))}
                accessibilityLabel={copy.home.savedProgramLabel(name)}
                onPress={() => router.push(`/program/${s.programId}` as Href)}
              />
            );
          })
        )}
      </View>

      <View style={{ gap: space.sm }}>
        <Label accessibilityRole="header">{copy.home.savedCards}</Label>
        {cards.length === 0 ? (
          <Meta>{copy.home.cardsEmpty}</Meta>
        ) : (
          cards.map((c) => (
            <Row
              key={c.id}
              title={c.programName}
              statusText={copy.home.madeOn(formatShortDate(c.createdAt))}
              accessibilityLabel={copy.home.savedCardLabel(c.programName)}
              onPress={() => router.push(`/card/${c.id}` as Href)}
            />
          ))
        )}
      </View>
    </View>
  );
}
