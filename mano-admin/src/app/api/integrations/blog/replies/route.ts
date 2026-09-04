import { NextResponse } from "next/server";
import { ingestBlogReplies, type CollectedBlogReply } from "@/lib/blog-discovery";
import { blogIngestAuthorized } from "@/lib/internal-auth";

const cors={"access-control-allow-origin":"*","access-control-allow-headers":"authorization,content-type","access-control-allow-methods":"POST,OPTIONS"};
export function OPTIONS(){return new NextResponse(null,{status:204,headers:cors});}
export async function POST(request:Request){
  if(!blogIngestAuthorized(request))return NextResponse.json({error:"unauthorized"},{status:401,headers:cors});
  const body=await request.json().catch(()=>null) as {comments?:CollectedBlogReply[];repliedComments?:CollectedBlogReply[]}|null;
  if(!Array.isArray(body?.comments))return NextResponse.json({error:"comments_required"},{status:400,headers:cors});
  return NextResponse.json(await ingestBlogReplies(body.comments,Array.isArray(body.repliedComments)?body.repliedComments:[]),{headers:cors});
}
