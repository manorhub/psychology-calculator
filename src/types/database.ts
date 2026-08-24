// ==========================================
// Cloudflare D1 Database Schema Types
// ==========================================

// --- Core Users & Profiles ---
export type UserRole = 'admin' | 'user' | 'guest';
export type UserStatus = 'active' | 'pending_verification' | 'suspended' | 'deleted';

export interface UserRow {
  id: string;
  email: string;
  password_hash: string | null;
  auth_provider: string;
  auth_provider_id: string | null;
  role: UserRole;
  status: UserStatus;
  email_verified_at: string | null;
  last_login_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface ProfileRow {
  user_id: string;
  display_name: string | null;
  avatar_url: string | null;
  timezone: string;
  locale: string;
  preferences: string | null; // JSON
  created_at: string;
  updated_at: string;
}

export interface SessionRow {
  id: string;
  user_id: string;
  token_hash: string;
  ip_address: string | null;
  user_agent: string | null;
  expires_at: string;
  created_at: string;
  updated_at: string;
}

export interface VerificationTokenRow {
  id: string;
  user_id: string;
  token_hash: string;
  type: string;
  expires_at: string;
  created_at: string;
}

export interface PasswordResetTokenRow {
  id: string;
  user_id: string;
  token_hash: string;
  expires_at: string;
  used_at: string | null;
  created_at: string;
}

export interface OAuthAccountRow {
  id: string;
  user_id: string;
  provider: 'google';
  provider_user_id: string;
  email: string;
  created_at: string;
  updated_at: string;
}

export interface RateLimitRow {
  key: string;
  action: string;
  count: number;
  reset_at: string;
}

export interface AuditLogRow {
  id: string;
  actor_id: string | null;
  actor_role: string | null;
  action: string;
  entity_type: string;
  entity_id: string | null;
  details: string | null; // JSON
  ip_address: string | null;
  user_agent: string | null;
  created_at: string;
}

// --- Assessment Categories & Assessments ---
export type CategoryStatus = 'active' | 'inactive' | 'draft';
export type AssessmentStatus = 'draft' | 'published' | 'archived';
export type AssessmentAccessType = 'free' | 'free_guest' | 'premium' | 'credit_only' | 'registered' | 'authenticated';
export type QuestionType = 'likert' | 'multiple_choice' | 'yes_no' | 'ranking';

export interface AssessmentCategoryRow {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  icon: string | null;
  display_order: number;
  status: CategoryStatus;
  seo_title: string | null;
  seo_description: string | null;
  created_at: string;
  updated_at: string;
}

export interface AssessmentRow {
  id: string;
  category_id: string;
  name: string;
  slug: string;
  short_description: string;
  long_description: string | null;
  instructions: string | null;
  estimated_minutes: number;
  question_count: number;
  access_type: AssessmentAccessType;
  status: AssessmentStatus;
  featured: number; // 0 or 1
  display_order: number;
  version: number;
  disclaimer: string | null;
  completion_message?: string | null;
  settings?: string | null;
  published_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface AssessmentDimensionRow {
  id: string;
  assessment_id: string;
  name: string;
  slug: string;
  description: string | null;
  display_order: number;
  status: 'active' | 'inactive';
  created_at: string;
  updated_at: string;
}

export interface AssessmentQuestionRow {
  id: string;
  assessment_id: string;
  question_text: string;
  question_type: QuestionType;
  display_order: number;
  required: number;
  status: 'active' | 'inactive';
  created_at: string;
  updated_at: string;
}

export interface QuestionOptionRow {
  id: string;
  question_id: string;
  option_text: string;
  option_value: string;
  display_order: number;
  status: 'active' | 'inactive';
  created_at: string;
  updated_at: string;
}

// --- Scoring & Results ---
export interface ScoringRuleRow {
  id: string;
  assessment_id: string;
  question_id: string;
  dimension_id: string;
  option_id: string | null;
  score: number;
  weight: number;
  reverse_scoring: number;
  created_at: string;
  updated_at: string;
}

export interface ResultTypeRow {
  id: string;
  assessment_id: string;
  dimension_id: string | null;
  name: string;
  slug: string;
  description: string | null;
  minimum_score: number;
  maximum_score: number;
  display_order: number;
  status: 'active' | 'inactive';
  created_at: string;
  updated_at: string;
}

export type ResultSectionType =
  | 'overview'
  | 'strengths'
  | 'challenges'
  | 'communication'
  | 'relationships'
  | 'work_style'
  | 'growth_suggestions'
  | 'recommendations'
  | 'custom';

export interface ResultContentRow {
  id: string;
  result_type_id: string;
  section_type: ResultSectionType;
  title: string;
  content: string;
  display_order: number;
  created_at: string;
  updated_at: string;
}

// --- Attempts, Answers, Scores & Reports ---
export type AttemptStatus = 'in_progress' | 'completed' | 'abandoned';
export type ReportType = 'basic' | 'ai' | 'pdf' | 'comprehensive';
export type ReportStatus = 'pending' | 'processing' | 'completed' | 'failed';

export interface AssessmentAttemptRow {
  id: string;
  user_id: string | null;
  assessment_id: string;
  session_id: string;
  status: AttemptStatus;
  current_question_index: number;
  started_at: string;
  completed_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface AssessmentAnswerRow {
  id: string;
  attempt_id: string;
  question_id: string;
  option_id: string | null;
  answer_value: string;
  created_at: string;
}

export interface AssessmentScoreRow {
  id: string;
  attempt_id: string;
  dimension_id: string | null;
  raw_score: number;
  normalized_score: number;
  percentage: number;
  result_type_id: string | null;
  created_at: string;
}

export interface ReportRow {
  id: string;
  user_id: string | null;
  attempt_id: string;
  report_type: ReportType;
  status: ReportStatus;
  file_reference: string | null;
  content_data: string | null; // JSON
  error_message: string | null;
  generated_at: string | null;
  created_at: string;
  updated_at: string;
}

// --- AI Configurations & Prompts ---
export type AiProvider = 'openai' | 'gemini' | 'anthropic' | 'openrouter' | 'deepseek';

export interface AiConfigurationRow {
  id: string;
  provider: AiProvider;
  model: string;
  is_enabled: number;
  priority: number;
  api_key_reference: string;
  token_limit: number;
  temperature: number;
  credit_cost: number;
  system_prompt: string | null;
  fallback_provider_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface AiPromptRow {
  id: string;
  name: string;
  slug: string;
  purpose: string;
  prompt_template: string;
  provider_override: string | null;
  model_override: string | null;
  version: number;
  status: 'active' | 'draft' | 'archived';
  created_at: string;
  updated_at: string;
}

// --- Subscriptions, Payments & Credits (Lemon Squeezy Ready) ---
export type SubscriptionInterval = 'one_time' | 'monthly' | 'yearly';
export type SubscriptionStatus = 'on_trial' | 'active' | 'paused' | 'past_due' | 'unpaid' | 'cancelled' | 'expired';
export type PaymentStatus = 'pending' | 'paid' | 'failed' | 'refunded';
export type CreditTransactionType =
  | 'signup_bonus'
  | 'subscription_grant'
  | 'purchase'
  | 'ai_report_usage'
  | 'pdf_export_usage'
  | 'admin_adjustment'
  | 'refund';

export interface SubscriptionPlanRow {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  price: number;
  currency: string;
  billing_interval: SubscriptionInterval;
  features: string; // JSON array
  included_credits: number;
  lemon_squeezy_variant_id: string | null;
  status: 'active' | 'inactive' | 'archived';
  display_order: number;
  created_at: string;
  updated_at: string;
}

export interface SubscriptionRow {
  id: string;
  user_id: string;
  plan_id: string;
  lemon_squeezy_customer_id: string | null;
  lemon_squeezy_subscription_id: string | null;
  status: SubscriptionStatus;
  current_period_start: string | null;
  current_period_end: string | null;
  cancel_at_period_end: number;
  created_at: string;
  updated_at: string;
}

export interface PaymentRow {
  id: string;
  user_id: string | null;
  subscription_id: string | null;
  lemon_squeezy_order_id: string | null;
  amount: number;
  currency: string;
  status: PaymentStatus;
  payment_method: string | null;
  receipt_url: string | null;
  created_at: string;
  updated_at: string;
}

export interface CreditBalanceRow {
  user_id: string;
  balance: number;
  updated_at: string;
}

export interface CreditTransactionRow {
  id: string;
  user_id: string;
  amount: number;
  transaction_type: CreditTransactionType;
  source: string;
  reference_id: string | null;
  metadata: string | null; // JSON
  created_at: string;
}

// --- CMS Content, FAQs, Feature Flags & Site Settings ---
export type PageStatus = 'draft' | 'published' | 'archived';

export interface SiteSettingRow {
  key: string;
  value: string;
  type: 'string' | 'json' | 'number' | 'boolean';
  is_public: number;
  description: string | null;
  updated_at: string;
}

export interface PageRow {
  id: string;
  title: string;
  slug: string;
  content: string;
  status: PageStatus;
  seo_title: string | null;
  seo_description: string | null;
  published_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface FaqRow {
  id: string;
  question: string;
  answer: string;
  category: string;
  entity_type: string;
  entity_id: string | null;
  display_order: number;
  status: 'active' | 'inactive';
  created_at: string;
  updated_at: string;
}

export interface FeatureFlagRow {
  key: string;
  name: string;
  description: string | null;
  is_enabled: number; // 0 or 1
  updated_at: string;
}

export interface SeoMetadataRow {
  id: string;
  page_type: string;
  entity_id: string | null;
  title: string;
  description: string;
  canonical_url: string | null;
  og_title: string | null;
  og_description: string | null;
  og_image: string | null;
  robots: string | null;
  schema_data: string | null; // JSON
  created_at: string;
  updated_at: string;
}

// --- Rich Domain Entity Composite Types ---
export interface AssessmentWithCategory extends AssessmentRow {
  category_name?: string;
  category_slug?: string;
}

export interface QuestionWithOptions extends AssessmentQuestionRow {
  options: QuestionOptionRow[];
}

export interface ResultTypeWithContent extends ResultTypeRow {
  contents: ResultContentRow[];
}

export interface ResultSnapshotRow {
  id: string;
  attempt_id: string;
  assessment_id: string;
  assessment_version: number;
  primary_result_type_id: string | null;
  snapshot_data: string; // JSON
  share_token: string | null;
  is_public: number; // 0 or 1
  created_at: string;
  updated_at: string;
}

export interface SnapshotDimensionScore {
  dimensionId: string;
  dimensionName: string;
  dimensionSlug: string;
  rawScore: number;
  maxScore: number;
  normalizedScore: number;
  resultTypeId?: string;
  resultTypeName?: string;
}

export interface SnapshotResultContent {
  section_type: ResultSectionType;
  title: string;
  content: string;
  display_order: number;
}

export interface ResultSnapshotData {
  attemptId: string;
  assessmentId: string;
  assessmentName: string;
  assessmentSlug: string;
  assessmentVersion: number;
  disclaimer: string | null;
  completedAt: string;
  durationSeconds: number;
  totalRawScore: number;
  totalMaxScore: number;
  totalNormalizedScore: number;
  primaryResultType: {
    id: string;
    name: string;
    slug: string;
    description: string | null;
    contents: SnapshotResultContent[];
  } | null;
  dimensionScores: SnapshotDimensionScore[];
}

export type AIProviderType = 'openai' | 'gemini' | 'anthropic' | 'openrouter' | 'deepseek';

export interface AIGenerationRow {
  id: string;
  user_id: string | null;
  attempt_id: string;
  report_id: string | null;
  provider: AIProviderType;
  model: string;
  prompt_slug: string;
  prompt_version: number;
  status: 'started' | 'completed' | 'failed';
  input_tokens: number;
  output_tokens: number;
  total_tokens: number;
  estimated_cost: number;
  generation_time_ms: number;
  error_category: string | null;
  error_message: string | null;
  created_at: string;
  updated_at: string;
}

export interface AIReportContent {
  summary: string;
  key_traits: string[];
  strengths: string[];
  challenges: string[];
  communication: string;
  relationships: string;
  work_style: string;
  growth_opportunities: string[];
  practical_suggestions: string[];
}

export interface AIReportData {
  reportId: string;
  attemptId: string;
  userId: string | null;
  assessmentName: string;
  assessmentSlug: string;
  primaryArchetype: string;
  generatedAt: string;
  provider: string;
  model: string;
  content: AIReportContent;
  disclaimer: string;
}

// --- Phase 11: Lemon Squeezy Monetization & Subscriptions ---
export type BillingInterval = 'one_time' | 'monthly' | 'yearly';
export type PlanStatus = 'active' | 'inactive' | 'archived';
export type SubscriptionInternalStatus =
  | 'on_trial'
  | 'active'
  | 'paused'
  | 'past_due'
  | 'unpaid'
  | 'cancelled'
  | 'expired';

export interface SubscriptionPlanRow {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  price: number;
  currency: string;
  billing_interval: BillingInterval;
  features: string; // JSON array of string descriptions
  included_credits: number;
  lemon_squeezy_variant_id: string | null;
  status: PlanStatus;
  display_order: number;
  created_at: string;
  updated_at: string;
}

export interface PlanEntitlementRow {
  id: string;
  plan_id: string;
  feature_key: string;
  is_enabled: number; // 0 or 1
  limit_value: number | null;
  created_at: string;
  updated_at: string;
}

export interface SubscriptionRow {
  id: string;
  user_id: string;
  plan_id: string;
  lemon_squeezy_customer_id: string | null;
  lemon_squeezy_subscription_id: string | null;
  status: SubscriptionInternalStatus;
  current_period_start: string | null;
  current_period_end: string | null;
  cancel_at_period_end: number; // 0 or 1
  created_at: string;
  updated_at: string;
}

export interface PaymentRow {
  id: string;
  user_id: string | null;
  subscription_id: string | null;
  lemon_squeezy_order_id: string | null;
  amount: number;
  currency: string;
  status: 'pending' | 'paid' | 'failed' | 'refunded';
  payment_method: string | null;
  receipt_url: string | null;
  created_at: string;
  updated_at: string;
}

export interface WebhookEventRow {
  id: string;
  event_id: string;
  event_name: string;
  provider: string;
  payload: string;
  status: 'pending' | 'processed' | 'failed' | 'duplicate' | 'ignored';
  error_message: string | null;
  processed_at: string | null;
  created_at: string;
}

export interface PlanWithEntitlements extends Omit<SubscriptionPlanRow, 'features'> {
  features: string[];
  entitlements: Record<string, { is_enabled: boolean; limit_value: number | null }>;
}

export interface UserSubscriptionSummary {
  hasSubscription: boolean;
  isPremium: boolean;
  status: SubscriptionInternalStatus | 'free';
  planId: string;
  planName: string;
  planSlug: string;
  billingInterval: BillingInterval | 'none';
  price: number;
  currency: string;
  currentPeriodEnd: string | null;
  cancelAtPeriodEnd: boolean;
  customerPortalUrl?: string;
  entitlements: Record<string, boolean>;
}

// --- Phase 12: SEO, Redirects & Programmatic Content ---
export interface RedirectRow {
  id: string;
  old_path: string;
  new_path: string;
  status_code: 301 | 302 | 307 | 308;
  is_active: number; // 0 or 1
  hit_count: number;
  created_at: string;
  updated_at: string;
}

export interface InternalLinkRuleRow {
  id: string;
  source_type: 'assessment' | 'category' | 'global';
  source_id: string | null;
  target_type: 'assessment' | 'category' | 'page';
  target_id: string;
  anchor_text: string;
  display_order: number;
  is_active: number; // 0 or 1
  created_at: string;
  updated_at: string;
}

export interface PageMetadata {
  title: string;
  rawTitle?: string;
  description: string;
  canonicalUrl: string;
  robots: string;
  ogTitle?: string;
  ogDescription?: string;
  ogImage?: string;
  ogType?: 'website' | 'article';
  twitterCard?: 'summary' | 'summary_large_image';
  publishedTime?: string;
  modifiedTime?: string;
  author?: string;
  noindex?: boolean;
}

export interface BreadcrumbItem {
  name: string;
  url: string;
}

// ============================================================================
// Phase 13: Content CMS & Blog Engine
// ============================================================================

export type PostStatus = 'draft' | 'scheduled' | 'published' | 'archived';

export interface AuthorRow {
  id: string;
  name: string;
  slug: string;
  bio: string | null;
  avatar_url: string | null;
  role_title: string | null;
  social_links: string | null; // JSON map
  status: 'active' | 'inactive';
  created_at: string;
  updated_at: string;
}

export interface BlogCategoryRow {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  image_url: string | null;
  status: 'active' | 'inactive';
  display_order: number;
  created_at: string;
  updated_at: string;
}

export interface TagRow {
  id: string;
  name: string;
  slug: string;
  created_at: string;
}

export interface ContentCtaRow {
  id: string;
  title: string;
  description: string | null;
  button_text: string;
  button_url: string;
  style: 'indigo' | 'teal' | 'dark' | 'outline';
  status: 'active' | 'inactive';
  created_at: string;
  updated_at: string;
}

export interface PostRow {
  id: string;
  title: string;
  slug: string;
  excerpt: string | null;
  content: string;
  featured_image_url: string | null;
  author_id: string | null;
  category_id: string | null;
  status: PostStatus;
  featured: number; // 0 or 1
  reading_time_minutes: number;
  related_assessment_id: string | null;
  cta_id: string | null;
  published_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface PostWithRelations extends PostRow {
  author_name?: string;
  author_slug?: string;
  author_bio?: string;
  author_avatar?: string;
  author_role?: string;
  category_name?: string;
  category_slug?: string;
  related_assessment_name?: string;
  related_assessment_slug?: string;
  cta_title?: string;
  cta_desc?: string;
  cta_btn_text?: string;
  cta_btn_url?: string;
  cta_style?: string;
  tags?: TagRow[];
}

export interface MediaItemRow {
  id: string;
  filename: string;
  r2_key: string;
  mime_type: string;
  file_size: number;
  alt_text: string | null;
  caption: string | null;
  created_at: string;
}

export interface PostVersionRow {
  id: string;
  post_id: string;
  version_number: number;
  title: string;
  content: string;
  excerpt: string | null;
  created_at: string;
}

// ============================================================================
// PHASE 14: EMAIL, NOTIFICATIONS & USER COMMUNICATION
// ============================================================================

export type EmailEventKey =
  | 'welcome'
  | 'email_verification'
  | 'password_reset'
  | 'password_changed'
  | 'account_deleted'
  | 'assessment_completed'
  | 'result_available'
  | 'ai_report_ready'
  | 'ai_report_failed'
  | 'subscription_started'
  | 'subscription_cancelled'
  | 'subscription_expired'
  | 'payment_success'
  | 'payment_failed'
  | 'contact_form_received';

export type EmailJobStatus = 'queued' | 'sending' | 'sent' | 'failed' | 'cancelled';

export interface EmailTemplateRow {
  id: string;
  event_key: EmailEventKey;
  name: string;
  subject: string;
  html_body: string;
  text_body: string;
  status: 'active' | 'inactive';
  allowed_variables: string; // JSON string array
  updated_at: string;
  created_at: string;
}

export interface EmailJobRow {
  id: string;
  user_id: string | null;
  template_id: string | null;
  event_key: string;
  recipient: string;
  subject: string;
  payload: string | null; // JSON string object
  status: EmailJobStatus;
  attempts: number;
  max_attempts: number;
  last_error: string | null;
  scheduled_at: string;
  sent_at: string | null;
  created_at: string;
}

export type NotificationType =
  | 'assessment_completed'
  | 'ai_report_ready'
  | 'ai_report_failed'
  | 'subscription_updated'
  | 'payment_failed'
  | 'system';

export interface NotificationRow {
  id: string;
  user_id: string;
  type: NotificationType;
  title: string;
  message: string;
  link: string | null;
  read_at: string | null;
  created_at: string;
}

export interface UserNotificationPreferencesRow {
  user_id: string;
  assessment_reminders: number; // 0 or 1
  ai_report_alerts: number;     // 0 or 1
  billing_alerts: number;       // 0 or 1
  product_updates: number;      // 0 or 1
  marketing_emails: number;     // 0 or 1
  updated_at: string;
}

// ============================================================================
// PHASE 15: ANALYTICS & BUSINESS INTELLIGENCE
// ============================================================================

export type AnalyticsRange = 'today' | '7d' | '30d' | '90d' | 'this_year' | 'all';

export interface AnalyticsEventRow {
  id: string;
  user_id: string | null;
  session_id: string;
  event_name: string;
  entity_type: string | null;
  entity_id: string | null;
  metadata: string | null; // JSON string
  created_at: string;
}

export interface DailyAnalyticsRow {
  id: string;
  date: string;
  metric_key: string;
  entity_id: string | null;
  value: number;
  metadata: string | null;
  updated_at: string;
}

export interface OverviewMetrics {
  totalUsers: number;
  newUsers: number;
  activeUsers: number;
  assessmentStarts: number;
  assessmentCompletions: number;
  completionRate: number;
  aiReportsGenerated: number;
  aiSuccessRate: number;
  estimatedAiCost: number;
  activeSubscriptions: number;
  grossRevenue: number;
  publishedPosts: number;
  previousPeriod?: Partial<OverviewMetrics>;
}

export interface AssessmentAnalyticsItem {
  id: string;
  name: string;
  slug: string;
  categoryName: string;
  views: number;
  starts: number;
  completions: number;
  completionRate: number;
  aiReports: number;
  aiConversionRate: number;
  avgDurationMinutes: number;
}

export interface QuestionDropOffItem {
  questionNumber: number;
  questionText: string;
  answersCount: number;
  dropOffRate: number;
}

export interface AiAnalyticsSummary {
  totalRequests: number;
  successfulRequests: number;
  failedRequests: number;
  successRate: number;
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
  estimatedTotalCost: number;
  providerBreakdown: {
    provider: string;
    requests: number;
    tokens: number;
    cost: number;
  }[];
  assessmentCostBreakdown: {
    assessmentName: string;
    reportsCount: number;
    tokens: number;
    estimatedCost: number;
  }[];
}

export interface RevenueAnalyticsSummary {
  activeSubscriptions: number;
  trialingSubscriptions: number;
  cancelledSubscriptions: number;
  expiredSubscriptions: number;
  churnRate: number;
  grossRevenue: number;
  recentOrdersCount: number;
  planBreakdown: {
    planName: string;
    activeCount: number;
    revenue: number;
  }[];
}

export interface ContentAnalyticsItem {
  id: string;
  title: string;
  slug: string;
  categoryName: string;
  views: number;
  ctaClicks: number;
  ctr: number;
}

export interface SystemHealthSummary {
  failedEmailsCount: number;
  emailDeliveryRate: number;
  failedAiGenerationsCount: number;
  webhookFailuresCount: number;
  recentErrors: {
    service: string;
    action: string;
    error: string;
    timestamp: string;
  }[];
}

// ============================================================================
// PHASE 16: ADMIN CONTROL CENTER & GLOBAL DYNAMIC SETTINGS
// ============================================================================

export type SettingGroupName =
  | 'general'
  | 'branding'
  | 'homepage'
  | 'announcement'
  | 'maintenance'
  | 'navigation'
  | 'footer'
  | 'social'
  | 'seo'
  | 'ai'
  | 'billing'
  | 'email'
  | 'analytics'
  | 'pdf'
  | 'assessments'
  | 'users'
  | 'security';

export interface SiteSettingRow {
  key: string;
  value: string;
  type: 'string' | 'json' | 'number' | 'boolean';
  is_public: number; // 0 or 1
  description: string | null;
  updated_at: string;
}

export interface LegalPageRow {
  id: string;
  slug: string;
  title: string;
  content_markdown: string;
  content_html: string;
  is_published: number; // 0 or 1
  created_at: string;
  updated_at: string;
}

export interface FeatureFlagRow {
  key: string;
  name: string;
  description: string | null;
  is_enabled: number; // 0 or 1
  updated_at: string;
}

export interface PublicSiteSettings {
  siteName: string;
  siteUrl: string;
  tagline: string;
  logoUrl: string;
  faviconUrl: string;
  primaryColor: string;
  secondaryColor: string;
  accentColor: string;
  themeMode: 'light' | 'dark' | 'system';
  announcement: {
    enabled: boolean;
    message: string;
    linkText: string;
    linkUrl: string;
    dismissible: boolean;
  };
  maintenance: {
    enabled: boolean;
    message: string;
    estimatedReturn: string;
  };
  navigation: {
    headerLinks: { label: string; href: string }[];
    footerColumns: { title: string; links: { label: string; href: string }[] }[];
    socialLinks: Record<string, string>;
  };
  homepage: {
    heroHeading: string;
    heroDescription: string;
    heroCtaText: string;
    heroCtaUrl: string;
    featuredAssessmentsEnabled: boolean;
    howItWorksEnabled: boolean;
    howItWorksSteps: { step: number; title: string; description: string }[];
    homepageFaqsEnabled: boolean;
    finalCtaHeading: string;
    finalCtaDescription: string;
    finalCtaButtonText: string;
    finalCtaButtonUrl: string;
  };
  features: Record<string, boolean>;
}

export interface SystemHealthCheck {
  service: string;
  status: 'healthy' | 'degraded' | 'unhealthy';
  latencyMs: number;
  message: string;
  timestamp: string;
}

export interface ConfigExportPayload {
  version: string;
  exportedAt: string;
  appName: string;
  settings: Record<string, any>;
  featureFlags: Record<string, boolean>;
  legalPages: { slug: string; title: string; content_markdown: string }[];
}







