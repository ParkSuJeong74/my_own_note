import type {NextConfig} from 'next';
const backend=process.env.EASYOPEN_BACKEND_ORIGIN||'http://127.0.0.1:3001';
const parsed=new URL(backend);
if(!['http:','https:'].includes(parsed.protocol)||parsed.username||parsed.password||parsed.pathname!=='/'||parsed.search||parsed.hash)throw new Error('Invalid internal backend origin');
const config:NextConfig={output:'standalone',poweredByHeader:false,async rewrites(){return {beforeFiles:[...['/v1/:path*','/api/health','/workspace/connect/approve','/workspace/logout','/admin/logout'].map(source=>({source,destination:parsed.origin+source}))]};}};
export default config;
