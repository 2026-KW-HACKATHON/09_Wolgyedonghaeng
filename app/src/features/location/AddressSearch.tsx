import React, { useEffect, useRef, useState } from 'react';
import { TextInput, View } from 'react-native';
import { copy } from '../../config/copy';
import { searchAddress, type Address } from '../../services/api';
import { BigButton, Body, Meta, Row, useTheme } from '../../ui';
import { CallCenterButton } from '../programs/CallCenterButton';

export const SEARCH_DEBOUNCE_MS = 300;
const MIN_QUERY = 2;

interface Props {
  onPick: (a: Address) => void;
  disabled?: boolean;
}

/** 도로명주소 검색창 + 결과 목록. 입력이 멈춘 뒤 300ms 에 검색한다. */
export function AddressSearch({ onPick, disabled }: Props) {
  const { colors, radius, space, font, type, size } = useTheme();
  const [query, setQuery] = useState('');
  const [unit, setUnit] = useState('');
  const [results, setResults] = useState<Address[] | null>(null);
  const [failed, setFailed] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const seq = useRef(0);

  useEffect(() => {
    const q = query.trim();
    if (q.length < MIN_QUERY) {
      seq.current++;
      return;
    }
    const id = ++seq.current;
    const timer = setTimeout(() => {
      searchAddress(q)
        .then((list) => {
          if (id !== seq.current) return;
          setFailed(false);
          setResults(list);
        })
        .catch(() => {
          if (id !== seq.current) return;
          setFailed(true);
          setResults(null);
        });
    }, SEARCH_DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [query, attempt]);

  const active = query.trim().length >= MIN_QUERY;

  const input = {
    minHeight: size.buttonSecondary,
    borderRadius: radius.md,
    borderWidth: size.borderWidth,
    borderColor: colors.line,
    backgroundColor: colors.surface,
    color: colors.ink,
    paddingHorizontal: space.md,
    fontSize: type.body.size,
    ...font('400'),
  } as const;

  return (
    <View style={{ gap: space.md }}>
      <TextInput
        value={query}
        onChangeText={setQuery}
        placeholder={copy.address.searchPlaceholder}
        placeholderTextColor={colors.inkMuted}
        accessibilityLabel={copy.address.searchLabel}
        autoCorrect={false}
        autoCapitalize="none"
        returnKeyType="search"
        style={input}
      />

      {active && failed ? (
        <View style={{ gap: space.sm }}>
          <Body accessibilityRole="alert">{copy.address.searchFailed}</Body>
          <BigButton variant="secondary" title={copy.common.retry} onPress={() => setAttempt((n) => n + 1)} />
          <CallCenterButton />
        </View>
      ) : null}

      {active && results && results.length === 0 ? <Body tone="inkSoft">{copy.address.searchEmpty}</Body> : null}

      {active && results && results.length > 0 ? (
        <View style={{ gap: space.sm }}>
          <Meta>{copy.address.pickOne}</Meta>
          {results.map((a) => (
            <Row
              key={`${a.road}|${a.jibun ?? ''}`}
              title={a.road}
              reason={a.jibun ? `${copy.address.jibunPrefix} ${a.jibun}` : undefined}
              accessibilityLabel={`${a.road}, ${copy.address.jibunPrefix} ${a.jibun ?? ''}`}
              onPress={() => (disabled ? undefined : onPick(a))}
            />
          ))}
        </View>
      ) : null}

      <View style={{ gap: space.xs }}>
        <Meta>{copy.address.unitOptional}</Meta>
        <TextInput
          value={unit}
          onChangeText={setUnit}
          placeholder={copy.address.unitPlaceholder}
          placeholderTextColor={colors.inkMuted}
          accessibilityLabel={copy.address.unitLabel}
          style={input}
        />
      </View>
    </View>
  );
}
