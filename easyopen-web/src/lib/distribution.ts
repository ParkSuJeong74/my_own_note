type Channel='microsoftStore'|'homebrew'|'googlePlay'|'testFlight';

const allowedHosts:Record<Channel,Set<string>>={
 microsoftStore:new Set(['apps.microsoft.com']),
 homebrew:new Set(['formulae.brew.sh','brew.sh']),
 googlePlay:new Set(['play.google.com']),
 testFlight:new Set(['testflight.apple.com']),
};

export function safeChannelUrl(channel:Channel,value:string|undefined):string|null{
 if(!value)return null;
 try{const url=new URL(value);return url.protocol==='https:'&&allowedHosts[channel].has(url.hostname)?url.toString():null}catch{return null}
}

export const distributionChannels={
 microsoftStore:safeChannelUrl('microsoftStore',process.env.NEXT_PUBLIC_MICROSOFT_STORE_URL),
 homebrew:safeChannelUrl('homebrew',process.env.NEXT_PUBLIC_HOMEBREW_CASK_URL),
 googlePlay:safeChannelUrl('googlePlay',process.env.NEXT_PUBLIC_GOOGLE_PLAY_URL),
 testFlight:safeChannelUrl('testFlight',process.env.NEXT_PUBLIC_TESTFLIGHT_URL),
};
