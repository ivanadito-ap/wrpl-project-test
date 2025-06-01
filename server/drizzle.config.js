import 'dotenv/config';
import { defineConfig } from 'drizzle-kit';
export default defineConfig({
    out: './drizzle',
    schema: './db/schema.ts',
    dialect: 'postgresql',
    dbCredentials: {
        url: "postgresql://wrpl-db_owner:npg_KH1Vyfn3GXjp@ep-sparkling-mud-a8u4ru91-pooler.eastus2.azure.neon.tech/wrpl-db?sslmode=require",
    },
});
