import { NextResponse } from "next/server";
import { saveBlogSearchTags } from "@/lib/blog-discovery";
import { blogIngestAuthorized } from "@/lib/internal-auth";

const cors={"access-control-allow-origin":"*","access-control-allow-headers":"authorization,content-type","access-control-allow-methods":"POST,OPTIONS"};
export function OPTIONS(){return new NextResponse(null,{status:204,headers:cors});}
export async function POST(request:Request){
  if(!blogIngestAuthorized(request))return NextResponse.json({error:"unauthorized"},{status:401,headers:cors});
  const body=await request.json().catch(()=>null) as {tags?:unknown[]}|null;
  if(!Array.isArray(body?.tags))return NextResponse.json({error:"tags_required"},{status:400,headers:cors});
  return NextResponse.json(await saveBlogSearchTags(body.tags),{headers:cors});
}
