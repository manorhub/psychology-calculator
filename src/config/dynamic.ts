import type { DynamicSiteConfig } from '@/types/config';

/**
 * Default Dynamic Business Configuration
 * These values serve as initial defaults and can be updated at runtime via the Admin Panel & D1 database.
 */
export const DEFAULT_DYNAMIC_CONFIG: DynamicSiteConfig = {
  siteName: 'MindMetrics',
  siteTagline: 'Scientifically grounded self-assessments for clarity, growth, and self-discovery.',
  siteDescription: 'Explore comprehensive personality, emotional intelligence, and relationship assessments designed with psychological rigor.',
  primaryCtaText: 'Explore Assessments',
  primaryCtaLink: '#assessments',
  disclaimerText: 'MindMetrics self-assessments are provided for educational and self-exploration purposes only. They are not intended as diagnostic tools or clinical psychological evaluations.',
  contactEmail: 'support@mindmetrics.io',
  headerNavigation: [
    { label: 'Assessments', href: '/#assessments' },
    { label: 'How It Works', href: '/#how-it-works' },
    { label: 'About', href: '/#about' },
    { label: 'Admin', href: '/admin' }
  ],
  footerSections: [
    {
      title: 'Platform',
      links: [
        { label: 'All Assessments', href: '/#assessments' },
        { label: 'Methodology', href: '/#methodology' },
        { label: 'Pricing', href: '/#pricing' }
      ]
    },
    {
      title: 'Company',
      links: [
        { label: 'About Us', href: '/#about' },
        { label: 'Contact', href: 'mailto:support@mindmetrics.io' }
      ]
    },
    {
      title: 'Legal & Ethics',
      links: [
        { label: 'Privacy Policy', href: '/privacy' },
        { label: 'Terms of Service', href: '/terms' },
        { label: 'Psychological Disclaimer', href: '/disclaimer' }
      ]
    }
  ],
  features: {
    enableAiReports: true,
    enableUserAccounts: true,
    enablePayments: false, // Disabled until Phase 3
    enableSocialShare: true,
    enableGuestAssessments: true,
    maintenanceMode: false
  }
};
