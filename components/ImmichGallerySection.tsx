'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { Button } from '@/components/ui/Button';

interface ImmichAsset {
  id: string;
  type: 'IMAGE' | 'VIDEO' | 'AUDIO' | 'OTHER';
  originalFileName: string;
  fileCreatedAt: string | null;
  duration: string | null;
  exifInfo: {
    dateTimeOriginal: string | null;
    latitude: number | null;
    longitude: number | null;
    city: string | null;
    state: string | null;
    country: string | null;
    make: string | null;
    model: string | null;
    description: string | null;
  } | null;
}

interface ImmichPersonCluster {
  id: string;
  name: string;
  isHidden: boolean;
}

interface ImmichAlbumOption {
  id: string;
  albumName: string;
  assetCount: number;
}

interface ImmichGallerySectionProps {
  mode: 'person' | 'event';
  entityId: string;
  initialImmichPersonId?: string | null;
  initialImmichAlbumId?: string | null;
  immichConfigured: boolean;
}

export default function ImmichGallerySection({
  mode,
  entityId,
  initialImmichPersonId = null,
  initialImmichAlbumId = null,
  immichConfigured,
}: ImmichGallerySectionProps) {
  const router = useRouter();
  const t = useTranslations('immich');
  const tCommon = useTranslations('common');

  const [immichPersonId, setImmichPersonId] = useState<string>(
    initialImmichPersonId || ''
  );
  const [immichAlbumId, setImmichAlbumId] = useState<string>(
    initialImmichAlbumId || ''
  );

  const [assets, setAssets] = useState<ImmichAsset[]>([]);
  const [publicUrl, setPublicUrl] = useState<string | null>(null);
  const [isLoadingAssets, setIsLoadingAssets] = useState(false);
  const [assetsError, setAssetsError] = useState<string | null>(null);

  // Link Editor Panel state
  const [isEditingLink, setIsEditingLink] = useState(false);
  const [draftPersonId, setDraftPersonId] = useState<string>(
    initialImmichPersonId || ''
  );
  const [draftAlbumId, setDraftAlbumId] = useState<string>(
    initialImmichAlbumId || ''
  );
  const [immichPeople, setImmichPeople] = useState<ImmichPersonCluster[]>([]);
  const [immichAlbums, setImmichAlbums] = useState<ImmichAlbumOption[]>([]);
  const [isLoadingCatalog, setIsLoadingCatalog] = useState(false);
  const [isSavingLink, setIsSavingLink] = useState(false);
  const [personSearch, setPersonSearch] = useState('');

  // Avatar sync state
  const [settingAvatarId, setSettingAvatarId] = useState<string | null>(null);
  const [avatarToast, setAvatarToast] = useState<{
    type: 'success' | 'error';
    text: string;
  } | null>(null);

  // Lightbox state
  const [activeIndex, setActiveIndex] = useState<number | null>(null);

  const hasLinkedSource =
    (mode === 'person' && Boolean(immichPersonId)) || Boolean(immichAlbumId);

  const fetchAssets = useCallback(async () => {
    if (!immichConfigured || !hasLinkedSource) {
      setAssets([]);
      return;
    }

    setIsLoadingAssets(true);
    setAssetsError(null);

    try {
      const params = new URLSearchParams();
      if (mode === 'person' && immichPersonId) {
        params.set('personId', immichPersonId);
      }
      if (immichAlbumId) {
        params.set('albumId', immichAlbumId);
      }
      params.set('size', '48');

      const res = await fetch(`/api/immich/assets?${params.toString()}`);
      const data = await res.json();

      if (!res.ok) {
        setAssetsError(data.error || t('loadAssetsError'));
      } else {
        setAssets(Array.isArray(data.assets) ? data.assets : []);
        if (data.publicUrl) {
          setPublicUrl(data.publicUrl);
        }
      }
    } catch {
      setAssetsError(t('loadAssetsError'));
    } finally {
      setIsLoadingAssets(false);
    }
  }, [immichConfigured, hasLinkedSource, mode, immichPersonId, immichAlbumId, t]);

  useEffect(() => {
    fetchAssets();
  }, [fetchAssets]);

  const openLinkEditor = async () => {
    setDraftPersonId(immichPersonId);
    setDraftAlbumId(immichAlbumId);
    setIsEditingLink(true);

    if (immichPeople.length === 0 && immichAlbums.length === 0) {
      setIsLoadingCatalog(true);
      try {
        const requests: Promise<Response>[] = [fetch('/api/immich/albums')];
        if (mode === 'person') {
          requests.push(fetch('/api/immich/people'));
        }
        const [albumsRes, peopleRes] = await Promise.all(requests);
        if (albumsRes?.ok) {
          const albumsData = await albumsRes.json();
          setImmichAlbums(
            Array.isArray(albumsData.albums) ? albumsData.albums : []
          );
        }
        if (peopleRes?.ok) {
          const peopleData = await peopleRes.json();
          setImmichPeople(
            Array.isArray(peopleData.people) ? peopleData.people : []
          );
        }
      } catch {
        // Ignore catalog pre-fetch errors; manual ID input still works
      } finally {
        setIsLoadingCatalog(false);
      }
    }
  };

  const handleSaveLinks = async () => {
    setIsSavingLink(true);
    try {
      const endpoint =
        mode === 'person'
          ? `/api/people/${entityId}/immich`
          : `/api/events/${entityId}/immich`;

      const payload =
        mode === 'person'
          ? {
              immichPersonId: draftPersonId.trim() || null,
              immichAlbumId: draftAlbumId.trim() || null,
            }
          : {
              immichAlbumId: draftAlbumId.trim() || null,
            };

      const res = await fetch(endpoint, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        if (mode === 'person') {
          setImmichPersonId(draftPersonId.trim());
        }
        setImmichAlbumId(draftAlbumId.trim());
        setIsEditingLink(false);
        router.refresh();
      }
    } finally {
      setIsSavingLink(false);
    }
  };

  const handleSetAsAvatar = async (assetId: string) => {
    if (mode !== 'person') return;
    setSettingAvatarId(assetId);
    setAvatarToast(null);

    try {
      const res = await fetch(`/api/people/${entityId}/immich`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ assetId }),
      });

      const data = await res.json();
      if (!res.ok) {
        setAvatarToast({
          type: 'error',
          text: data.error || t('setAvatarError'),
        });
      } else {
        setAvatarToast({
          type: 'success',
          text: t('setAvatarSuccess'),
        });
        router.refresh();
      }
    } catch {
      setAvatarToast({
        type: 'error',
        text: t('setAvatarError'),
      });
    } finally {
      setSettingAvatarId(null);
    }
  };

  // Keyboard navigation for lightbox
  useEffect(() => {
    if (activeIndex === null) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setActiveIndex(null);
      } else if (e.key === 'ArrowRight') {
        setActiveIndex((prev) =>
          prev !== null && prev < assets.length - 1 ? prev + 1 : prev
        );
      } else if (e.key === 'ArrowLeft') {
        setActiveIndex((prev) =>
          prev !== null && prev > 0 ? prev - 1 : prev
        );
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [activeIndex, assets.length]);

  const filteredClusters = immichPeople.filter((p) => {
    if (!personSearch.trim()) return true;
    const q = personSearch.toLowerCase();
    return (
      (p.name && p.name.toLowerCase().includes(q)) ||
      p.id.toLowerCase().includes(q)
    );
  });

  const activeAsset = activeIndex !== null ? assets[activeIndex] : null;

  if (!immichConfigured) {
    return (
      <div className="border border-border rounded-lg p-4 bg-surface">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <h3 className="text-base font-semibold text-foreground flex items-center gap-2">
              <svg
                className="w-5 h-5 text-primary"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
                />
              </svg>
              {mode === 'person' ? t('personSectionTitle') : t('eventSectionTitle')}
            </h3>
            <p className="text-xs text-muted-foreground mt-1">
              {t('notConfiguredPrompt')}
            </p>
          </div>
          <Link
            href="/settings/immich"
            className="inline-flex items-center px-3 py-1.5 rounded-md text-xs font-medium bg-primary/10 text-primary hover:bg-primary/20 transition-colors self-start sm:self-auto"
          >
            {t('configureInSettings')} →
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="border border-border rounded-lg p-4 bg-surface space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
        <div>
          <h3 className="text-lg font-semibold text-foreground flex items-center gap-2">
            <svg
              className="w-5 h-5 text-primary"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
              />
            </svg>
            {mode === 'person' ? t('personSectionTitle') : t('eventSectionTitle')}
            {assets.length > 0 && (
              <span className="text-xs font-normal text-muted-foreground">
                ({assets.length})
              </span>
            )}
          </h3>
          <p className="text-xs text-muted-foreground">
            {mode === 'person'
              ? t('personSectionDescription')
              : t('eventSectionDescription')}
          </p>
        </div>

        <div className="flex items-center gap-2">
          {hasLinkedSource && publicUrl && (
            <a
              href={
                mode === 'person' && immichPersonId
                  ? `${publicUrl}/people/${immichPersonId}`
                  : `${publicUrl}/albums/${immichAlbumId}`
              }
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs text-primary hover:underline px-2 py-1"
            >
              {t('openInImmich')} ↗
            </a>
          )}
          <Button
            type="button"
            variant="secondary"
            size="sm"
            onClick={() =>
              isEditingLink ? setIsEditingLink(false) : openLinkEditor()
            }
          >
            {hasLinkedSource ? t('editLinkButton') : t('linkImmichButton')}
          </Button>
        </div>
      </div>

      {/* Toast message */}
      {avatarToast && (
        <div
          className={`p-2.5 rounded-md text-xs border ${
            avatarToast.type === 'success'
              ? 'bg-green-50 border-green-200 text-green-800 dark:bg-green-900/20 dark:border-green-800 dark:text-green-300'
              : 'bg-red-50 border-red-200 text-red-800 dark:bg-red-900/20 dark:border-red-800 dark:text-red-300'
          }`}
        >
          {avatarToast.text}
        </div>
      )}

      {/* Link Editor Drawer */}
      {isEditingLink && (
        <div className="p-4 rounded-lg bg-surface-elevated border border-border space-y-4">
          {isLoadingCatalog && (
            <div className="text-xs text-muted-foreground">
              {t('loadingCatalog')}
            </div>
          )}

          {mode === 'person' && (
            <div className="space-y-2">
              <label className="block text-xs font-semibold text-foreground">
                {t('faceClusterLabel')}
              </label>

              {immichPeople.length > 0 && (
                <div className="space-y-2">
                  <input
                    type="text"
                    placeholder={t('searchFaceClusterPlaceholder')}
                    value={personSearch}
                    onChange={(e) => setPersonSearch(e.target.value)}
                    className="w-full px-3 py-1.5 text-xs rounded-md border border-border bg-surface text-foreground"
                  />
                  <div className="flex items-center gap-2 overflow-x-auto py-1 max-h-28">
                    <button
                      type="button"
                      onClick={() => setDraftPersonId('')}
                      className={`flex-shrink-0 px-2.5 py-1.5 rounded-md border text-xs ${
                        !draftPersonId
                          ? 'border-primary bg-primary/10 text-primary font-semibold'
                          : 'border-border bg-surface text-muted-foreground'
                      }`}
                    >
                      {t('noneOption')}
                    </button>
                    {filteredClusters.slice(0, 30).map((cluster) => (
                      <button
                        key={cluster.id}
                        type="button"
                        onClick={() => setDraftPersonId(cluster.id)}
                        className={`flex items-center gap-2 flex-shrink-0 p-1.5 pr-2.5 rounded-lg border text-left transition-colors ${
                          draftPersonId === cluster.id
                            ? 'border-primary bg-primary/10 text-primary font-semibold'
                            : 'border-border bg-surface text-foreground hover:border-primary/50'
                        }`}
                      >
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={`/api/immich/people/${encodeURIComponent(cluster.id)}/thumbnail`}
                          alt={cluster.name || cluster.id}
                          className="w-8 h-8 rounded-full object-cover bg-muted"
                        />
                        <div className="text-xs truncate max-w-[120px]">
                          {cluster.name || t('unnamedFace')}
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              <input
                type="text"
                placeholder={t('manualPersonIdPlaceholder')}
                value={draftPersonId}
                onChange={(e) => setDraftPersonId(e.target.value)}
                className="w-full px-3 py-1.5 text-xs rounded-md border border-border bg-surface text-foreground font-mono"
              />
            </div>
          )}

          {/* Album Selector */}
          <div className="space-y-2">
            <label className="block text-xs font-semibold text-foreground">
              {t('albumLabel')}
            </label>
            {immichAlbums.length > 0 && (
              <select
                value={draftAlbumId}
                onChange={(e) => setDraftAlbumId(e.target.value)}
                className="w-full px-3 py-1.5 text-xs rounded-md border border-border bg-surface text-foreground"
              >
                <option value="">{t('selectAlbumPrompt')}</option>
                {immichAlbums.map((album) => (
                  <option key={album.id} value={album.id}>
                    {album.albumName} ({album.assetCount})
                  </option>
                ))}
              </select>
            )}
            <input
              type="text"
              placeholder={t('manualAlbumIdPlaceholder')}
              value={draftAlbumId}
              onChange={(e) => setDraftAlbumId(e.target.value)}
              className="w-full px-3 py-1.5 text-xs rounded-md border border-border bg-surface text-foreground font-mono"
            />
          </div>

          <div className="flex items-center justify-end gap-2 pt-2">
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={() => setIsEditingLink(false)}
            >
              {tCommon('cancel')}
            </Button>
            <Button
              type="button"
              variant="primary"
              size="sm"
              disabled={isSavingLink}
              onClick={handleSaveLinks}
            >
              {isSavingLink ? tCommon('saving') : tCommon('save')}
            </Button>
          </div>
        </div>
      )}

      {/* Gallery Content */}
      {!hasLinkedSource ? (
        <div className="text-xs text-muted-foreground py-4 text-center border border-dashed border-border rounded-lg">
          {mode === 'person' ? t('noPersonLinkYet') : t('noEventLinkYet')}
        </div>
      ) : isLoadingAssets ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
          {[1, 2, 3, 4].map((n) => (
            <div
              key={n}
              className="aspect-square rounded-lg bg-surface-elevated animate-pulse"
            />
          ))}
        </div>
      ) : assetsError ? (
        <div className="p-3 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-xs text-red-700 dark:text-red-300">
          {assetsError}
        </div>
      ) : assets.length === 0 ? (
        <div className="text-xs text-muted-foreground py-4 text-center">
          {t('noAssetsFound')}
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
          {assets.map((asset, index) => (
            <div
              key={asset.id}
              className="group relative aspect-square rounded-lg overflow-hidden border border-border bg-surface-elevated cursor-pointer"
              onClick={() => setActiveIndex(index)}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={`/api/immich/assets/${encodeURIComponent(asset.id)}/thumbnail`}
                alt={asset.originalFileName}
                loading="lazy"
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
              />

              {/* Badges overlay */}
              <div className="absolute top-1.5 left-1.5 flex items-center gap-1">
                {asset.type === 'VIDEO' && (
                  <span className="px-1.5 py-0.5 rounded bg-black/70 text-white text-[10px] font-medium">
                    🎥 {asset.duration || 'VIDEO'}
                  </span>
                )}
                {asset.exifInfo?.latitude !== null &&
                  asset.exifInfo?.latitude !== undefined && (
                    <span
                      className="px-1.5 py-0.5 rounded bg-black/70 text-white text-[10px]"
                      title={`${asset.exifInfo.latitude}, ${asset.exifInfo.longitude}`}
                    >
                      📍
                    </span>
                  )}
              </div>

              {/* Set as Avatar quick button on hover for person images */}
              {mode === 'person' && asset.type === 'IMAGE' && (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleSetAsAvatar(asset.id);
                  }}
                  disabled={settingAvatarId === asset.id}
                  className="opacity-0 group-hover:opacity-100 transition-opacity absolute bottom-1.5 right-1.5 px-2 py-1 rounded bg-black/75 hover:bg-primary text-white text-[10px] font-medium"
                  title={t('setAsAvatar')}
                >
                  {settingAvatarId === asset.id
                    ? '...'
                    : t('setAsAvatarShort')}
                </button>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Fullscreen Lightbox Modal */}
      {activeAsset && activeIndex !== null && (
        <div
          className="fixed inset-0 z-50 bg-black/90 flex flex-col justify-between p-4"
          onClick={() => setActiveIndex(null)}
        >
          {/* Top Bar */}
          <div
            className="flex items-center justify-between text-white max-w-6xl w-full mx-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="text-sm font-medium truncate">
              {activeAsset.originalFileName}{' '}
              <span className="text-xs text-gray-400 ml-2">
                ({activeIndex + 1} / {assets.length})
              </span>
            </div>
            <div className="flex items-center gap-2">
              {mode === 'person' && activeAsset.type === 'IMAGE' && (
                <button
                  type="button"
                  disabled={settingAvatarId === activeAsset.id}
                  onClick={() => handleSetAsAvatar(activeAsset.id)}
                  className="px-3 py-1.5 rounded-md bg-primary text-white text-xs font-medium hover:opacity-90 disabled:opacity-50"
                >
                  {settingAvatarId === activeAsset.id
                    ? tCommon('saving')
                    : t('setAsAvatar')}
                </button>
              )}
              <a
                href={`/api/immich/assets/${encodeURIComponent(activeAsset.id)}/original`}
                target="_blank"
                rel="noopener noreferrer"
                className="px-3 py-1.5 rounded-md bg-white/15 hover:bg-white/25 text-white text-xs font-medium"
              >
                {t('downloadOriginal')}
              </a>
              {publicUrl && (
                <a
                  href={`${publicUrl}/photos/${activeAsset.id}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-3 py-1.5 rounded-md bg-white/15 hover:bg-white/25 text-white text-xs font-medium"
                >
                  {t('openInImmich')} ↗
                </a>
              )}
              <button
                type="button"
                onClick={() => setActiveIndex(null)}
                className="p-1.5 rounded-md bg-white/10 hover:bg-white/20 text-white"
                aria-label="Close"
              >
                ✕
              </button>
            </div>
          </div>

          {/* Center Media Viewer */}
          <div
            className="relative flex-1 flex items-center justify-center my-4 overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            {activeIndex > 0 && (
              <button
                type="button"
                onClick={() => setActiveIndex(activeIndex - 1)}
                className="absolute left-2 z-10 p-3 rounded-full bg-black/60 hover:bg-black/80 text-white"
                aria-label="Previous"
              >
                ←
              </button>
            )}

            {activeAsset.type === 'VIDEO' ? (
              <video
                key={activeAsset.id}
                src={`/api/immich/assets/${encodeURIComponent(activeAsset.id)}/video`}
                controls
                autoPlay
                className="max-h-[75vh] max-w-full rounded-lg"
              />
            ) : (
              /* eslint-disable-next-line @next/next/no-img-element */
              <img
                key={activeAsset.id}
                src={`/api/immich/assets/${encodeURIComponent(activeAsset.id)}/preview`}
                alt={activeAsset.originalFileName}
                className="max-h-[75vh] max-w-full object-contain rounded-lg"
              />
            )}

            {activeIndex < assets.length - 1 && (
              <button
                type="button"
                onClick={() => setActiveIndex(activeIndex + 1)}
                className="absolute right-2 z-10 p-3 rounded-full bg-black/60 hover:bg-black/80 text-white"
                aria-label="Next"
              >
                →
              </button>
            )}
          </div>

          {/* Bottom EXIF Metadata Bar */}
          <div
            className="flex flex-wrap items-center justify-between gap-3 text-xs text-gray-300 max-w-6xl w-full mx-auto bg-white/10 backdrop-blur px-4 py-2.5 rounded-lg"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex flex-wrap items-center gap-4">
              {(activeAsset.exifInfo?.dateTimeOriginal ||
                activeAsset.fileCreatedAt) && (
                <span>
                  🕒{' '}
                  {new Date(
                    activeAsset.exifInfo?.dateTimeOriginal ||
                      activeAsset.fileCreatedAt!
                  ).toLocaleString()}
                </span>
              )}
              {(activeAsset.exifInfo?.city ||
                activeAsset.exifInfo?.country) && (
                <span>
                  🏙️{' '}
                  {[
                    activeAsset.exifInfo.city,
                    activeAsset.exifInfo.state,
                    activeAsset.exifInfo.country,
                  ]
                    .filter(Boolean)
                    .join(', ')}
                </span>
              )}
              {activeAsset.exifInfo?.latitude !== null &&
                activeAsset.exifInfo?.latitude !== undefined &&
                activeAsset.exifInfo?.longitude !== null &&
                activeAsset.exifInfo?.longitude !== undefined && (
                  <span className="font-mono">
                    📍 {activeAsset.exifInfo.latitude.toFixed(5)},{' '}
                    {activeAsset.exifInfo.longitude.toFixed(5)}
                  </span>
                )}
              {(activeAsset.exifInfo?.make || activeAsset.exifInfo?.model) && (
                <span>
                  📷{' '}
                  {[activeAsset.exifInfo.make, activeAsset.exifInfo.model]
                    .filter(Boolean)
                    .join(' ')}
                </span>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

