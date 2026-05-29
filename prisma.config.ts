import 'dotenv/config';
import { defineConfig, env } from 'prisma/config';

// The application connects through the `pg` driver adapter at runtime
// (see src/lib/prisma.ts), so the datasource block in schema.prisma has no
// `url`. Prisma 7 CLI commands that touch the database directly — `migrate`,
// `db push`, introspection — need the connection string here instead.
//
// Use DIRECT_URL (port 5432, direct connection) rather than DATABASE_URL,
// which points at the Supabase transaction pooler — migrations require a
// direct, session-level connection, not the pgBouncer pooler.
export default defineConfig({
    schema: 'prisma/schema.prisma',
    migrations: {
        path: 'prisma/migrations',
    },
    datasource: {
        url: env('DIRECT_URL'),
    },
});
