import { defineConfig } from 'prisma/config';
// Client generation/validation only. No dotenv or database URL.
export default defineConfig({schema:'./schema.prisma'});
