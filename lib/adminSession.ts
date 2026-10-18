import { cookies } from 'next/headers';
import { ADMIN_COOKIE, verifyAdminSession } from './adminAuth';

export async function readAdminSession(): Promise<boolean> {
  const jar = await cookies();
  const token = jar.get(ADMIN_COOKIE)?.value;
  return Boolean(token && verifyAdminSession(token));
}
