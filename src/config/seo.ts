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
  titleTemplate: '%s | MindMetrics',
  defaultTitle: 'MindMetrics — Evidence-Based Psychological Assessments',
  defaultDescription: 'Discover deep self-insights with validated personality, emotional intelligence, and cognitive style assessments.',
  openGraph: {
    type: 'website',
    siteName: 'MindMetrics',
    images: [
      {
        url: '/og-image.png',
        width: 1200,
        height: 630,
        alt: 'MindMetrics Psychology Assessment Platform'
      }
    ]
  },
  twitter: {
    card: 'summary_large_image'
  }
};
