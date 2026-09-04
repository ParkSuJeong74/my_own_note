import { NextResponse } from "next/server";
import { ingestBlogNeighbors, type CollectedBlogNeighbor } from "@/lib/blog-discovery";
import { blogIngestAuthorized } from "@/lib/internal-auth";

const cors={"access-control-allow-origin":"*","access-control-allow-headers":"authorization,content-type","access-control-allow-methods":"POST,OPTIONS"};
export function OPTIONS(){return new NextResponse(null,{status:204,headers:cors});}
export async function POST(request:Request){
  if(!blogIngestAuthorized(request))return NextResponse.json({error:"unauthorized"},{status:401,headers:cors});
  const body=await request.json().catch(()=>null) as {neighbors?:CollectedBlogNeighbor[];completeSnapshot?:boolean}|null;
  if(!Array.isArray(body?.neighbors))return NextResponse.json({error:"neighbors_required"},{status:400,headers:cors});
  return NextResponse.json(await ingestBlogNeighbors(body.neighbors,body.completeSnapshot===true),{headers:cors});
}
