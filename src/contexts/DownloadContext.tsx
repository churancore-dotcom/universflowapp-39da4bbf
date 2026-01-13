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
}

const DownloadContext = createContext<DownloadContextType | undefined>(undefined);

const DB_NAME = 'MusicAppOffline';
const STORE_NAME = 'songs';

// IndexedDB helper functions
const openDB = (): Promise<IDBDatabase> => {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, 1);
    
    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);
    
    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: 'id' });
      }
    };
  });
};

const saveToDB = async (song: DownloadedSong, audioBlob: Blob): Promise<void> => {
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
};

const getFromDB = async (id: string): Promise<{ song: DownloadedSong; audioBlob: Blob } | null> => {
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
};

const deleteFromDB = async (id: string): Promise<void> => {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, 'readwrite');
    const store = transaction.objectStore(STORE_NAME);
    const request = store.delete(id);
    
    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve();
  });
};

const getAllFromDB = async (): Promise<{ song: DownloadedSong; audioBlob: Blob }[]> => {
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
};

const clearDB = async (): Promise<void> => {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, 'readwrite');
    const store = transaction.objectStore(STORE_NAME);
    const request = store.clear();
    
    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve();
  });
};

export const DownloadProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [downloads, setDownloads] = useState<DownloadedSong[]>([]);
  const [downloadProgress, setDownloadProgress] = useState<Record<string, DownloadProgress>>({});
  const [blobUrls, setBlobUrls] = useState<Record<string, string>>({});

  // Load downloads from IndexedDB on mount
  useEffect(() => {
    const loadDownloads = async () => {
      try {
        const storedSongs = await getAllFromDB();
        const songs: DownloadedSong[] = [];
        const urls: Record<string, string> = {};
        
        for (const { song, audioBlob } of storedSongs) {
          const blobUrl = URL.createObjectURL(audioBlob);
          urls[song.id] = blobUrl;
          songs.push({ ...song, blobUrl });
        }
        
        setDownloads(songs);
        setBlobUrls(urls);
      } catch (error) {
        console.error('Failed to load downloads:', error);
      }
    };
    
    loadDownloads();
    
    // Cleanup blob URLs on unmount
    return () => {
      Object.values(blobUrls).forEach(url => URL.revokeObjectURL(url));
    };
  }, []);

  const downloadSong = useCallback(async (song: Song) => {
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

      const response = await fetch(song.audio_url);
      
      if (!response.ok) {
        throw new Error('Failed to download');
      }

      const contentLength = response.headers.get('content-length');
      const total = contentLength ? parseInt(contentLength, 10) : 0;
      
      const reader = response.body?.getReader();
      if (!reader) throw new Error('No reader available');

      const chunks: BlobPart[] = [];
      let received = 0;

      while (true) {
        const { done, value } = await reader.read();
        
        if (done) break;
        
        // Convert to regular ArrayBuffer to satisfy BlobPart type
        chunks.push(value.slice().buffer);
        received += value.length;
        
        const progress = total > 0 ? Math.round((received / total) * 100) : 50;
        
        setDownloadProgress(prev => ({
          ...prev,
          [song.id]: { songId: song.id, progress: Math.min(progress, 95), status: 'downloading' }
        }));
      }

      // Create blob
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
  }, [downloads]);

  const removeSong = useCallback(async (songId: string) => {
    try {
      await deleteFromDB(songId);
      
      // Revoke blob URL
      if (blobUrls[songId]) {
        URL.revokeObjectURL(blobUrls[songId]);
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
      Object.values(blobUrls).forEach(url => URL.revokeObjectURL(url));
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
