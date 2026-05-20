import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';

interface SEOHeadProps {
  title?: string;
  description?: string;
  keywords?: string;
  image?: string;
  /** Absolute URL. If omitted, derived from current pathname. */
  url?: string;
  /** Path override when a parent doesn't have a router context. */
  path?: string;
  type?: string;
  /** Optional JSON-LD structured data (object or array of objects). Injected into <head>. */
  jsonLd?: Record<string, unknown> | Record<string, unknown>[];
  /** Stable id for the JSON-LD <script> tag so it can be replaced on re-render. */
  jsonLdId?: string;
}

const SITE_ORIGIN = 'https://universflow.in';

const DEFAULT_IMAGE =
  'https://storage.googleapis.com/gpt-engineer-file-uploads/d6CK1hptEYS0iYCrQMmYcx7HukD2/social-images/social-1768315544947-Screenshot 2026-01-13 201134.png';

const SEOHead = ({
  title = 'Univers Flow — Free Music Streaming & Downloads',
  description = 'Stream and download unlimited music for free with Univers Flow. Discover millions of songs, build playlists, and listen offline.',
  keywords = 'free music streaming, music download, offline music, music app, Univers Flow, listen music free, music player, playlist creator',
  image = DEFAULT_IMAGE,
  url,
  path,
  type = 'website',
}: SEOHeadProps) => {
  const location = useLocation();
  const resolvedPath = path ?? location.pathname ?? '/';
  const resolvedUrl = url ?? `${SITE_ORIGIN}${resolvedPath}`;

  useEffect(() => {
    document.title = title;

    const updateMeta = (name: string, content: string, isProperty = false) => {
      const attr = isProperty ? 'property' : 'name';
      let meta = document.querySelector(`meta[${attr}="${name}"]`) as HTMLMetaElement | null;
      if (!meta) {
        meta = document.createElement('meta');
        meta.setAttribute(attr, name);
        document.head.appendChild(meta);
      }
      meta.content = content;
    };

    updateMeta('description', description);
    updateMeta('keywords', keywords);
    updateMeta('author', 'Universflow Team');
    updateMeta('robots', 'index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1');
    updateMeta('googlebot', 'index, follow');

    updateMeta('og:title', title, true);
    updateMeta('og:description', description, true);
    updateMeta('og:image', image, true);
    updateMeta('og:url', resolvedUrl, true);
    updateMeta('og:type', type, true);
    updateMeta('og:site_name', 'Univers Flow', true);
    updateMeta('og:locale', 'en_US', true);

    updateMeta('twitter:card', 'summary_large_image');
    updateMeta('twitter:title', title);
    updateMeta('twitter:description', description);
    updateMeta('twitter:image', image);
    updateMeta('twitter:url', resolvedUrl);
    updateMeta('twitter:creator', '@UniversFlow');

    updateMeta('application-name', 'Univers Flow');
    updateMeta('apple-mobile-web-app-title', 'Univers Flow');
    updateMeta('mobile-web-app-capable', 'yes');
    updateMeta('apple-mobile-web-app-capable', 'yes');

    let canonical = document.querySelector('link[rel="canonical"]') as HTMLLinkElement | null;
    if (!canonical) {
      canonical = document.createElement('link');
      canonical.rel = 'canonical';
      document.head.appendChild(canonical);
    }
    canonical.href = resolvedUrl;
  }, [title, description, keywords, image, resolvedUrl, type]);

  return null;
};

export default SEOHead;
