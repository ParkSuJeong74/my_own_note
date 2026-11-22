type Channel='microsoftStore'|'homebrew'|'googlePlay'|'testFlight';

const allowedHosts:Record<Channel,Set<string>>={
 microsoftStore:new Set(['apps.microsoft.com']),
 homebrew:new Set(['formulae.brew.sh','brew.sh']),
 googlePlay:new Set(['play.google.com']),
 testFlight:new Set(['testflight.apple.com']),
};

export function safeChannelUrl(channel:Channel,value:string|undefined):string|null{
 if(!value)return null;
 try{
  const url=new URL(value);
  if(url.protocol!=='https:'||url.username||url.password)return null;
  if(channel==='homebrew'&&url.origin==='https://github.com'){
   const guide='/ParkSuJeong74/my_own_note/tree/master/easyopen/packaging/homebrew';
   if(url.pathname===guide&&!url.search&&!url.hash)return url.toString();
  }
  return allowedHosts[channel].has(url.hostname)?url.toString():null;
 }catch{return null}
}

export const homebrewTestGuide='https://github.com/ParkSuJeong74/my_own_note/tree/master/easyopen/packaging/homebrew';

export const distributionChannels={
 testFlight:safeChannelUrl('testFlight',process.env.NEXT_PUBLIC_TESTFLIGHT_URL),
 microsoftStore:safeChannelUrl('microsoftStore',process.env.NEXT_PUBLIC_MICROSOFT_STORE_URL),
 homebrew:safeChannelUrl('homebrew',process.env.NEXT_PUBLIC_HOMEBREW_CASK_URL),
 googlePlayInternalTest:safeChannelUrl('googlePlay','https://play.google.com/apps/internaltest/4698833277876949735'),
 googlePlay:safeChannelUrl('googlePlay',process.env.NEXT_PUBLIC_GOOGLE_PLAY_URL),
};
