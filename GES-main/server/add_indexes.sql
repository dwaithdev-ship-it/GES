-- Add indexes to improve performance for user-specific queries
CREATE INDEX IF NOT EXISTS idx_user_education_user_id ON ges_schema.user_education(user_id);
CREATE INDEX IF NOT EXISTS idx_user_work_experience_user_id ON ges_schema.user_work_experience(user_id);
CREATE INDEX IF NOT EXISTS idx_user_skills_user_id ON ges_schema.user_skills(user_id);
CREATE INDEX IF NOT EXISTS idx_user_tests_user_id ON ges_schema.user_tests(user_id);
CREATE INDEX IF NOT EXISTS idx_user_languages_user_id ON ges_schema.user_languages(user_id);
CREATE INDEX IF NOT EXISTS idx_user_visa_history_user_id ON ges_schema.user_visa_history(user_id);
CREATE INDEX IF NOT EXISTS idx_saved_jobs_user_id ON ges_schema.saved_jobs(user_id);
CREATE INDEX IF NOT EXISTS idx_applications_user_id ON ges_schema.applications(user_id);
CREATE INDEX IF NOT EXISTS idx_job_search_logs_user_id ON ges_schema.job_search_logs(user_id);
