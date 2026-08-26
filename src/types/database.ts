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
export type AssessmentAccessType = 'free' | 'premium' | 'credit_only';
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

// --- Snapshot & Social Sharing Types ---
export interface SnapshotResultContent {
  section_type: ResultSectionType;
  title: string;
  content: string;
}

export interface SnapshotPrimaryResultType {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  contents: SnapshotResultContent[];
}

export interface SnapshotDimensionScore {
  dimensionId: string;
  name: string;
  slug: string;
  description?: string;
  rawScore: number;
  maxScore: number;
  normalizedScore: number;
  percentage: number;
  levelLabel?: string;
}

export interface ResultSnapshotData {
  attemptId: string;
  assessmentId: string;
  assessmentName: string;
  assessmentSlug: string;
  assessmentVersion: number;
  completedAt: string;
  durationSeconds: number;
  totalRawScore: number;
  totalMaxScore: number;
  totalNormalizedScore: number;
  dimensionScores: SnapshotDimensionScore[];
  primaryResultType?: SnapshotPrimaryResultType | null;
}

export interface ResultSnapshotRow {
  id: string;
  attempt_id: string;
  assessment_id: string;
  assessment_version: number;
  primary_result_type_id: string | null;
  snapshot_data: string; // JSON
  share_token: string | null;
  is_public: number;
  created_at: string;
  updated_at: string;
}

export interface ResultShareRow {
  id: string;
  share_token: string;
  attempt_id: string;
  assessment_id: string;
  assessment_slug: string;
  user_id: string | null;
  language: string;
  sanitized_data: string; // JSON
  is_active: number;
  view_count: number;
  share_count: number;
  expires_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface SanitizedPublicShareData {
  assessmentName: string;
  assessmentSlug: string;
  resultTitle: string;
  resultSummary: string;
  totalScore: number;
  scorePercent: number;
  levelLabel: string;
  language: string;
  dimensions: Array<{
    name: string;
    scorePercent: number;
    levelLabel?: string;
  }>;
  shareToken: string;
  createdAt: string;
}
