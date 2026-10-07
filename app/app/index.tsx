import { useRouter } from 'expo-router';
import React, { useCallback, useEffect, useState } from 'react';
import { View } from 'react-native';
import { copy } from '../src/config/copy';
import { HomeTopBar } from '../src/features/photo/HomeTopBar';
import { PhotoBox, ThumbRow } from '../src/features/photo/PhotoBox';
import { hasSeenPhotoNotice, markPhotoNoticeSeen } from '../src/features/photo/photoNotice';
import { pickPhoto, type PhotoSource } from '../src/features/photo/pickPhoto';
import { MAX_IMAGES, useFlow } from '../src/store/flow';
import { BigButton, Body, FixedBottomBar, Meta, Screen, useTheme } from '../src/ui';

/** 저장한 사업·카드 목록 자리. 이후 작업(T33)에서 실제 목록으로 바꾼다. */
function SavedListsSlot() {
  return null;
}

export default function Home() {
  const router = useRouter();
  const { space } = useTheme();
  const images = useFlow((s) => s.images);
  const addImage = useFlow((s) => s.addImage);
  const removeImage = useFlow((s) => s.removeImage);
  const setImages = useFlow((s) => s.setImages);

  const [current, setCurrent] = useState(0);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [showNotice, setShowNotice] = useState(false);

  useEffect(() => {
    let alive = true;
    hasSeenPhotoNotice().then((seen) => {
      if (alive && !seen) setShowNotice(true);
    });
    return () => {
      alive = false;
    };
  }, []);

  const pick = useCallback(
    async (source: PhotoSource) => {
      if (busy) return;
      setBusy(true);
      setMessage(null);
      const res = await pickPhoto(source);
      setBusy(false);
      if (res.status === 'ok') {
        addImage(res.image);
        setCurrent(useFlow.getState().images.length - 1);
        if (showNotice) {
          setShowNotice(false);
          markPhotoNoticeSeen();
        }
      } else if (res.status === 'denied') {
        setMessage(source === 'camera' ? copy.home.cameraDenied : copy.home.albumDenied);
      } else if (res.status === 'failed') {
        setMessage(source === 'camera' ? copy.home.webCameraUnavailable : copy.home.processFailed);
      }
    },
    [busy, addImage, showNotice],
  );

  const hasPhoto = images.length > 0;
  const canAdd = images.length < MAX_IMAGES;
  const safeCurrent = Math.min(current, Math.max(images.length - 1, 0));

  return (
    <Screen
      scroll
      footer={
        <FixedBottomBar>
          {hasPhoto ? (
            <BigButton
              variant="secondary"
              title={copy.home.retake}
              accessibilityLabel={copy.home.retakeLabel}
              onPress={() => {
                setImages([]);
                setCurrent(0);
                setMessage(null);
              }}
            />
          ) : null}
          <BigButton
            title={copy.common.next}
            disabled={!hasPhoto}
            disabledReason={copy.home.nextDisabledReason}
            onPress={() => router.push('/household')}
          />
        </FixedBottomBar>
      }
    >
      <View style={{ gap: space.lg, paddingTop: space.xs }}>
        <HomeTopBar />

        <PhotoBox
          images={images}
          current={safeCurrent}
          busy={busy}
          onCamera={() => pick('camera')}
          onAlbum={() => pick('library')}
        />

        {hasPhoto ? (
          <View style={{ gap: space.sm }}>
            <ThumbRow images={images} current={safeCurrent} onSelect={setCurrent} />
            {images.length > 1 ? (
              <BigButton
                variant="text"
                title={copy.home.removeThis}
                accessibilityLabel={copy.home.removeThisLabel}
                onPress={() => {
                  removeImage(safeCurrent);
                  setCurrent(0);
                }}
              />
            ) : null}
            {canAdd ? (
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', columnGap: space.md }}>
                <BigButton variant="text" title={copy.home.addCamera} disabled={busy} onPress={() => pick('camera')} />
                <BigButton variant="text" title={copy.home.addAlbum} disabled={busy} onPress={() => pick('library')} />
              </View>
            ) : (
              <Meta>{copy.home.maxPhotos}</Meta>
            )}
          </View>
        ) : null}

        {busy ? <Meta accessibilityLiveRegion="polite">{copy.home.processing}</Meta> : null}
        {message ? (
          <Body tone="inkSoft" accessibilityLiveRegion="polite">
            {message}
          </Body>
        ) : null}
        {showNotice ? <Meta>{copy.home.photoNotice}</Meta> : null}

        <SavedListsSlot />
      </View>
    </Screen>
  );
}
