-- ─── PostgreSQL Initialization ───────────────────────────────────────────────
-- Runs once when the Docker postgres container is first created.
-- Prisma migrations handle schema — this just sets extensions and locale.

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_stat_statements";

-- Optimize for OLTP (clinical workflow is read-heavy with frequent small writes)
ALTER SYSTEM SET random_page_cost = 1.1;        -- SSD assumed
ALTER SYSTEM SET effective_io_concurrency = 200; -- SSD async I/O

SELECT pg_reload_conf();
