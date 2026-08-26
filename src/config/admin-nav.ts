export interface AdminNavSection {
  title: string;
  items: {
    id: string;
    label: string;
    href: string;
    icon: string;
    description: string;
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
        description: 'System overview, key metrics, and quick actions'
      },
      {
        id: 'assessments',
        label: 'Assessments',
        href: '/admin/assessments',
        icon: 'ClipboardList',
        description: 'Manage psychology assessment catalog and parameters'
      },
      {
        id: 'questions',
        label: 'Questions & Options',
        href: '/admin/questions',
        icon: 'HelpCircle',
        description: 'Create and organize test items and response scales'
      },
      {
        id: 'results',
        label: 'Scoring & Results',
        href: '/admin/results',
        icon: 'Award',
        description: 'Scoring rules, dimensions, and baseline interpretations'
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
        description: 'View registered users, roles, and attempt histories'
      },
      {
        id: 'reports',
        label: 'Reports & Exports',
        href: '/admin/reports',
        icon: 'FileText',
        description: 'Generated report templates and export logs'
      },
      {
        id: 'ai',
        label: 'AI & Interpretations',
        href: '/admin/ai',
        icon: 'Sparkles',
        description: 'Configure LLM providers, prompts, and token usage'
      }
    ]
  },
  {
    title: 'Monetization & Growth',
    items: [
      {
        id: 'subscriptions',
        label: 'Subscriptions & Tiers',
        href: '/admin/billing',
        icon: 'Layers',
        description: 'Manage subscription plans and feature access'
      },
      {
        id: 'credits',
        label: 'Credit Packages',
        href: '/admin/credits/packages',
        icon: 'CreditCard',
        description: 'Transaction logs, credit packages, and payments'
      },
      {
        id: 'growth',
        label: 'Growth & Experiments',
        href: '/admin/growth',
        icon: 'TrendingUp',
        description: 'Conversion rates and viral referral performance'
      }
    ]
  },
  {
    title: 'Platform & CMS',
    items: [
      {
        id: 'seo',
        label: 'SEO Engine',
        href: '/admin/seo',
        icon: 'Search',
        description: 'Technical SEO audits, meta tags, and robots directives'
      },
      {
        id: 'content',
        label: 'CMS & Legal Pages',
        href: '/admin/content',
        icon: 'FileCode',
        description: 'Blog articles, legal terms, and dynamic pages'
      },
      {
        id: 'email',
        label: 'Email & SMTP',
        href: '/admin/email/logs',
        icon: 'Mail',
        description: 'Transactional email delivery and logs'
      },
      {
        id: 'settings',
        label: 'System Settings',
        href: '/admin/settings',
        icon: 'Sliders',
        description: 'Platform configurations, feature flags, and health'
      }
    ]
  }
];
