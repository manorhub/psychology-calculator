import type { DynamicSiteConfig } from '@/types/config';

/**
 * Default Dynamic Business Configuration for PsychologyCalculator.com
 */
export const DEFAULT_DYNAMIC_CONFIG: DynamicSiteConfig = {
  siteName: 'Psychology Calculator',
  siteTagline: 'Scientifically validated self-assessments for clarity, psychometrics, and self-discovery.',
  siteDescription: 'Explore comprehensive personality, emotional intelligence, cognitive, and relationship assessments designed with psychological rigor.',
  primaryCtaText: 'Take Free Test',
  primaryCtaLink: '/assessments',
  disclaimerText: 'PsychologyCalculator.com self-assessments are provided for educational and self-exploration purposes only. They are not intended as diagnostic tools or clinical psychological evaluations.',
  contactEmail: 'support@psychologycalculator.com',
  headerNavigation: [
    { label: 'Assessments', href: '/assessments' },
    { label: 'Categories', href: '/#categories' },
    { label: 'About', href: '/about' },
    { label: 'Pricing', href: '/pricing' }
  ],
  footerSections: [
    {
      title: 'Psychology Assessments',
      links: [
        { label: 'All 10+ Tests', href: '/assessments' },
        { label: 'Big Five OCEAN', href: '/assessments/big-five-personality-test' },
        { label: 'Emotional Intelligence', href: '/assessments/emotional-intelligence-eq-assessment' },
        { label: 'Attachment Style', href: '/assessments/attachment-style-relationship-quiz' }
      ]
    },
    {
      title: 'Platform',
      links: [
        { label: 'About & Methodology', href: '/about' },
        { label: 'Credit Packages', href: '/pricing' },
        { label: 'Contact Us', href: 'mailto:support@psychologycalculator.com' }
      ]
    },
    {
      title: 'Legal & Ethics',
      links: [
        { label: 'Privacy Policy', href: '/privacy-policy' },
        { label: 'Terms of Service', href: '/terms-of-service' },
        { label: 'Psychological Disclaimer', href: '/disclaimer' }
      ]
    }
  ],
  features: {
    enableAiReports: true,
    enableUserAccounts: true,
    enablePayments: true,
    enableSocialShare: true,
    enableGuestAssessments: true,
    maintenanceMode: false
  }
};
