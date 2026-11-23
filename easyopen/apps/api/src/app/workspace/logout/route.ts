import {NextRequest, NextResponse} from 'next/server';
import {SESSION_COOKIE} from '@/lib/session';
export async function POST(request: NextRequest) {
  if (request.headers.get('origin') !== request.nextUrl.origin) {
    return NextResponse.json({error: 'invalid_origin'}, {status: 403});
  }
  const response = NextResponse.redirect(new URL('/workspace', request.url), 303);
  response.cookies.delete(SESSION_COOKIE);
  return response;
}
