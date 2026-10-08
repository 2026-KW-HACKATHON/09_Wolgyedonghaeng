import { useLocalSearchParams, useRouter, type Href } from 'expo-router';
import React, { useRef, useState } from 'react';
import { View } from 'react-native';
import { copy } from '../../src/config/copy';
import { auth } from '../../src/features/auth';
import { markPromptSeen, readPromptFlags, shouldPromptLogin } from '../../src/features/auth/loginPrompt';
import { CardPaper } from '../../src/features/cards/CardPaper';
import { goHomeClean } from '../../src/features/programs/goHome';
import { openDial } from '../../src/features/programs/dial';
import { saveCardImage, shareCardImage } from '../../src/services/capture';
import { deleteCard, useCards } from '../../src/services/storage';
import { useFlow } from '../../src/store/flow';
import { BackLink, BigButton, Body, Screen, Voice, useTheme } from '../../src/ui';

function Notice({ at, message }: { at: 'save' | 'share' | 'call'; message: { at: string; text: string } | null }) {
  if (!message || message.at !== at) return null;
  return (
    <Body accessibilityLiveRegion="polite" accessibilityRole="alert" style={{ textAlign: 'center' }}>
      {message.text}
    </Body>
  );
}

export default function CardScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { space } = useTheme();
  const { items, loaded } = useCards();
  const paperRef = useRef<View>(null);
  // 안내 문구는 방금 누른 버튼 바로 아래에 보인다
  const [message, setMessage] = useState<{ at: 'save' | 'share' | 'call'; text: string } | null>(null);
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

  // 이미지를 저장하거나 보낸 뒤, 비로그인 사용자에게 보관 방법으로 로그인을 한 번 안내한다
  const maybePromptLogin = async () => {
    const flags = await readPromptFlags();
    if (shouldPromptLogin({ enabled: auth.enabled, signedIn: auth.getUser() !== null, ...flags })) {
      void markPromptSeen();
      router.push(`/login-modal?next=${encodeURIComponent(card.id)}&from=card` as Href);
    }
  };

  const onSaveImage = async () => {
    if (busy) return;
    setBusy(true);
    setMessage(null);
    const r = await saveCardImage(paperRef.current, fileName);
    setBusy(false);
    setMessage({
      at: 'save',
      text:
        r === 'saved'
          ? copy.card.imageSaved
          : r === 'downloaded'
            ? copy.card.imageDownloaded
            : r === 'denied'
              ? copy.card.permissionDenied
              : copy.card.imageFailed,
    });
    if (r === 'saved' || r === 'downloaded') await maybePromptLogin();
  };

  const onShare = async () => {
    if (busy) return;
    setBusy(true);
    setMessage(null);
    const r = await shareCardImage(paperRef.current, fileName);
    setBusy(false);
    if (r === 'shared') setMessage({ at: 'share', text: copy.card.shared });
    else if (r === 'downloaded') setMessage({ at: 'share', text: copy.card.imageDownloaded });
    else if (r === 'failed') setMessage({ at: 'share', text: copy.card.shareFailed });
    if (r === 'shared' || r === 'downloaded') await maybePromptLogin();
  };

  const onCall = async () => {
    if (!card.phone) {
      setMessage({ at: 'call', text: copy.common.callCenterNoPhone });
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
      <View style={{ gap: space.lg, paddingTop: space.sm, paddingBottom: space.lg }}>
        <BackLink onBack={() => (router.canGoBack() ? router.back() : goHome())} />
        <CardPaper ref={paperRef} card={card} />

        <View style={{ gap: space.sm }}>
          <BigButton
            title={copy.card.saveImage}
            accessibilityLabel={copy.card.saveImageLabel}
            disabled={busy}
            onPress={onSaveImage}
          />
          <Notice at="save" message={message} />
          <BigButton
            variant="secondary"
            title={copy.card.share}
            accessibilityLabel={copy.card.shareLabel}
            disabled={busy}
            onPress={onShare}
          />
          <Notice at="share" message={message} />
          <BigButton
            variant="text"
            title={copy.card.call}
            accessibilityLabel={copy.card.callLabel}
            onPress={onCall}
          />
          <Notice at="call" message={message} />
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
