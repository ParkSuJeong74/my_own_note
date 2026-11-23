import {NextRequest,NextResponse} from 'next/server';
import {exchangeDeviceCode} from '@/lib/device-repository';
import {validDeviceToken} from '@/lib/device-auth';
export async function POST(request:NextRequest){
  try{
    const body=await request.json();
    if(!validDeviceToken(body?.deviceCode))return NextResponse.json({error:'invalid_device_code'},{status:400});
    const result=await exchangeDeviceCode(body.deviceCode);
    return NextResponse.json(result,{status:'token' in result?200:result.error==='slow_down'?429:400,headers:{'cache-control':'no-store'}});
  }catch{return NextResponse.json({error:'device_auth_unavailable'},{status:503});}
}
