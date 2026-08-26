export interface NavigationItem {
  label: string;
  href: string;
  badge?: string;
  isExternal?: boolean;
  requiresAuth?: boolean;
  children?: NavigationItem[];
}

export interface FooterSection {
  title: string;
  links: {
    label: string;
    href: string;
    isExternal?: boolean;
  }[];
}

export interface FeatureFlags {
  enableAiReports: boolean;
  enableUserAccounts: boolean;
  enablePayments: boolean;
  enableSocialShare: boolean;
  enableGuestAssessments: boolean;
  maintenanceMode: boolean;
}

export interface DynamicSiteConfig {
  siteName: string;
  siteTagline: string;
  siteDescription: string;
  logoUrl?: string;
  primaryCtaText: string;
  primaryCtaLink: string;
  disclaimerText: string;
  contactEmail: string;
  headerNavigation: NavigationItem[];
  footerSections: FooterSection[];
  features: FeatureFlags;
}
