-- Migration 0036: Comprehensive Transactional Email System
-- PsychologyCalculator.com

-- 1. Ensure new columns on email_templates
ALTER TABLE email_templates ADD COLUMN category TEXT DEFAULT 'auth_security';
ALTER TABLE email_templates ADD COLUMN preview_text TEXT;
ALTER TABLE email_templates ADD COLUMN headline TEXT;
ALTER TABLE email_templates ADD COLUMN body_content TEXT;
ALTER TABLE email_templates ADD COLUMN button_text TEXT;
ALTER TABLE email_templates ADD COLUMN button_url TEXT;
ALTER TABLE email_templates ADD COLUMN footer_note TEXT;
ALTER TABLE email_templates ADD COLUMN sender_name TEXT;
ALTER TABLE email_templates ADD COLUMN sender_email TEXT;
ALTER TABLE email_templates ADD COLUMN reply_to TEXT;
ALTER TABLE email_templates ADD COLUMN is_system_default INTEGER DEFAULT 1;

-- 2. Ensure new columns on email_jobs
ALTER TABLE email_jobs ADD COLUMN provider_message_id TEXT;
ALTER TABLE email_jobs ADD COLUMN idempotency_key TEXT;

CREATE INDEX IF NOT EXISTS idx_email_templates_category ON email_templates(category);
CREATE UNIQUE INDEX IF NOT EXISTS idx_email_jobs_idempotency ON email_jobs(idempotency_key) WHERE idempotency_key IS NOT NULL;

-- 3. Upsert All Production Standardized Email Templates

-- ============================================================================
-- A. USER SIGNUP / WELCOME
-- ============================================================================
INSERT OR REPLACE INTO email_templates (
    id, event_key, name, category, subject, preview_text, headline, body_content,
    button_text, button_url, footer_note, html_body, text_body, status, allowed_variables, is_system_default
) VALUES (
    'tmpl_user_signup',
    'user.signup',
    'Welcome to PsychologyCalculator.com',
    'auth_security',
    'Welcome to PsychologyCalculator.com',
    'Explore self-assessments across personality, emotional wellbeing, and career.',
    'Welcome to PsychologyCalculator.com',
    'Hi {{user_name}},\n\nWelcome to PsychologyCalculator.com.\n\nYou can explore self-assessments across personality, relationships, emotional wellbeing, career, communication, and more.\n\nWhenever you''re ready, choose an assessment and start exploring your results.',
    'Explore Assessments',
    '{{dashboard_url}}',
    'If you have any questions or need help navigating your assessments, feel free to contact our support team.',
    '',
    '',
    'active',
    '["user_name", "user_email", "dashboard_url", "site_name", "site_url", "support_email"]',
    1
);

-- ============================================================================
-- B. EMAIL VERIFICATION
-- ============================================================================
INSERT OR REPLACE INTO email_templates (
    id, event_key, name, category, subject, preview_text, headline, body_content,
    button_text, button_url, footer_note, html_body, text_body, status, allowed_variables, is_system_default
) VALUES (
    'tmpl_email_verification',
    'user.email_verification',
    'Email Verification',
    'auth_security',
    'Verify your PsychologyCalculator.com email',
    'Confirm your email address to complete your account setup.',
    'Verify Your Email Address',
    'Hi {{user_name}},\n\nPlease verify your email address to finish setting up your account.',
    'Verify Email',
    '{{verification_url}}',
    'If you didn''t create this account, you can safely ignore this email. This link will expire in 24 hours.',
    '',
    '',
    'active',
    '["user_name", "user_email", "verification_url", "site_name", "site_url", "support_email"]',
    1
);

-- ============================================================================
-- C. PASSWORD RESET REQUEST
-- ============================================================================
INSERT OR REPLACE INTO email_templates (
    id, event_key, name, category, subject, preview_text, headline, body_content,
    button_text, button_url, footer_note, html_body, text_body, status, allowed_variables, is_system_default
) VALUES (
    'tmpl_password_reset',
    'user.password_reset',
    'Password Reset Request',
    'auth_security',
    'Reset your PsychologyCalculator.com password',
    'Instructions to reset your account password.',
    'Reset Your Password',
    'Hi {{user_name}},\n\nWe received a request to reset your password.',
    'Reset Password',
    '{{reset_url}}',
    'If you didn''t request this, you can ignore this email. Your password will not change unless the reset link is used. This link expires in 1 hour.',
    '',
    '',
    'active',
    '["user_name", "user_email", "reset_url", "site_name", "site_url", "support_email"]',
    1
);

-- ============================================================================
-- D. PASSWORD CHANGED
-- ============================================================================
INSERT OR REPLACE INTO email_templates (
    id, event_key, name, category, subject, preview_text, headline, body_content,
    button_text, button_url, footer_note, html_body, text_body, status, allowed_variables, is_system_default
) VALUES (
    'tmpl_password_changed',
    'user.password_changed',
    'Password Changed Notification',
    'auth_security',
    'Your PsychologyCalculator.com password was changed',
    'Security confirmation that your password was recently updated.',
    'Password Changed',
    'Hi {{user_name}},\n\nYour account password was successfully changed.',
    'Go to Dashboard',
    '{{dashboard_url}}',
    'If you didn''t make this change, please contact support as soon as possible to secure your account.',
    '',
    '',
    'active',
    '["user_name", "user_email", "dashboard_url", "site_name", "site_url", "support_email"]',
    1
);

-- ============================================================================
-- E. WELCOME / ACCOUNT READY
-- ============================================================================
INSERT OR REPLACE INTO email_templates (
    id, event_key, name, category, subject, preview_text, headline, body_content,
    button_text, button_url, footer_note, html_body, text_body, status, allowed_variables, is_system_default
) VALUES (
    'tmpl_account_ready',
    'user.account_ready',
    'Account Ready & Onboarding',
    'auth_security',
    'Your PsychologyCalculator.com account is ready',
    'Your profile is ready. Start exploring your psychological profile.',
    'Your Account is Ready',
    'Hi {{user_name}},\n\nYour PsychologyCalculator.com account is completely set up.\n\nYou can now take psychometric assessments, track your progress over time, and generate personalized insight reports.',
    'Open Dashboard',
    '{{dashboard_url}}',
    'You can access your results and account settings anytime from your dashboard.',
    '',
    '',
    'active',
    '["user_name", "user_email", "dashboard_url", "site_name", "site_url", "support_email"]',
    1
);

-- ============================================================================
-- F. ASSESSMENT COMPLETED
-- ============================================================================
INSERT OR REPLACE INTO email_templates (
    id, event_key, name, category, subject, preview_text, headline, body_content,
    button_text, button_url, footer_note, html_body, text_body, status, allowed_variables, is_system_default
) VALUES (
    'tmpl_assessment_completed',
    'assessment.completed',
    'Assessment Completed',
    'assessments',
    'Your {{assessment_name}} results are ready',
    'You completed your assessment. Review your scores and primary traits.',
    'Assessment Results Ready',
    'Hi {{user_name}},\n\nYou''ve completed the {{assessment_name}}.\n\nYour results are ready to review. You can return to your dashboard whenever you''re ready.',
    'View My Results',
    '{{result_url}}',
    'Your assessment data is private and securely saved to your account.',
    '',
    '',
    'active',
    '["user_name", "assessment_name", "result_url", "dashboard_url", "site_name", "site_url"]',
    1
);

-- ============================================================================
-- G. REPORT GENERATION STARTED
-- ============================================================================
INSERT OR REPLACE INTO email_templates (
    id, event_key, name, category, subject, preview_text, headline, body_content,
    button_text, button_url, footer_note, html_body, text_body, status, allowed_variables, is_system_default
) VALUES (
    'tmpl_report_started',
    'report.generation_started',
    'Report Generation Started',
    'reports',
    'We''ve started generating your {{assessment_name}} report',
    'Your in-depth psychological report is currently synthesizing.',
    'Report Synthesis in Progress',
    'Hi {{user_name}},\n\nWe''ve started generating your personalized report for {{assessment_name}}.\n\nOur analysis engine is synthesizing your dimension scores and personalized growth recommendations. You will receive an email as soon as your report is ready.',
    'Go to Dashboard',
    '{{dashboard_url}}',
    'You do not need to keep your browser tab open while the report finishes.',
    '',
    '',
    'inactive',
    '["user_name", "assessment_name", "dashboard_url", "site_name", "site_url"]',
    1
);

-- ============================================================================
-- H. REPORT READY
-- ============================================================================
INSERT OR REPLACE INTO email_templates (
    id, event_key, name, category, subject, preview_text, headline, body_content,
    button_text, button_url, footer_note, html_body, text_body, status, allowed_variables, is_system_default
) VALUES (
    'tmpl_report_ready',
    'report.ready',
    'AI Report Ready',
    'reports',
    'Your {{assessment_name}} report is ready',
    'Your personalized deep interpretation report is ready to review.',
    'Your Report is Ready',
    'Hi {{user_name}},\n\nYour personalized report for {{assessment_name}} is ready.\n\nOpen your report to explore your results, key patterns, and personalized insights.',
    'View My Report',
    '{{report_url}}',
    'Your report is saved securely in your account history and can be exported as a PDF.',
    '',
    '',
    'active',
    '["user_name", "assessment_name", "report_url", "dashboard_url", "site_name", "site_url"]',
    1
);

-- ============================================================================
-- I. REPORT GENERATION FAILED
-- ============================================================================
INSERT OR REPLACE INTO email_templates (
    id, event_key, name, category, subject, preview_text, headline, body_content,
    button_text, button_url, footer_note, html_body, text_body, status, allowed_variables, is_system_default
) VALUES (
    'tmpl_report_failed',
    'report.failed',
    'Report Generation Failed',
    'reports',
    'We couldn''t complete your report',
    'Notice regarding your recent report generation.',
    'Report Generation Issue',
    'Hi {{user_name}},\n\nWe weren''t able to generate your {{assessment_name}} report this time.\n\nYou can try again from your dashboard.\n\n{{credit_refund_message}}',
    'Return to Dashboard',
    '{{dashboard_url}}',
    'If you continue to experience problems, please contact support.',
    '',
    '',
    'active',
    '["user_name", "assessment_name", "credit_refund_message", "dashboard_url", "site_name", "site_url", "support_email"]',
    1
);

-- ============================================================================
-- J. CREDIT PURCHASE SUCCESS
-- ============================================================================
INSERT OR REPLACE INTO email_templates (
    id, event_key, name, category, subject, preview_text, headline, body_content,
    button_text, button_url, footer_note, html_body, text_body, status, allowed_variables, is_system_default
) VALUES (
    'tmpl_credit_purchase_success',
    'credits.purchase_success',
    'Credit Purchase Confirmation',
    'credits_billing',
    'Your credits have been added',
    'Your credit purchase was successful. Start exploring assessments.',
    'Credit Purchase Confirmed',
    'Hi {{user_name}},\n\nYour credit purchase was successful.\n\nPackage: {{package_name}}\nCredits added: {{credits_purchased}}\nAmount: {{purchase_amount}} {{currency}}\nCurrent balance: {{credits_balance}} credits\nTransaction: {{transaction_id}}',
    'Start an Assessment',
    '{{dashboard_url}}',
    'Your credits do not expire and can be used for in-depth AI reports anytime.',
    '',
    '',
    'active',
    '["user_name", "package_name", "credits_purchased", "purchase_amount", "currency", "credits_balance", "transaction_id", "dashboard_url", "site_name", "site_url"]',
    1
);

-- ============================================================================
-- K. CREDIT PURCHASE FAILED
-- ============================================================================
INSERT OR REPLACE INTO email_templates (
    id, event_key, name, category, subject, preview_text, headline, body_content,
    button_text, button_url, footer_note, html_body, text_body, status, allowed_variables, is_system_default
) VALUES (
    'tmpl_credit_purchase_failed',
    'credits.purchase_failed',
    'Credit Purchase Failed',
    'credits_billing',
    'Your credit purchase couldn''t be completed',
    'Notice regarding your recent credit purchase attempt.',
    'Purchase Could Not Be Completed',
    'Hi {{user_name}},\n\nYour recent credit purchase could not be completed.\n\nNo credits were added to your account, and you were not charged.\n\nYou can try again from your account.',
    'Try Again',
    '{{credits_url}}',
    'If you believe this charge was deducted by your bank or payment provider, please contact our support team with your payment reference.',
    '',
    '',
    'active',
    '["user_name", "credits_url", "dashboard_url", "site_name", "site_url", "support_email"]',
    1
);

-- ============================================================================
-- L. LOW CREDIT BALANCE
-- ============================================================================
INSERT OR REPLACE INTO email_templates (
    id, event_key, name, category, subject, preview_text, headline, body_content,
    button_text, button_url, footer_note, html_body, text_body, status, allowed_variables, is_system_default
) VALUES (
    'tmpl_credit_low_balance',
    'credits.low_balance',
    'Low Credit Balance Notice',
    'credits_billing',
    'You have {{credits_balance}} credits remaining',
    'Your credit balance is running low.',
    'Low Credit Balance Notice',
    'Hi {{user_name}},\n\nYou currently have {{credits_balance}} credits remaining.\n\nWhen you''re ready, you can purchase additional credits from your account to continue unlocking deep psychological reports.',
    'Get More Credits',
    '{{credits_url}}',
    'You can adjust low balance alert preferences in your notification settings.',
    '',
    '',
    'active',
    '["user_name", "credits_balance", "credits_url", "dashboard_url", "site_name", "site_url"]',
    1
);

-- ============================================================================
-- M. CREDIT PURCHASE RECEIPT
-- ============================================================================
INSERT OR REPLACE INTO email_templates (
    id, event_key, name, category, subject, preview_text, headline, body_content,
    button_text, button_url, footer_note, html_body, text_body, status, allowed_variables, is_system_default
) VALUES (
    'tmpl_credit_receipt',
    'credits.receipt',
    'Credit Purchase Receipt',
    'credits_billing',
    'Receipt for your PsychologyCalculator.com credit purchase',
    'Official payment receipt for your credit purchase.',
    'Payment Receipt',
    'Hi {{user_name}},\n\nHere is your official receipt for your credit purchase on PsychologyCalculator.com.\n\nPackage: {{package_name}}\nCredits: {{credits_purchased}}\nAmount: {{purchase_amount}} {{currency}}\nTransaction ID: {{transaction_id}}\nDate: {{purchase_date}}',
    'View Account Billing',
    '{{billing_url}}',
    'Thank you for using PsychologyCalculator.com. For tax or invoice questions, contact support.',
    '',
    '',
    'active',
    '["user_name", "package_name", "credits_purchased", "purchase_amount", "currency", "transaction_id", "purchase_date", "billing_url", "site_name", "site_url"]',
    1
);

-- ============================================================================
-- N. ACCOUNT DELETION REQUESTED
-- ============================================================================
INSERT OR REPLACE INTO email_templates (
    id, event_key, name, category, subject, preview_text, headline, body_content,
    button_text, button_url, footer_note, html_body, text_body, status, allowed_variables, is_system_default
) VALUES (
    'tmpl_account_deletion_requested',
    'account.deletion_requested',
    'Account Deletion Requested',
    'auth_security',
    'Account deletion request received',
    'Notice regarding your requested account deletion.',
    'Account Deletion Request',
    'Hi {{user_name}},\n\nWe received a request to permanently delete your PsychologyCalculator.com account.\n\nYour test history, personality snapshots, and personal data will be erased in accordance with our Privacy Policy.\n\nIf you did not request this, please contact our support team immediately.',
    'Contact Support',
    '{{support_url}}',
    'This is a critical security notice regarding your account.',
    '',
    '',
    'active',
    '["user_name", "support_url", "site_name", "site_url", "support_email"]',
    1
);

-- ============================================================================
-- O. ACCOUNT DELETED
-- ============================================================================
INSERT OR REPLACE INTO email_templates (
    id, event_key, name, category, subject, preview_text, headline, body_content,
    button_text, button_url, footer_note, html_body, text_body, status, allowed_variables, is_system_default
) VALUES (
    'tmpl_account_deleted',
    'account.deleted',
    'Account Deletion Confirmation',
    'auth_security',
    'Your PsychologyCalculator.com account has been deleted',
    'Confirmation that your account has been deleted.',
    'Account Deletion Complete',
    'Hi {{user_name}},\n\nYour PsychologyCalculator.com account deletion has been completed.\n\nThank you for using PsychologyCalculator.com.\n\nIf you believe this happened in error, please contact support.',
    'Visit Homepage',
    '{{site_url}}',
    'All personal profile data has been removed in accordance with our data retention policy.',
    '',
    '',
    'active',
    '["user_name", "site_name", "site_url", "support_email"]',
    1
);

-- ============================================================================
-- P. OPTIONAL PRODUCT & MARKETING TEMPLATES (DISABLED BY DEFAULT)
-- ============================================================================

-- 1. Assessment Reminder
INSERT OR REPLACE INTO email_templates (
    id, event_key, name, category, subject, preview_text, headline, body_content,
    button_text, button_url, footer_note, html_body, text_body, status, allowed_variables, is_system_default
) VALUES (
    'tmpl_opt_assessment_reminder',
    'assessment.reminder',
    'Assessment Reminder',
    'system_optional',
    'Ready for your next self-reflection?',
    'Take a few minutes to explore your personality traits.',
    'Continue Your Self-Discovery',
    'Hi {{user_name}},\n\nIt''s been a while since your last psychometric assessment.\n\nSelf-reflection and continuous tracking can help you observe personal growth and emotional patterns over time.',
    'Explore Assessments',
    '{{dashboard_url}}',
    'You received this optional reminder based on your notification preferences.',
    '',
    '',
    'inactive',
    '["user_name", "dashboard_url", "site_name", "site_url", "unsubscribe_url"]',
    1
);

-- 2. Incomplete Assessment Reminder
INSERT OR REPLACE INTO email_templates (
    id, event_key, name, category, subject, preview_text, headline, body_content,
    button_text, button_url, footer_note, html_body, text_body, status, allowed_variables, is_system_default
) VALUES (
    'tmpl_opt_incomplete_assessment',
    'incomplete_assessment.reminder',
    'Incomplete Assessment Reminder',
    'system_optional',
    'Finish your {{assessment_name}} assessment',
    'Your responses are waiting. Complete your assessment to view your results.',
    'Complete Your Assessment',
    'Hi {{user_name}},\n\nYou recently started the {{assessment_name}} assessment.\n\nWhenever you''re ready, you can pick up right where you left off and discover your psychometric breakdown.',
    'Resume Assessment',
    '{{assessment_url}}',
    'Your progress has been preserved.',
    '',
    '',
    'inactive',
    '["user_name", "assessment_name", "assessment_url", "dashboard_url", "site_name", "site_url", "unsubscribe_url"]',
    1
);

-- 3. Report View Reminder
INSERT OR REPLACE INTO email_templates (
    id, event_key, name, category, subject, preview_text, headline, body_content,
    button_text, button_url, footer_note, html_body, text_body, status, allowed_variables, is_system_default
) VALUES (
    'tmpl_opt_report_view_reminder',
    'report.view_reminder',
    'Report View Reminder',
    'system_optional',
    'Your {{assessment_name}} report is waiting for you',
    'Revisit your personalized psychological insights.',
    'Your Report Insights',
    'Hi {{user_name}},\n\nYour personalized report for {{assessment_name}} is available in your dashboard.\n\nReview your strengths, communication tendencies, and growth opportunities whenever you need.',
    'Open My Report',
    '{{report_url}}',
    'You can access all past reports in your account dashboard.',
    '',
    '',
    'inactive',
    '["user_name", "assessment_name", "report_url", "dashboard_url", "site_name", "site_url", "unsubscribe_url"]',
    1
);

-- 4. Credits Expiring Notice
INSERT OR REPLACE INTO email_templates (
    id, event_key, name, category, subject, preview_text, headline, body_content,
    button_text, button_url, footer_note, html_body, text_body, status, allowed_variables, is_system_default
) VALUES (
    'tmpl_opt_credits_expiring',
    'credits.expiring',
    'Credits Expiring Notice',
    'system_optional',
    'Important update regarding promotional credits',
    'Use your promotional credit balance before expiration.',
    'Promotional Credits Update',
    'Hi {{user_name}},\n\nYou have {{credits_balance}} promotional credits in your account that will expire on {{expiry_date}}.\n\nYou can use these credits to generate in-depth AI reports across any of our assessments.',
    'Use My Credits',
    '{{dashboard_url}}',
    'Standard purchased credits never expire.',
    '',
    '',
    'inactive',
    '["user_name", "credits_balance", "expiry_date", "dashboard_url", "site_name", "site_url", "unsubscribe_url"]',
    1
);

-- 5. Product Announcement
INSERT OR REPLACE INTO email_templates (
    id, event_key, name, category, subject, preview_text, headline, body_content,
    button_text, button_url, footer_note, html_body, text_body, status, allowed_variables, is_system_default
) VALUES (
    'tmpl_opt_product_announcement',
    'product.announcement',
    'Product Announcement',
    'system_optional',
    'New updates on PsychologyCalculator.com',
    'Discover new features and psychometric assessments.',
    'Product Announcement',
    'Hi {{user_name}},\n\nWe''ve added new evidence-based assessments and updated our analysis tools on PsychologyCalculator.com.\n\n{{announcement_body}}',
    'Explore What''s New',
    '{{announcement_url}}',
    'You received this product update based on your communication preferences.',
    '',
    '',
    'inactive',
    '["user_name", "announcement_body", "announcement_url", "site_name", "site_url", "unsubscribe_url"]',
    1
);

-- 6. Feature Announcement
INSERT OR REPLACE INTO email_templates (
    id, event_key, name, category, subject, preview_text, headline, body_content,
    button_text, button_url, footer_note, html_body, text_body, status, allowed_variables, is_system_default
) VALUES (
    'tmpl_opt_feature_announcement',
    'feature.announcement',
    'Feature Announcement',
    'system_optional',
    'New feature: {{feature_name}}',
    'Learn how the new {{feature_name}} works.',
    'Introducing {{feature_name}}',
    'Hi {{user_name}},\n\nWe''re excited to introduce {{feature_name}} on PsychologyCalculator.com.\n\n{{feature_description}}',
    'Try {{feature_name}}',
    '{{feature_url}}',
    'You can manage feature updates anytime in your settings.',
    '',
    '',
    'inactive',
    '["user_name", "feature_name", "feature_description", "feature_url", "site_name", "site_url", "unsubscribe_url"]',
    1
);

-- 7. Security Alert
INSERT OR REPLACE INTO email_templates (
    id, event_key, name, category, subject, preview_text, headline, body_content,
    button_text, button_url, footer_note, html_body, text_body, status, allowed_variables, is_system_default
) VALUES (
    'tmpl_opt_security_alert',
    'security.alert',
    'Security Alert',
    'auth_security',
    'Important security notice for your account',
    'Security notification regarding recent activity on your account.',
    'Security Notification',
    'Hi {{user_name}},\n\nWe detected a new login or security event on your PsychologyCalculator.com account.\n\nDevice / Location: {{security_details}}\nTime: {{timestamp}}',
    'Review Security Settings',
    '{{security_url}}',
    'If this was you, no action is needed. If you did not recognize this activity, please change your password immediately.',
    '',
    '',
    'inactive',
    '["user_name", "security_details", "timestamp", "security_url", "site_name", "site_url", "support_email"]',
    1
);
