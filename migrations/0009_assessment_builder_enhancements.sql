-- Migration 0009: Assessment Builder Enhancements
-- Adds dynamic settings JSON and completion message to assessments table
-- Cloudflare D1 (SQLite)

ALTER TABLE assessments ADD COLUMN completion_message TEXT;
ALTER TABLE assessments ADD COLUMN settings TEXT DEFAULT '{"allowGuestAttempts":true,"requireLogin":false,"showProgress":true,"showQuestionNumbers":true,"randomizeQuestions":false}';
