-- Migration: 0020_production_hardening_and_indexes.sql
-- Description: Production database hardening, centralized error telemetry, and performance indexes

-- 1. Centralized System Error Logging Table
CREATE TABLE IF NOT EXISTS system_error_logs (
    id TEXT PRIMARY KEY,
    service TEXT NOT NULL,
    error_type TEXT NOT NULL,
    message TEXT NOT NULL,
    context TEXT, -- JSON sanitized metadata (Secrets strictly omitted/masked)
    user_id TEXT,
    request_id TEXT,
    path TEXT,
    ip_address TEXT,
    user_agent TEXT,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_system_error_logs_service_created ON system_error_logs(service, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_system_error_logs_created ON system_error_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_system_error_logs_user ON system_error_logs(user_id, created_at DESC);

-- 2. Performance & Query Optimization Indexes
-- Users Table
CREATE INDEX IF NOT EXISTS idx_users_status_created ON users(status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_users_role_status ON users(role, status);

-- Assessment Attempts Table
CREATE INDEX IF NOT EXISTS idx_assessment_attempts_user_status ON assessment_attempts(user_id, status);
CREATE INDEX IF NOT EXISTS idx_assessment_attempts_guest_status ON assessment_attempts(session_id, status);
CREATE INDEX IF NOT EXISTS idx_assessment_attempts_asm_status ON assessment_attempts(assessment_id, status);

-- Assessment Answers Table
CREATE INDEX IF NOT EXISTS idx_assessment_answers_attempt_q ON assessment_answers(attempt_id, question_id);

-- Assessment Result Snapshots Table
CREATE INDEX IF NOT EXISTS idx_result_snapshots_attempt_id ON result_snapshots(attempt_id);
CREATE INDEX IF NOT EXISTS idx_result_snapshots_share_token ON result_snapshots(share_token);
CREATE INDEX IF NOT EXISTS idx_result_snapshots_assessment_created ON result_snapshots(assessment_id, created_at DESC);

-- AI Generations Table
CREATE INDEX IF NOT EXISTS idx_ai_generations_user_status ON ai_generations(user_id, status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_ai_generations_attempt ON ai_generations(attempt_id);

-- Generated Files Table
CREATE INDEX IF NOT EXISTS idx_generated_files_attempt ON generated_files(attempt_id);
CREATE INDEX IF NOT EXISTS idx_generated_files_user ON generated_files(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_generated_files_type ON generated_files(file_type, created_at DESC);

-- Subscriptions & Billing Table
CREATE INDEX IF NOT EXISTS idx_subscriptions_user_status ON subscriptions(user_id, status);
CREATE INDEX IF NOT EXISTS idx_payments_user_status ON payments(user_id, status, created_at DESC);

-- Analytics & Audit Logs
CREATE INDEX IF NOT EXISTS idx_analytics_events_name_date ON analytics_events(event_name, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_analytics_events_user ON analytics_events(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_logs_actor_date ON audit_logs(actor_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_logs_action_date ON audit_logs(action, created_at DESC);

-- Legal Pages Table
CREATE INDEX IF NOT EXISTS idx_legal_pages_slug_pub ON legal_pages(slug, is_published);
