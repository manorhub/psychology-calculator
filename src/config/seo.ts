export interface DefaultSeoConfig {
  titleTemplate: string;
  defaultTitle: string;
  defaultDescription: string;
  openGraph: {
    type: 'website' | 'article';
    siteName: string;
    images: {
      url: string;
      width: number;
      height: number;
      alt: string;
    }[];
  };
  twitter: {
    card: 'summary' | 'summary_large_image';
    creator?: string;
  };
}

export const DEFAULT_SEO: DefaultSeoConfig = {
  titleTemplate: '%s | Psychology Calculator',
  defaultTitle: 'Psychology Calculator — Psychometrics & Self-Discovery',
  defaultDescription: 'Discover deep self-insights with validated personality, emotional intelligence, and cognitive style assessments.',
  openGraph: {
    type: 'website',
    siteName: 'Psychology Calculator',
    images: [
      {
        url: '/og-image.png',
        width: 1200,
        height: 630,
        alt: 'Psychology Calculator — Psychometrics & Self-Discovery'
      }
    ]
  },
  twitter: {
    card: 'summary_large_image'
  }
};
