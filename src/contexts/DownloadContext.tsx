import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { Song } from './PlayerContext';

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

interface DownloadContextType {
  downloads: DownloadedSong[];
  downloadProgress: Record<string, DownloadProgress>;
  downloadSong: (song: Song) => Promise<void>;
  removeSong: (songId: string) => void;
  isDownloaded: (songId: string) => boolean;
  getDownloadedUrl: (songId: string) => string | null;
  totalStorageUsed: number;
  clearAllDownloads: () => void;
  isIndexedDBSupported: boolean;
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

const saveToDB = async (song: DownloadedSong, audioBlob: Blob): Promise<void> => {
  try {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(STORE_NAME, 'readwrite');
      const store = transaction.objectStore(STORE_NAME);
      
      const songData = {
        ...song,
        audioBlob,
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

const getFromDB = async (id: string): Promise<{ song: DownloadedSong; audioBlob: Blob } | null> => {
  try {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(STORE_NAME, 'readonly');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.get(id);
      
      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        if (request.result) {
          const { audioBlob, ...song } = request.result;
          resolve({ song, audioBlob });
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

const getAllFromDB = async (): Promise<{ song: DownloadedSong; audioBlob: Blob }[]> => {
  try {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(STORE_NAME, 'readonly');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.getAll();
      
      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        const results = request.result.map((item: any) => {
          const { audioBlob, ...song } = item;
          return { song, audioBlob };
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
        
        for (const { song, audioBlob } of storedSongs) {
          try {
            const blobUrl = URL.createObjectURL(audioBlob);
            urls[song.id] = blobUrl;
            songs.push({ ...song, blobUrl });
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
    if (!isIndexedDBSupported) {
      console.warn('Downloads not available - IndexedDB not supported');
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

    try {
      // Start download
      setDownloadProgress(prev => ({
        ...prev,
        [song.id]: { songId: song.id, progress: 5, status: 'downloading' }
      }));

      const response = await fetch(song.audio_url, {
        mode: 'cors',
        credentials: 'omit',
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

      const downloadedSong: DownloadedSong = {
        ...song,
        downloadedAt: new Date().toISOString(),
        blobUrl,
        size: blob.size,
      };

      // Save to IndexedDB
      await saveToDB(downloadedSong, blob);

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

    } catch (error) {
      console.error('Download failed:', error);
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
      }, 3000);
    }
  }, [downloads, isIndexedDBSupported]);

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

  return (
    <DownloadContext.Provider value={{
      downloads,
      downloadProgress,
      downloadSong,
      removeSong,
      isDownloaded,
      getDownloadedUrl,
      totalStorageUsed,
      clearAllDownloads,
      isIndexedDBSupported,
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
