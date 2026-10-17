import postgres from 'postgres';
import { env } from '../env.js';
import { HttpError } from './users.js';

// A separate connection owns the session lock. Ordinary queries keep using the main pool,
// so waiting approvals cannot reserve all of its connections. One approval per worker at a time.
const locks = postgres(env.DATABASE_URL, { ssl: 'require', max: 1 });
export async function withApprovalLock<T>(userId: string, work: () => Promise<T>): Promise<T> {
  const connection = await locks.reserve();
  let acquired = false;
  try {
    const [row] = await connection`select pg_try_advisory_lock(hashtext(${userId})) as locked`;
    acquired = !!row?.locked;
    if (!acquired) throw new HttpError(409, 'approval_in_progress', 'Another approval is finishing. Please try again in a moment.');
    return await work();
  } finally {
    try { if (acquired) await connection`select pg_advisory_unlock(hashtext(${userId}))`; }
    finally { connection.release(); }
  }
}
