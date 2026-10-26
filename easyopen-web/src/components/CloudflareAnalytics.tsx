import Script from 'next/script';

const token=process.env.NEXT_PUBLIC_CLOUDFLARE_WEB_ANALYTICS_TOKEN?.trim();

export function CloudflareAnalytics(){
 if(!token)return null;
 return <Script id="cloudflare-web-analytics" strategy="afterInteractive" src="https://static.cloudflareinsights.com/beacon.min.js" data-cf-beacon={JSON.stringify({token})}/>;
}
