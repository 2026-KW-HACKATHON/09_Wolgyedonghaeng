import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useRef, useState } from 'react';
import { View } from 'react-native';
import { copy } from '../../src/config/copy';
import { CardPaper } from '../../src/features/cards/CardPaper';
import { goHomeClean } from '../../src/features/programs/goHome';
import { openDial } from '../../src/features/programs/dial';
import { saveCardImage, shareCardImage } from '../../src/services/capture';
import { deleteCard, useCards } from '../../src/services/storage';
import { useFlow } from '../../src/store/flow';
import { BigButton, Body, Meta, Screen, Voice, useTheme } from '../../src/ui';

export default function CardScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { space } = useTheme();
  const { items, loaded } = useCards();
  const paperRef = useRef<View>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [asking, setAsking] = useState(false);

  const card = items.find((c) => c.id === String(id));

  const goHome = () => {
    useFlow.getState().reset();
    goHomeClean(router);
  };

  if (!card) {
    return (
      <Screen>
        <View style={{ paddingTop: space.xxl, gap: space.lg }}>
          <Voice accessibilityRole="header">{loaded ? copy.card.notFound : copy.card.loading}</Voice>
          <BigButton variant="secondary" title={copy.card.home} accessibilityLabel={copy.card.homeLabel} onPress={goHome} />
        </View>
      </Screen>
    );
  }

  const fileName = `jipgyeol-card-${card.id}.png`;

  const onSaveImage = async () => {
    if (busy) return;
    setBusy(true);
    setMessage(null);
    const r = await saveCardImage(paperRef.current, fileName);
    setBusy(false);
    setMessage(
      r === 'saved'
        ? copy.card.imageSaved
        : r === 'downloaded'
          ? copy.card.imageDownloaded
          : r === 'denied'
            ? copy.card.permissionDenied
            : copy.card.imageFailed,
    );
  };

  const onShare = async () => {
    if (busy) return;
    setBusy(true);
    setMessage(null);
    const r = await shareCardImage(paperRef.current, fileName);
    setBusy(false);
    if (r === 'shared') setMessage(copy.card.shared);
    else if (r === 'downloaded') setMessage(copy.card.imageDownloaded);
    else if (r === 'failed') setMessage(copy.card.shareFailed);
  };

  const onCall = async () => {
    if (!card.phone) {
      setMessage(copy.common.callCenterNoPhone);
      return;
    }
    await openDial(card.phone);
  };

  const onDelete = async () => {
    await deleteCard(card.id);
    goHome();
  };

  return (
    <Screen scroll>
      <View style={{ gap: space.lg, paddingTop: space.lg, paddingBottom: space.lg }}>
        <CardPaper ref={paperRef} card={card} />

        <View style={{ gap: space.sm }}>
          <BigButton
            title={copy.card.saveImage}
            accessibilityLabel={copy.card.saveImageLabel}
            disabled={busy}
            onPress={onSaveImage}
          />
          <BigButton
            variant="secondary"
            title={copy.card.share}
            accessibilityLabel={copy.card.shareLabel}
            disabled={busy}
            onPress={onShare}
          />
          <BigButton
            variant="text"
            title={copy.card.call}
            accessibilityLabel={copy.card.callLabel}
            onPress={onCall}
          />
          {message ? (
            <Meta accessibilityLiveRegion="polite" accessibilityRole="alert" style={{ textAlign: 'center' }}>
              {message}
            </Meta>
          ) : null}
        </View>

        <View style={{ gap: space.xs }}>
          <BigButton variant="text" title={copy.card.home} accessibilityLabel={copy.card.homeLabel} onPress={goHome} />
          {asking ? (
            <View style={{ gap: space.sm }}>
              <Body style={{ textAlign: 'center' }}>{copy.card.deleteAsk}</Body>
              <BigButton variant="secondary" title={copy.card.deleteYes} accessibilityLabel={copy.card.deleteLabel} onPress={onDelete} />
              <BigButton variant="text" title={copy.card.deleteNo} onPress={() => setAsking(false)} />
            </View>
          ) : (
            <BigButton
              variant="text"
              title={copy.card.delete}
              accessibilityLabel={copy.card.deleteLabel}
              onPress={() => setAsking(true)}
            />
          )}
        </View>
      </View>
    </Screen>
  );
}
