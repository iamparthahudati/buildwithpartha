-- LifeOS schema changes are forward-only and owned by Flyway.
-- pgcrypto is the only extension required by the initial database contract.
CREATE EXTENSION IF NOT EXISTS pgcrypto WITH SCHEMA public;

COMMENT ON EXTENSION pgcrypto IS
  'Cryptographic primitives available to approved LifeOS database migrations.';
