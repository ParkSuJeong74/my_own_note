import { NextResponse } from "next/server";
import { ingestBlogGrowth } from "@/lib/blog-discovery";
import { blogIngestAuthorized } from "@/lib/internal-auth";
import { optionalGrowthMetric } from "@/lib/blog-rules";

const cors={"access-control-allow-origin":"*","access-control-allow-headers":"authorization,content-type","access-control-allow-methods":"POST,OPTIONS"};
export function OPTIONS(){return new NextResponse(null,{status:204,headers:cors});}
export async function POST(request:Request){
  if(!blogIngestAuthorized(request))return NextResponse.json({error:"unauthorized"},{status:401,headers:cors});
  const body=await request.json().catch(()=>null) as Record<string,unknown>|null;
  if(!body||typeof body.measuredOn!=="string")return NextResponse.json({error:"growth_required"},{status:400,headers:cors});
  const source:"STATISTICS"|"BLOG_HOME"|"UNKNOWN"=body.source==="STATISTICS"?"STATISTICS":body.source==="BLOG_HOME"?"BLOG_HOME":"UNKNOWN",values={measuredOn:body.measuredOn,visitors:optionalGrowthMetric(body.visitors),views:optionalGrowthMetric(body.views),posts:optionalGrowthMetric(body.posts),source};
  if(["visitors","views","posts"].some(key=>body[key]!=null&&values[key as keyof typeof values]===null))return NextResponse.json({error:"invalid_metric"},{status:400,headers:cors});
  const saved=await ingestBlogGrowth(values);return NextResponse.json({saved});
}
