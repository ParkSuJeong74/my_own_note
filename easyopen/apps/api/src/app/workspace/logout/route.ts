import {NextRequest, NextResponse} from 'next/server';
import {loadConfig} from '@/lib/config';
import {SESSION_COOKIE} from '@/lib/session';
export async function POST(request: NextRequest) {
  const {apiOrigin} = loadConfig();
  if (request.headers.get('origin') !== apiOrigin) {
    return NextResponse.json({error: 'invalid_origin'}, {status: 403});
  }
  const response = NextResponse.redirect(new URL('/workspace', apiOrigin), 303);
  response.cookies.delete(SESSION_COOKIE);
  return response;
}
