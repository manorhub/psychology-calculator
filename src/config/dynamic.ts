import type { DynamicSiteConfig } from '@/types/config';

/**
 * Default Dynamic Business Configuration
 * These values serve as initial defaults and can be updated at runtime via the Admin Panel & D1 database.
 */
export const DEFAULT_DYNAMIC_CONFIG: DynamicSiteConfig = {
  siteName: 'Psychology Calculator',
  siteTagline: 'Psychometrics & Self-Discovery',
  siteDescription: 'Explore comprehensive personality, emotional intelligence, and relationship assessments designed with psychological rigor.',
  primaryCtaText: 'Explore Assessments',
  primaryCtaLink: '/assessments',
  disclaimerText: 'PsychologyCalculator.com self-assessments are provided for educational and self-exploration purposes only. They are not intended as diagnostic tools or clinical psychological evaluations.',
  contactEmail: 'support@psychologycalculator.com',
  headerNavigation: [
    { label: 'Assessments', href: '/assessments' },
    { label: 'How It Works', href: '/#how-it-works' },
    { label: 'Credits & Pricing', href: '/pricing' },
    { label: 'About', href: '/about' },
    { label: 'Contact', href: '/contact' }
  ],
  footerSections: [
    {
      title: 'Assessments',
      links: [
        { label: 'All Assessments', href: '/assessments' },
        { label: 'Personality Tests', href: '/assessments/category/personality' },
        { label: 'Relationship Tests', href: '/assessments/category/relationships' },
        { label: 'Emotional Intelligence', href: '/assessments/category/emotional-intelligence' },
        { label: 'Credits & Pricing', href: '/pricing' }
      ]
    },
    {
      title: 'Company',
      links: [
        { label: 'About Us', href: '/about' },
        { label: 'How It Works', href: '/#how-it-works' },
        { label: 'Contact Us', href: '/contact' }
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
    enablePayments: false, // Disabled until Phase 3
    enableSocialShare: true,
    enableGuestAssessments: true,
    maintenanceMode: false
  }
};
