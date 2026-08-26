export interface AdminNavSection {
  title: string;
  items: {
    id: string;
    label: string;
    href: string;
    icon: string;
    description: string;
    phase: string;
  }[];
}

export const ADMIN_NAVIGATION: AdminNavSection[] = [
  {
    title: 'Core Operations',
    items: [
      {
        id: 'dashboard',
        label: 'Dashboard',
        href: '/admin',
        icon: 'LayoutDashboard',
        description: 'System overview, key metrics, and quick actions',
        phase: 'Phase 0'
      },
      {
        id: 'assessments',
        label: 'Assessments',
        href: '/admin/assessments',
        icon: 'ClipboardList',
        description: 'Manage psychology assessment catalog and parameters',
        phase: 'Phase 1'
      },
      {
        id: 'questions',
        label: 'Questions & Options',
        href: '/admin/questions',
        icon: 'HelpCircle',
        description: 'Create and organize test items and response scales',
        phase: 'Phase 1'
      },
      {
        id: 'results',
        label: 'Scoring & Results',
        href: '/admin/results',
        icon: 'Award',
        description: 'Scoring rules, dimensions, and baseline interpretations',
        phase: 'Phase 1'
      }
    ]
  },
  {
    title: 'Intelligence & Users',
    items: [
      {
        id: 'users',
        label: 'Users & Profiles',
        href: '/admin/users',
        icon: 'Users',
        description: 'View registered users, roles, and attempt histories',
        phase: 'Phase 2'
      },
      {
        id: 'reports',
        label: 'Reports & Exports',
        href: '/admin/reports',
        icon: 'FileText',
        description: 'Generated report templates and export logs',
        phase: 'Phase 2'
      },
      {
        id: 'ai',
        label: 'AI & Interpretations',
        href: '/admin/ai',
        icon: 'Sparkles',
        description: 'Configure LLM providers, prompts, and token usage',
        phase: 'Phase 2'
      }
    ]
  },
  {
    title: 'Monetization & Growth',
    items: [
      {
        id: 'subscriptions',
        label: 'Subscriptions & Tiers',
        href: '/admin/subscriptions',
        icon: 'Layers',
        description: 'Manage subscription plans and feature access',
        phase: 'Phase 3'
      },
      {
        id: 'payments',
        label: 'Payments & Credits',
        href: '/admin/payments',
        icon: 'CreditCard',
        description: 'Transaction logs, credit packages, and Stripe sync',
        phase: 'Phase 3'
      },
      {
        id: 'seo',
        label: 'SEO & Landing Pages',
        href: '/admin/seo',
        icon: 'Search',
        description: 'Meta titles, OpenGraph images, and search indexing',
        phase: 'Phase 4'
      }
    ]
  },
  {
    title: 'Platform Control',
    items: [
      {
        id: 'content',
        label: 'Site Content (CMS)',
        href: '/admin/content',
        icon: 'Edit3',
        description: 'Edit homepage hero, FAQs, legal copy, and disclaimers',
        phase: 'Phase 4'
      },
      {
        id: 'settings',
        label: 'System Settings',
        href: '/admin/settings',
        icon: 'Sliders',
        description: 'Dynamic toggles, site branding, and maintenance mode',
        phase: 'Phase 0'
      },
      {
        id: 'analytics',
        label: 'Analytics & Funnels',
        href: '/admin/analytics',
        icon: 'BarChart3',
        description: 'Assessment completion rates and drop-off analytics',
        phase: 'Phase 4'
      },
      {
        id: 'audit-logs',
        label: 'Audit Logs',
        href: '/admin/audit-logs',
        icon: 'ShieldAlert',
        description: 'Security events, admin changes, and system history',
        phase: 'Phase 0'
      }
    ]
  }
];
