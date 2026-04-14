-- Idempotent: only create if not exists
SELECT 'CREATE DATABASE taskapp_dev'
WHERE NOT EXISTS (
  SELECT FROM pg_database WHERE datname = 'taskapp_dev'
)\gexec
