-- Phase 14: Email, Notifications & User Communication Schema
-- Cloudflare D1 (SQLite)

-- 1. Email Templates Table
CREATE TABLE IF NOT EXISTS email_templates (
    id TEXT PRIMARY KEY,
    event_key TEXT NOT NULL UNIQUE,
    name TEXT NOT NULL,
    subject TEXT NOT NULL,
    html_body TEXT NOT NULL,
    text_body TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
    allowed_variables TEXT NOT NULL, -- JSON Array of string variable keys
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_email_templates_event ON email_templates(event_key);
CREATE INDEX IF NOT EXISTS idx_email_templates_status ON email_templates(status);

-- 2. Email Jobs & Delivery Log Table
CREATE TABLE IF NOT EXISTS email_jobs (
    id TEXT PRIMARY KEY,
    user_id TEXT,
    template_id TEXT,
    event_key TEXT NOT NULL,
    recipient TEXT NOT NULL,
    subject TEXT NOT NULL,
    payload TEXT, -- JSON Object with interpolated variables
    status TEXT NOT NULL DEFAULT 'queued' CHECK (status IN ('queued', 'sending', 'sent', 'failed', 'cancelled')),
    attempts INTEGER NOT NULL DEFAULT 0,
    max_attempts INTEGER NOT NULL DEFAULT 3,
    last_error TEXT,
    scheduled_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    sent_at DATETIME,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL,
    FOREIGN KEY (template_id) REFERENCES email_templates(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_email_jobs_user ON email_jobs(user_id);
CREATE INDEX IF NOT EXISTS idx_email_jobs_status ON email_jobs(status);
CREATE INDEX IF NOT EXISTS idx_email_jobs_event ON email_jobs(event_key);
CREATE INDEX IF NOT EXISTS idx_email_jobs_created ON email_jobs(created_at);

-- 3. In-App Notifications Table
CREATE TABLE IF NOT EXISTS notifications (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    type TEXT NOT NULL CHECK (type IN ('assessment_completed', 'ai_report_ready', 'ai_report_failed', 'subscription_updated', 'payment_failed', 'system')),
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    link TEXT,
    read_at DATETIME,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_notifications_user ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_read ON notifications(user_id, read_at);
CREATE INDEX IF NOT EXISTS idx_notifications_created ON notifications(created_at);

-- 4. User Notification Preferences Table
CREATE TABLE IF NOT EXISTS user_notification_preferences (
    user_id TEXT PRIMARY KEY,
    assessment_reminders INTEGER NOT NULL DEFAULT 1,
    ai_report_alerts INTEGER NOT NULL DEFAULT 1,
    billing_alerts INTEGER NOT NULL DEFAULT 1,
    product_updates INTEGER NOT NULL DEFAULT 1,
    marketing_emails INTEGER NOT NULL DEFAULT 0,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- ============================================================================
-- SEED DEFAULT EMAIL TEMPLATES (ALL 15 SYSTEM EVENT KEYS)
-- ============================================================================

-- 1. Account: Welcome
INSERT OR IGNORE INTO email_templates (id, event_key, name, subject, html_body, text_body, status, allowed_variables)
VALUES (
    'tmpl_welcome',
    'welcome',
    'Welcome to Psychology Calculator',
    'Welcome to {{site_name}}, {{user_name}}!',
    '<div style="font-family: -apple-system, BlinkMacSystemFont, ''Segoe UI'', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 32px 24px; color: #1e293b; background-color: #ffffff; border-radius: 16px; border: 1px solid #e2e8f0;">
      <div style="text-align: center; margin-bottom: 28px;">
        <h1 style="color: #4f46e5; font-size: 24px; font-weight: 800; margin: 0 0 8px;">Psychology Calculator</h1>
        <p style="color: #64748b; font-size: 14px; margin: 0;">Evidence-based psychological & personality psychometrics</p>
      </div>
      <p style="font-size: 15px; line-height: 1.6;">Hi {{user_name}},</p>
      <p style="font-size: 15px; line-height: 1.6;">Welcome to <strong>{{site_name}}</strong>! Your account has been activated. You now have access to our validated assessment catalog, continuous trait tracking, and personalized psychometric results.</p>
      <div style="text-align: center; margin: 32px 0;">
        <a href="{{dashboard_url}}" style="background-color: #4f46e5; color: #ffffff; padding: 14px 32px; border-radius: 12px; text-decoration: none; font-weight: 700; font-size: 14px; display: inline-block;">
          Go to Your Dashboard →
        </a>
      </div>
      <p style="font-size: 13px; color: #64748b; line-height: 1.6;">If you have any questions, simply reply to this email or visit our <a href="{{site_url}}/contact" style="color: #4f46e5; text-decoration: underline;">help center</a>.</p>
      <hr style="border: none; border-top: 1px solid #f1f5f9; margin: 28px 0;" />
      <p style="font-size: 11px; color: #94a3b8; text-align: center; margin: 0;">&copy; {{site_name}} &bull; <a href="{{site_url}}/p/privacy-policy" style="color: #94a3b8;">Privacy Policy</a> &bull; <a href="{{site_url}}/p/terms" style="color: #94a3b8;">Terms of Service</a></p>
    </div>',
    'Welcome to {{site_name}}, {{user_name}}!\n\nYour account has been activated. You can now explore evidence-based personality tests and review your results.\n\nGo to Dashboard: {{dashboard_url}}\n\nBest regards,\nThe {{site_name}} Team',
    'active',
    '["user_name", "site_name", "site_url", "dashboard_url"]'
);

-- 2. Account: Email Verification
INSERT OR IGNORE INTO email_templates (id, event_key, name, subject, html_body, text_body, status, allowed_variables)
VALUES (
    'tmpl_email_verification',
    'email_verification',
    'Email Verification',
    'Verify your email for {{site_name}}',
    '<div style="font-family: -apple-system, BlinkMacSystemFont, ''Segoe UI'', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 32px 24px; color: #1e293b; background-color: #ffffff; border-radius: 16px; border: 1px solid #e2e8f0;">
      <div style="text-align: center; margin-bottom: 28px;">
        <h1 style="color: #4f46e5; font-size: 24px; font-weight: 800; margin: 0 0 8px;">{{site_name}}</h1>
        <p style="color: #64748b; font-size: 14px; margin: 0;">Confirm your email address</p>
      </div>
      <p style="font-size: 15px; line-height: 1.6;">Hi {{user_name}},</p>
      <p style="font-size: 15px; line-height: 1.6;">Thank you for registering. Please confirm your email address by clicking the button below to complete account verification:</p>
      <div style="text-align: center; margin: 32px 0;">
        <a href="{{verify_url}}" style="background-color: #4f46e5; color: #ffffff; padding: 14px 32px; border-radius: 12px; text-decoration: none; font-weight: 700; font-size: 14px; display: inline-block;">
          Verify Email Address →
        </a>
      </div>
      <p style="font-size: 13px; color: #64748b; line-height: 1.6;">This verification link will expire in 24 hours. If you did not create an account on {{site_name}}, please disregard this message.</p>
      <hr style="border: none; border-top: 1px solid #f1f5f9; margin: 28px 0;" />
      <p style="font-size: 11px; color: #94a3b8; text-align: center; margin: 0;">&copy; {{site_name}} &bull; {{site_url}}</p>
    </div>',
    'Hi {{user_name}},\n\nPlease verify your email for {{site_name}} by visiting:\n{{verify_url}}\n\nThis link expires in 24 hours.\n\nThe {{site_name}} Team',
    'active',
    '["user_name", "verify_url", "site_name", "site_url"]'
);

-- 3. Account: Password Reset
INSERT OR IGNORE INTO email_templates (id, event_key, name, subject, html_body, text_body, status, allowed_variables)
VALUES (
    'tmpl_password_reset',
    'password_reset',
    'Password Reset Request',
    'Reset your password on {{site_name}}',
    '<div style="font-family: -apple-system, BlinkMacSystemFont, ''Segoe UI'', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 32px 24px; color: #1e293b; background-color: #ffffff; border-radius: 16px; border: 1px solid #e2e8f0;">
      <div style="text-align: center; margin-bottom: 28px;">
        <h1 style="color: #4f46e5; font-size: 24px; font-weight: 800; margin: 0 0 8px;">{{site_name}}</h1>
        <p style="color: #64748b; font-size: 14px; margin: 0;">Security Notification</p>
      </div>
      <p style="font-size: 15px; line-height: 1.6;">Hi {{user_name}},</p>
      <p style="font-size: 15px; line-height: 1.6;">We received a request to reset the password for your {{site_name}} account. Click the button below to choose a new password:</p>
      <div style="text-align: center; margin: 32px 0;">
        <a href="{{reset_url}}" style="background-color: #4f46e5; color: #ffffff; padding: 14px 32px; border-radius: 12px; text-decoration: none; font-weight: 700; font-size: 14px; display: inline-block;">
          Reset Password →
        </a>
      </div>
      <p style="font-size: 13px; color: #64748b; line-height: 1.6;">This link expires in 1 hour and can only be used once. If you did not make this request, you can safely ignore this email.</p>
      <hr style="border: none; border-top: 1px solid #f1f5f9; margin: 28px 0;" />
      <p style="font-size: 11px; color: #94a3b8; text-align: center; margin: 0;">&copy; {{site_name}} &bull; {{site_url}}</p>
    </div>',
    'Hi {{user_name}},\n\nWe received a request to reset your password on {{site_name}}.\nReset your password here: {{reset_url}}\n\nThis link expires in 1 hour.\n\nThe {{site_name}} Team',
    'active',
    '["user_name", "reset_url", "site_name", "site_url"]'
);

-- 4. Account: Password Changed
INSERT OR IGNORE INTO email_templates (id, event_key, name, subject, html_body, text_body, status, allowed_variables)
VALUES (
    'tmpl_password_changed',
    'password_changed',
    'Password Changed Notification',
    'Your {{site_name}} password was updated',
    '<div style="font-family: -apple-system, BlinkMacSystemFont, ''Segoe UI'', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 32px 24px; color: #1e293b; background-color: #ffffff; border-radius: 16px; border: 1px solid #e2e8f0;">
      <h1 style="color: #4f46e5; font-size: 20px; font-weight: 800; margin: 0 0 16px;">Password Updated</h1>
      <p style="font-size: 15px; line-height: 1.6;">Hi {{user_name}},</p>
      <p style="font-size: 15px; line-height: 1.6;">This is a confirmation that your account password on <strong>{{site_name}}</strong> was recently changed. If you performed this action, no further steps are needed.</p>
      <p style="font-size: 13px; color: #e11d48; line-height: 1.6;">If you did NOT change your password, please reset your password immediately or contact our support team.</p>
      <hr style="border: none; border-top: 1px solid #f1f5f9; margin: 28px 0;" />
      <p style="font-size: 11px; color: #94a3b8; text-align: center; margin: 0;">&copy; {{site_name}} &bull; {{site_url}}</p>
    </div>',
    'Hi {{user_name}},\n\nYour password on {{site_name}} was recently updated. If you did not perform this change, contact support immediately.\n\nThe {{site_name}} Team',
    'active',
    '["user_name", "site_name", "site_url"]'
);

-- 5. Account: Account Deleted
INSERT OR IGNORE INTO email_templates (id, event_key, name, subject, html_body, text_body, status, allowed_variables)
VALUES (
    'tmpl_account_deleted',
    'account_deleted',
    'Account Deletion Confirmation',
    'Your {{site_name}} account has been deleted',
    '<div style="font-family: -apple-system, BlinkMacSystemFont, ''Segoe UI'', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 32px 24px; color: #1e293b; background-color: #ffffff; border-radius: 16px; border: 1px solid #e2e8f0;">
      <h1 style="color: #0f172a; font-size: 20px; font-weight: 800; margin: 0 0 16px;">Account Deletion Confirmation</h1>
      <p style="font-size: 15px; line-height: 1.6;">Hi {{user_name}},</p>
      <p style="font-size: 15px; line-height: 1.6;">Your {{site_name}} account and all associated test history, snapshots, and saved records have been permanently deleted per your request.</p>
      <p style="font-size: 13px; color: #64748b; line-height: 1.6;">Thank you for using our platform. You are welcome to return anytime in the future.</p>
      <hr style="border: none; border-top: 1px solid #f1f5f9; margin: 28px 0;" />
      <p style="font-size: 11px; color: #94a3b8; text-align: center; margin: 0;">&copy; {{site_name}} &bull; {{site_url}}</p>
    </div>',
    'Hi {{user_name}},\n\nYour {{site_name}} account has been permanently deleted.\n\nThe {{site_name}} Team',
    'active',
    '["user_name", "site_name", "site_url"]'
);

-- 6. Assessment: Assessment Completed
INSERT OR IGNORE INTO email_templates (id, event_key, name, subject, html_body, text_body, status, allowed_variables)
VALUES (
    'tmpl_assessment_completed',
    'assessment_completed',
    'Assessment Completed',
    'Your results for {{assessment_name}} are ready',
    '<div style="font-family: -apple-system, BlinkMacSystemFont, ''Segoe UI'', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 32px 24px; color: #1e293b; background-color: #ffffff; border-radius: 16px; border: 1px solid #e2e8f0;">
      <div style="text-align: center; margin-bottom: 28px;">
        <h1 style="color: #4f46e5; font-size: 24px; font-weight: 800; margin: 0 0 8px;">{{site_name}}</h1>
        <p style="color: #64748b; font-size: 14px; margin: 0;">Assessment Completed</p>
      </div>
      <p style="font-size: 15px; line-height: 1.6;">Hi {{user_name}},</p>
      <p style="font-size: 15px; line-height: 1.6;">You have successfully completed the <strong>{{assessment_name}}</strong>. Your scores across all dimensions have been calculated deterministically.</p>
      <div style="text-align: center; margin: 32px 0;">
        <a href="{{result_url}}" style="background-color: #4f46e5; color: #ffffff; padding: 14px 32px; border-radius: 12px; text-decoration: none; font-weight: 700; font-size: 14px; display: inline-block;">
          View Your Full Result →
        </a>
      </div>
      <p style="font-size: 13px; color: #64748b; line-height: 1.6;">You can also review your past test history and export PDF summaries at any time from your dashboard.</p>
      <hr style="border: none; border-top: 1px solid #f1f5f9; margin: 28px 0;" />
      <p style="font-size: 11px; color: #94a3b8; text-align: center; margin: 0;">&copy; {{site_name}} &bull; {{site_url}}</p>
    </div>',
    'Hi {{user_name}},\n\nYou completed {{assessment_name}}!\nView your results: {{result_url}}\n\nThe {{site_name}} Team',
    'active',
    '["user_name", "assessment_name", "result_url", "site_name", "site_url"]'
);

-- 7. Assessment: Result Available
INSERT OR IGNORE INTO email_templates (id, event_key, name, subject, html_body, text_body, status, allowed_variables)
VALUES (
    'tmpl_result_available',
    'result_available',
    'Result Available Notification',
    'New psychometric result available on {{site_name}}',
    '<div style="font-family: -apple-system, BlinkMacSystemFont, ''Segoe UI'', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 32px 24px; color: #1e293b; background-color: #ffffff; border-radius: 16px; border: 1px solid #e2e8f0;">
      <h1 style="color: #4f46e5; font-size: 20px; font-weight: 800; margin: 0 0 16px;">Result Available</h1>
      <p style="font-size: 15px; line-height: 1.6;">Hi {{user_name}},</p>
      <p style="font-size: 15px; line-height: 1.6;">Your evaluation for <strong>{{assessment_name}}</strong> has been processed.</p>
      <div style="text-align: center; margin: 28px 0;">
        <a href="{{result_url}}" style="background-color: #4f46e5; color: #ffffff; padding: 12px 28px; border-radius: 10px; text-decoration: none; font-weight: 700; display: inline-block;">
          Open Result →
        </a>
      </div>
      <hr style="border: none; border-top: 1px solid #f1f5f9; margin: 28px 0;" />
      <p style="font-size: 11px; color: #94a3b8; text-align: center; margin: 0;">&copy; {{site_name}} &bull; {{site_url}}</p>
    </div>',
    'Hi {{user_name}},\n\nYour result for {{assessment_name}} is ready: {{result_url}}\n\nThe {{site_name}} Team',
    'active',
    '["user_name", "assessment_name", "result_url", "site_name", "site_url"]'
);

-- 8. AI: AI Report Ready
INSERT OR IGNORE INTO email_templates (id, event_key, name, subject, html_body, text_body, status, allowed_variables)
VALUES (
    'tmpl_ai_report_ready',
    'ai_report_ready',
    'AI Report Ready',
    'Your AI Deep Interpretation is ready for {{assessment_name}}',
    '<div style="font-family: -apple-system, BlinkMacSystemFont, ''Segoe UI'', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 32px 24px; color: #1e293b; background-color: #ffffff; border-radius: 16px; border: 1px solid #e2e8f0;">
      <div style="text-align: center; margin-bottom: 28px;">
        <h1 style="color: #4f46e5; font-size: 24px; font-weight: 800; margin: 0 0 8px;">{{site_name}}</h1>
        <p style="color: #64748b; font-size: 14px; margin: 0;">AI Psychometric Interpretation</p>
      </div>
      <p style="font-size: 15px; line-height: 1.6;">Hi {{user_name}},</p>
      <p style="font-size: 15px; line-height: 1.6;">Your detailed, personalized AI psychological report for <strong>{{assessment_name}}</strong> has finished synthesizing. It contains deep trait analysis, cognitive strengths, growth recommendations, and relationship dynamics.</p>
      <div style="text-align: center; margin: 32px 0;">
        <a href="{{report_url}}" style="background-color: #4f46e5; color: #ffffff; padding: 14px 32px; border-radius: 12px; text-decoration: none; font-weight: 700; font-size: 14px; display: inline-block;">
          Read Your AI Report →
        </a>
      </div>
      <p style="font-size: 13px; color: #64748b; line-height: 1.6;">Your report has been saved securely to your account for future reference.</p>
      <hr style="border: none; border-top: 1px solid #f1f5f9; margin: 28px 0;" />
      <p style="font-size: 11px; color: #94a3b8; text-align: center; margin: 0;">&copy; {{site_name}} &bull; {{site_url}}</p>
    </div>',
    'Hi {{user_name}},\n\nYour AI psychological interpretation for {{assessment_name}} is ready.\nRead report: {{report_url}}\n\nThe {{site_name}} Team',
    'active',
    '["user_name", "assessment_name", "report_url", "site_name", "site_url"]'
);

-- 9. AI: AI Report Failed
INSERT OR IGNORE INTO email_templates (id, event_key, name, subject, html_body, text_body, status, allowed_variables)
VALUES (
    'tmpl_ai_report_failed',
    'ai_report_failed',
    'AI Report Generation Failed',
    'AI Report synthesis notice for {{assessment_name}}',
    '<div style="font-family: -apple-system, BlinkMacSystemFont, ''Segoe UI'', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 32px 24px; color: #1e293b; background-color: #ffffff; border-radius: 16px; border: 1px solid #e2e8f0;">
      <h1 style="color: #e11d48; font-size: 20px; font-weight: 800; margin: 0 0 16px;">AI Generation Status</h1>
      <p style="font-size: 15px; line-height: 1.6;">Hi {{user_name}},</p>
      <p style="font-size: 15px; line-height: 1.6;">We experienced an unexpected issue generating your AI interpretation for <strong>{{assessment_name}}</strong>. Any spent credits have been automatically returned to your balance.</p>
      <div style="text-align: center; margin: 28px 0;">
        <a href="{{dashboard_url}}" style="background-color: #4f46e5; color: #ffffff; padding: 12px 28px; border-radius: 10px; text-decoration: none; font-weight: 700; display: inline-block;">
          Go to Dashboard →
        </a>
      </div>
      <hr style="border: none; border-top: 1px solid #f1f5f9; margin: 28px 0;" />
      <p style="font-size: 11px; color: #94a3b8; text-align: center; margin: 0;">&copy; {{site_name}} &bull; {{site_url}}</p>
    </div>',
    'Hi {{user_name}},\n\nAI generation for {{assessment_name}} failed. Credits refunded.\n\nThe {{site_name}} Team',
    'active',
    '["user_name", "assessment_name", "dashboard_url", "site_name", "site_url"]'
);

-- 10. Billing: Subscription Started
INSERT OR IGNORE INTO email_templates (id, event_key, name, subject, html_body, text_body, status, allowed_variables)
VALUES (
    'tmpl_sub_started',
    'subscription_started',
    'Subscription Activated',
    'Welcome to {{plan_name}} on {{site_name}}!',
    '<div style="font-family: -apple-system, BlinkMacSystemFont, ''Segoe UI'', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 32px 24px; color: #1e293b; background-color: #ffffff; border-radius: 16px; border: 1px solid #e2e8f0;">
      <div style="text-align: center; margin-bottom: 28px;">
        <h1 style="color: #4f46e5; font-size: 24px; font-weight: 800; margin: 0 0 8px;">{{site_name}}</h1>
        <p style="color: #64748b; font-size: 14px; margin: 0;">Subscription Confirmation</p>
      </div>
      <p style="font-size: 15px; line-height: 1.6;">Hi {{user_name}},</p>
      <p style="font-size: 15px; line-height: 1.6;">Thank you for subscribing to <strong>{{plan_name}}</strong>! Your Pro entitlements, unlimited assessments, AI reports, and PDF exports are now active.</p>
      <div style="text-align: center; margin: 32px 0;">
        <a href="{{dashboard_url}}" style="background-color: #4f46e5; color: #ffffff; padding: 14px 32px; border-radius: 12px; text-decoration: none; font-weight: 700; font-size: 14px; display: inline-block;">
          Open Member Dashboard →
        </a>
      </div>
      <p style="font-size: 13px; color: #64748b; line-height: 1.6;">Manage your billing or subscription preferences anytime from your account settings.</p>
      <hr style="border: none; border-top: 1px solid #f1f5f9; margin: 28px 0;" />
      <p style="font-size: 11px; color: #94a3b8; text-align: center; margin: 0;">&copy; {{site_name}} &bull; {{site_url}}</p>
    </div>',
    'Hi {{user_name}},\n\nThank you for subscribing to {{plan_name}} on {{site_name}}!\nOpen Dashboard: {{dashboard_url}}\n\nThe {{site_name}} Team',
    'active',
    '["user_name", "plan_name", "dashboard_url", "site_name", "site_url"]'
);

-- 11. Billing: Subscription Cancelled
INSERT OR IGNORE INTO email_templates (id, event_key, name, subject, html_body, text_body, status, allowed_variables)
VALUES (
    'tmpl_sub_cancelled',
    'subscription_cancelled',
    'Subscription Cancellation Notice',
    'Your {{site_name}} subscription cancellation confirmation',
    '<div style="font-family: -apple-system, BlinkMacSystemFont, ''Segoe UI'', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 32px 24px; color: #1e293b; background-color: #ffffff; border-radius: 16px; border: 1px solid #e2e8f0;">
      <h1 style="color: #0f172a; font-size: 20px; font-weight: 800; margin: 0 0 16px;">Subscription Cancellation</h1>
      <p style="font-size: 15px; line-height: 1.6;">Hi {{user_name}},</p>
      <p style="font-size: 15px; line-height: 1.6;">Your subscription cancellation has been recorded. Your Pro features will remain available until the end of your current billing period.</p>
      <hr style="border: none; border-top: 1px solid #f1f5f9; margin: 28px 0;" />
      <p style="font-size: 11px; color: #94a3b8; text-align: center; margin: 0;">&copy; {{site_name}} &bull; {{site_url}}</p>
    </div>',
    'Hi {{user_name}},\n\nYour subscription cancellation has been recorded.\n\nThe {{site_name}} Team',
    'active',
    '["user_name", "site_name", "site_url"]'
);

-- 12. Billing: Subscription Expired
INSERT OR IGNORE INTO email_templates (id, event_key, name, subject, html_body, text_body, status, allowed_variables)
VALUES (
    'tmpl_sub_expired',
    'subscription_expired',
    'Subscription Expired',
    'Your {{site_name}} Pro subscription has expired',
    '<div style="font-family: -apple-system, BlinkMacSystemFont, ''Segoe UI'', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 32px 24px; color: #1e293b; background-color: #ffffff; border-radius: 16px; border: 1px solid #e2e8f0;">
      <h1 style="color: #0f172a; font-size: 20px; font-weight: 800; margin: 0 0 16px;">Subscription Expired</h1>
      <p style="font-size: 15px; line-height: 1.6;">Hi {{user_name}},</p>
      <p style="font-size: 15px; line-height: 1.6;">Your Pro subscription has reached the end of its billing cycle. Your account is now on the Free Explorer tier.</p>
      <hr style="border: none; border-top: 1px solid #f1f5f9; margin: 28px 0;" />
      <p style="font-size: 11px; color: #94a3b8; text-align: center; margin: 0;">&copy; {{site_name}} &bull; {{site_url}}</p>
    </div>',
    'Hi {{user_name}},\n\nYour subscription has expired.\n\nThe {{site_name}} Team',
    'active',
    '["user_name", "site_name", "site_url"]'
);

-- 13. Billing: Payment Success
INSERT OR IGNORE INTO email_templates (id, event_key, name, subject, html_body, text_body, status, allowed_variables)
VALUES (
    'tmpl_payment_success',
    'payment_success',
    'Payment Receipt',
    'Payment Receipt for {{site_name}}',
    '<div style="font-family: -apple-system, BlinkMacSystemFont, ''Segoe UI'', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 32px 24px; color: #1e293b; background-color: #ffffff; border-radius: 16px; border: 1px solid #e2e8f0;">
      <h1 style="color: #10b981; font-size: 20px; font-weight: 800; margin: 0 0 16px;">Payment Successful</h1>
      <p style="font-size: 15px; line-height: 1.6;">Hi {{user_name}},</p>
      <p style="font-size: 15px; line-height: 1.6;">Your payment for {{site_name}} has been processed successfully. Thank you for your continued membership.</p>
      <hr style="border: none; border-top: 1px solid #f1f5f9; margin: 28px 0;" />
      <p style="font-size: 11px; color: #94a3b8; text-align: center; margin: 0;">&copy; {{site_name}} &bull; {{site_url}}</p>
    </div>',
    'Hi {{user_name}},\n\nYour payment on {{site_name}} was successful.\n\nThe {{site_name}} Team',
    'active',
    '["user_name", "site_name", "site_url"]'
);

-- 14. Billing: Payment Failed
INSERT OR IGNORE INTO email_templates (id, event_key, name, subject, html_body, text_body, status, allowed_variables)
VALUES (
    'tmpl_payment_failed',
    'payment_failed',
    'Payment Failed Notification',
    'Action Required: Payment failed for {{site_name}}',
    '<div style="font-family: -apple-system, BlinkMacSystemFont, ''Segoe UI'', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 32px 24px; color: #1e293b; background-color: #ffffff; border-radius: 16px; border: 1px solid #e2e8f0;">
      <div style="text-align: center; margin-bottom: 28px;">
        <h1 style="color: #e11d48; font-size: 24px; font-weight: 800; margin: 0 0 8px;">{{site_name}}</h1>
        <p style="color: #64748b; font-size: 14px; margin: 0;">Billing Notice</p>
      </div>
      <p style="font-size: 15px; line-height: 1.6;">Hi {{user_name}},</p>
      <p style="font-size: 15px; line-height: 1.6;">We were unable to process your recent subscription payment for {{site_name}}. Please update your payment method to ensure uninterrupted access to your Pro features:</p>
      <div style="text-align: center; margin: 32px 0;">
        <a href="{{billing_url}}" style="background-color: #e11d48; color: #ffffff; padding: 14px 32px; border-radius: 12px; text-decoration: none; font-weight: 700; font-size: 14px; display: inline-block;">
          Update Payment Details →
        </a>
      </div>
      <p style="font-size: 13px; color: #64748b; line-height: 1.6;">If you have any questions regarding your billing, please contact our support team.</p>
      <hr style="border: none; border-top: 1px solid #f1f5f9; margin: 28px 0;" />
      <p style="font-size: 11px; color: #94a3b8; text-align: center; margin: 0;">&copy; {{site_name}} &bull; {{site_url}}</p>
    </div>',
    'Hi {{user_name}},\n\nWe could not process your recent payment for {{site_name}}.\nPlease update your payment details at: {{billing_url}}\n\nThe {{site_name}} Team',
    'active',
    '["user_name", "billing_url", "site_name", "site_url"]'
);

-- 15. System: Contact Form Received
INSERT OR IGNORE INTO email_templates (id, event_key, name, subject, html_body, text_body, status, allowed_variables)
VALUES (
    'tmpl_contact_received',
    'contact_form_received',
    'Contact Form Received',
    'We received your inquiry: {{subject}}',
    '<div style="font-family: -apple-system, BlinkMacSystemFont, ''Segoe UI'', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 32px 24px; color: #1e293b; background-color: #ffffff; border-radius: 16px; border: 1px solid #e2e8f0;">
      <div style="text-align: center; margin-bottom: 28px;">
        <h1 style="color: #4f46e5; font-size: 24px; font-weight: 800; margin: 0 0 8px;">{{site_name}}</h1>
        <p style="color: #64748b; font-size: 14px; margin: 0;">Inquiry Confirmation</p>
      </div>
      <p style="font-size: 15px; line-height: 1.6;">Hi {{user_name}},</p>
      <p style="font-size: 15px; line-height: 1.6;">Thank you for contacting {{site_name}}. We have received your message regarding <strong>"{{subject}}"</strong>. Our support team will review your inquiry and get back to you shortly.</p>
      <div style="background-color: #f8fafc; padding: 16px; border-radius: 12px; border: 1px solid #e2e8f0; margin: 24px 0; font-size: 13px; color: #475569;">
        <strong>Your Message:</strong><br />
        {{message_preview}}
      </div>
      <p style="font-size: 13px; color: #64748b; line-height: 1.6;">For immediate self-help, please feel free to browse our <a href="{{site_url}}/blog" style="color: #4f46e5; text-decoration: underline;">Psychology Blog & Guides</a>.</p>
      <hr style="border: none; border-top: 1px solid #f1f5f9; margin: 28px 0;" />
      <p style="font-size: 11px; color: #94a3b8; text-align: center; margin: 0;">&copy; {{site_name}} &bull; {{site_url}}</p>
    </div>',
    'Hi {{user_name}},\n\nWe received your inquiry regarding "{{subject}}". Our team will respond shortly.\n\nYour message:\n{{message_preview}}\n\nThe {{site_name}} Team',
    'active',
    '["user_name", "subject", "message_preview", "site_name", "site_url"]'
);
