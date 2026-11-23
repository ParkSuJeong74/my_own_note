import {NextRequest,NextResponse} from 'next/server';
import {startDeviceRequest} from '@/lib/device-repository';
export async function POST(request:NextRequest){
  try{
    const body=await request.json();
    if(!['desktop','android','ios'].includes(body?.platform))return NextResponse.json({error:'invalid_platform'},{status:400});
    const result=await startDeviceRequest(body.platform);
    return NextResponse.json(result??{error:'temporarily_unavailable'},{status:result?200:429,headers:{'cache-control':'no-store'}});
  }catch{return NextResponse.json({error:'device_auth_unavailable'},{status:503});}
}
