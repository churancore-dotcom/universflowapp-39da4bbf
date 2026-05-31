import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { Song } from './PlayerContext';
import { toast } from 'sonner';
import { canDownloadSong, getDownloadUnavailableMessage } from '@/lib/songSupport';

// Build a proxy URL for cross-origin streams that fail direct fetch.
// Uses the same music-indexer audio proxy that the player uses.
const buildDownloadProxyUrl = (sourceUrl: string): string | null => {
  try {
    if (!sourceUrl?.startsWith('http')) return null;
    const projectUrl = import.meta.env.VITE_SUPABASE_URL;
    if (!projectUrl) return null;
    if (sourceUrl.includes('/functions/v1/music-indexer?audio=')) return null;
    const parsed = new URL(sourceUrl);
    if (parsed.origin === window.location.origin) return null;
    return `${projectUrl}/functions/v1/music-indexer?audio=${encodeURIComponent(sourceUrl)}`;
  } catch { return null; }
};

// Try direct fetch first, fall back to proxy on CORS / network failure so
// every track with an audio URL can actually be downloaded.
const robustFetch = async (url: string, init?: RequestInit): Promise<Response> => {
  try {
    const direct = await fetch(url, init);
    if (direct.ok) return direct;
    throw new Error(`HTTP ${direct.status}`);
  } catch (directErr) {
    const proxyUrl = buildDownloadProxyUrl(url);
    if (!proxyUrl) throw directErr;
    const proxied = await fetch(proxyUrl, { ...init, mode: 'cors', credentials: 'omit' });
    if (!proxied.ok) throw new Error(`Proxy HTTP ${proxied.status}`);
    return proxied;
  }
};

interface DownloadedSong extends Song {
  downloadedAt: string;
  blobUrl: string;
  size: number;
}

interface DownloadProgress {
  songId: string;
  progress: number;
  status: 'pending' | 'downloading' | 'completed' | 'error';
}

export interface QueuedSong extends Song {
  queuedAt: string;
  position: number;
}

interface DownloadContextType {
  downloads: DownloadedSong[];
  downloadProgress: Record<string, DownloadProgress>;
  downloadQueue: QueuedSong[];
  currentDownloadId: string | null;
  downloadSong: (song: Song) => Promise<void>;
  cancelDownload: (songId: string) => void;
  addToQueue: (songs: Song[]) => void;
  removeFromQueue: (songId: string) => void;
  clearQueue: () => void;
  removeSong: (songId: string) => void;
  isDownloaded: (songId: string) => boolean;
  isInQueue: (songId: string) => boolean;
  getDownloadedUrl: (songId: string) => string | null;
  totalStorageUsed: number;
  clearAllDownloads: () => void;
  isIndexedDBSupported: boolean;
  isProcessingQueue: boolean;
}

const DownloadContext = createContext<DownloadContextType | undefined>(undefined);

const DB_NAME = 'MusicAppOffline';
const STORE_NAME = 'songs';

// Check if IndexedDB is supported (not available in some WebViews)
const checkIndexedDBSupport = (): boolean => {
  try {
    if (typeof indexedDB === 'undefined') return false;
    // Test if we can actually use it
    const testRequest = indexedDB.open('test_db_support', 1);
    testRequest.onerror = () => {};
    testRequest.onsuccess = () => {
      testRequest.result.close();
      indexedDB.deleteDatabase('test_db_support');
    };
    return true;
  } catch {
    return false;
  }
};

// IndexedDB helper functions with error handling
const openDB = (): Promise<IDBDatabase> => {
  return new Promise((resolve, reject) => {
    try {
      if (typeof indexedDB === 'undefined') {
        reject(new Error('IndexedDB not supported'));
        return;
      }
      
      const request = indexedDB.open(DB_NAME, 1);
      
      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve(request.result);
      
      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;
        if (!db.objectStoreNames.contains(STORE_NAME)) {
          db.createObjectStore(STORE_NAME, { keyPath: 'id' });
        }
      };
    } catch (error) {
      reject(error);
    }
  });
};

const saveToDB = async (song: DownloadedSong, audioBlob: Blob, coverBlob?: Blob | null): Promise<void> => {
  try {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(STORE_NAME, 'readwrite');
      const store = transaction.objectStore(STORE_NAME);
      
      const songData = {
        ...song,
        audioBlob,
        coverBlob: coverBlob ?? null,
      };
      
      const request = store.put(songData);
      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve();
    });
  } catch (error) {
    console.warn('Failed to save to IndexedDB:', error);
    throw error;
  }
};

const getFromDB = async (id: string): Promise<{ song: DownloadedSong; audioBlob: Blob; coverBlob?: Blob | null } | null> => {
  try {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(STORE_NAME, 'readonly');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.get(id);
      
      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        if (request.result) {
          const { audioBlob, coverBlob, ...song } = request.result;
          resolve({ song, audioBlob, coverBlob });
        } else {
          resolve(null);
        }
      };
    });
  } catch (error) {
    console.warn('Failed to get from IndexedDB:', error);
    return null;
  }
};

const deleteFromDB = async (id: string): Promise<void> => {
  try {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(STORE_NAME, 'readwrite');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.delete(id);
      
      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve();
    });
  } catch (error) {
    console.warn('Failed to delete from IndexedDB:', error);
  }
};

const getAllFromDB = async (): Promise<{ song: DownloadedSong; audioBlob: Blob; coverBlob?: Blob | null }[]> => {
  try {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(STORE_NAME, 'readonly');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.getAll();
      
      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        const results = request.result.map((item: any) => {
          const { audioBlob, coverBlob, ...song } = item;
          return { song, audioBlob, coverBlob };
        });
        resolve(results);
      };
    });
  } catch (error) {
    console.warn('Failed to get all from IndexedDB:', error);
    return [];
  }
};

const clearDB = async (): Promise<void> => {
  try {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(STORE_NAME, 'readwrite');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.clear();
      
      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve();
    });
  } catch (error) {
    console.warn('Failed to clear IndexedDB:', error);
  }
};

export const DownloadProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [downloads, setDownloads] = useState<DownloadedSong[]>([]);
  const [downloadProgress, setDownloadProgress] = useState<Record<string, DownloadProgress>>({});
  const [blobUrls, setBlobUrls] = useState<Record<string, string>>({});
  const [isIndexedDBSupported, setIsIndexedDBSupported] = useState(true);
  const [downloadQueue, setDownloadQueue] = useState<QueuedSong[]>([]);
  const [isProcessingQueue, setIsProcessingQueue] = useState(false);
  const [currentDownloadId, setCurrentDownloadId] = useState<string | null>(null);
  const processingRef = useRef(false);
  const abortRef = useRef<AbortController | null>(null);
  const cancelledIdsRef = useRef<Set<string>>(new Set());

  // Load downloads from IndexedDB on mount
  useEffect(() => {
    const loadDownloads = async () => {
      // Check IndexedDB support first
      const supported = checkIndexedDBSupport();
      setIsIndexedDBSupported(supported);
      
      if (!supported) {
        console.warn('IndexedDB not supported in this environment');
        return;
      }

      try {
        const storedSongs = await getAllFromDB();
        const songs: DownloadedSong[] = [];
        const urls: Record<string, string> = {};
        
        for (const { song, audioBlob, coverBlob } of storedSongs) {
          try {
            const blobUrl = URL.createObjectURL(audioBlob);
            const coverBlobUrl = coverBlob ? URL.createObjectURL(coverBlob) : null;
            urls[song.id] = blobUrl;
            songs.push({ ...song, blobUrl, cover_url: coverBlobUrl || song.cover_url });
          } catch (e) {
            console.warn('Failed to create blob URL for song:', song.id);
          }
        }
        
        setDownloads(songs);
        setBlobUrls(urls);
      } catch (error) {
        console.warn('Failed to load downloads:', error);
      }
    };
    
    loadDownloads();
    
    // Cleanup blob URLs on unmount
    return () => {
      Object.values(blobUrls).forEach(url => {
        try {
          URL.revokeObjectURL(url);
        } catch (e) {
          // Ignore errors during cleanup
        }
      });
    };
  }, []);

  const downloadSong = useCallback(async (song: Song) => {
    if (!canDownloadSong(song)) {
      toast.error(getDownloadUnavailableMessage(song));
      return;
    }

    if (!isIndexedDBSupported) {
      console.warn('Downloads not available - IndexedDB not supported');
      toast.error('Downloads are not available on this device');
      return;
    }

    // Check if already downloaded
    if (downloads.some(d => d.id === song.id)) {
      return;
    }

    // Initialize progress
    setDownloadProgress(prev => ({
      ...prev,
      [song.id]: { songId: song.id, progress: 0, status: 'pending' }
    }));
    setCurrentDownloadId(song.id);
    cancelledIdsRef.current.delete(song.id);
    const controller = new AbortController();
    abortRef.current = controller;

    try {
      // Start download
      setDownloadProgress(prev => ({
        ...prev,
        [song.id]: { songId: song.id, progress: 5, status: 'downloading' }
      }));

      const response = await robustFetch(song.audio_url, {
        mode: 'cors',
        credentials: 'omit',
        signal: controller.signal,
      });
      
      if (!response.ok) {
        throw new Error('Failed to download');
      }

      const contentLength = response.headers.get('content-length');
      const total = contentLength ? parseInt(contentLength, 10) : 0;
      
      const reader = response.body?.getReader();
      if (!reader) throw new Error('No reader available');

      const chunks: ArrayBuffer[] = [];
      let received = 0;

      while (true) {
        if (controller.signal.aborted) {
          try { reader.cancel(); } catch {}
          throw new DOMException('Aborted', 'AbortError');
        }
        const { done, value } = await reader.read();

        if (done) break;

        // Copy to regular ArrayBuffer for blob compatibility
        chunks.push(value.buffer.slice(0) as ArrayBuffer);
        received += value.length;

        const progress = total > 0 ? Math.round((received / total) * 100) : 50;

        setDownloadProgress(prev => ({
          ...prev,
          [song.id]: { songId: song.id, progress: Math.min(progress, 95), status: 'downloading' }
        }));
      }

      // Create blob from chunks
      const blob = new Blob(chunks, { type: 'audio/mpeg' });
      const blobUrl = URL.createObjectURL(blob);
      let coverBlob: Blob | null = null;
      let offlineCoverUrl = song.cover_url;

      if (song.cover_url && /^https?:\/\//i.test(song.cover_url)) {
        try {
          const coverResponse = await robustFetch(song.cover_url, { mode: 'cors', credentials: 'omit' });
          if (coverResponse.ok) {
            coverBlob = await coverResponse.blob();
            offlineCoverUrl = URL.createObjectURL(coverBlob);
          }
        } catch {
          // Cover caching is best effort; audio download must still succeed.
        }
      }

      const downloadedSong: DownloadedSong = {
        ...song,
        cover_url: offlineCoverUrl,
        downloadedAt: new Date().toISOString(),
        blobUrl,
        size: blob.size,
      };

      // Save to IndexedDB
      await saveToDB({ ...downloadedSong, cover_url: song.cover_url }, blob, coverBlob);

      // Update state
      setDownloads(prev => [...prev, downloadedSong]);
      setBlobUrls(prev => ({ ...prev, [song.id]: blobUrl }));
      
      setDownloadProgress(prev => ({
        ...prev,
        [song.id]: { songId: song.id, progress: 100, status: 'completed' }
      }));

      // Remove from progress after animation
      setTimeout(() => {
        setDownloadProgress(prev => {
          const newProgress = { ...prev };
          delete newProgress[song.id];
          return newProgress;
        });
      }, 2000);

    } catch (error: any) {
      const wasCancelled = error?.name === 'AbortError' || cancelledIdsRef.current.has(song.id);
      if (wasCancelled) {
        toast.info('Download cancelled');
      } else {
        console.error('Download failed:', error);
        toast.error(getDownloadUnavailableMessage(song));
      }
      setDownloadProgress(prev => ({
        ...prev,
        [song.id]: { songId: song.id, progress: 0, status: 'error' }
      }));

      setTimeout(() => {
        setDownloadProgress(prev => {
          const newProgress = { ...prev };
          delete newProgress[song.id];
          return newProgress;
        });
      }, wasCancelled ? 400 : 3000);
    } finally {
      cancelledIdsRef.current.delete(song.id);
      if (abortRef.current === controller) abortRef.current = null;
      setCurrentDownloadId(prev => (prev === song.id ? null : prev));
    }
  }, [downloads, isIndexedDBSupported]);

  const cancelDownload = useCallback((songId: string) => {
    // If song is in queue but not yet downloading, just drop it
    setDownloadQueue(prev => prev.filter(q => q.id !== songId));
    if (currentDownloadId === songId && abortRef.current) {
      cancelledIdsRef.current.add(songId);
      try { abortRef.current.abort(); } catch {}
    }
  }, [currentDownloadId]);

  const removeSong = useCallback(async (songId: string) => {
    try {
      await deleteFromDB(songId);
      
      // Revoke blob URL
      if (blobUrls[songId]) {
        try {
          URL.revokeObjectURL(blobUrls[songId]);
        } catch (e) {
          // Ignore errors
        }
      }
      
      setDownloads(prev => prev.filter(d => d.id !== songId));
      setBlobUrls(prev => {
        const newUrls = { ...prev };
        delete newUrls[songId];
        return newUrls;
      });
    } catch (error) {
      console.error('Failed to remove song:', error);
    }
  }, [blobUrls]);

  const isDownloaded = useCallback((songId: string) => {
    return downloads.some(d => d.id === songId);
  }, [downloads]);

  const isInQueue = useCallback((songId: string) => {
    return downloadQueue.some(q => q.id === songId);
  }, [downloadQueue]);

  const getDownloadedUrl = useCallback((songId: string) => {
    return blobUrls[songId] || null;
  }, [blobUrls]);

  const totalStorageUsed = downloads.reduce((acc, song) => acc + song.size, 0);

  const clearAllDownloads = useCallback(async () => {
    try {
      await clearDB();
      Object.values(blobUrls).forEach(url => {
        try {
          URL.revokeObjectURL(url);
        } catch (e) {
          // Ignore errors
        }
      });
      setDownloads([]);
      setBlobUrls({});
    } catch (error) {
      console.error('Failed to clear downloads:', error);
    }
  }, [blobUrls]);

  // Queue management functions
  const addToQueue = useCallback((songs: Song[]) => {
    const newQueueItems: QueuedSong[] = songs
      .filter(song => !isDownloaded(song.id) && !isInQueue(song.id))
      .map((song, index) => ({
        ...song,
        queuedAt: new Date().toISOString(),
        position: downloadQueue.length + index,
      }));
    
    if (newQueueItems.length > 0) {
      setDownloadQueue(prev => [...prev, ...newQueueItems]);
    }
  }, [downloadQueue.length, isDownloaded, isInQueue]);

  const removeFromQueue = useCallback((songId: string) => {
    setDownloadQueue(prev => prev.filter(q => q.id !== songId));
  }, []);

  const clearQueue = useCallback(() => {
    setDownloadQueue([]);
  }, []);

  // Process queue automatically
  useEffect(() => {
    const processQueue = async () => {
      if (processingRef.current || downloadQueue.length === 0) return;
      
      processingRef.current = true;
      setIsProcessingQueue(true);
      
      const nextSong = downloadQueue[0];
      if (nextSong && !isDownloaded(nextSong.id)) {
        await downloadSong(nextSong);
      }
      
      // Remove from queue after download attempt
      setDownloadQueue(prev => prev.slice(1));
      
      processingRef.current = false;
      setIsProcessingQueue(false);
    };
    
    processQueue();
  }, [downloadQueue, downloadSong, isDownloaded]);

  return (
    <DownloadContext.Provider value={{
      downloads,
      downloadProgress,
      downloadQueue,
      currentDownloadId,
      downloadSong,
      cancelDownload,
      addToQueue,
      removeFromQueue,
      clearQueue,
      removeSong,
      isDownloaded,
      isInQueue,
      getDownloadedUrl,
      totalStorageUsed,
      clearAllDownloads,
      isIndexedDBSupported,
      isProcessingQueue,
    }}>
      {children}
    </DownloadContext.Provider>
  );
};

export const useDownloads = () => {
  const context = useContext(DownloadContext);
  if (context === undefined) {
    throw new Error('useDownloads must be used within a DownloadProvider');
  }
  return context;
};
