import { config } from 'dotenv';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));

// Load .env from monorepo root before any other module reads process.env
config({ path: resolve(__dirname, '../../../.env') });
