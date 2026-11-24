const {expo} = require('./app.json');
// Set only after registering the Expo project. No account or token is bundled.
module.exports = () => {
  const id = process.env.EASYOPEN_EAS_PROJECT_ID;
  if (id && !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)) {
    throw new Error('EASYOPEN_EAS_PROJECT_ID must be an Expo project UUID');
  }
  return {...expo, runtimeVersion:{policy:'fingerprint'},
    updates:id ? {enabled:true,url:`https://u.expo.dev/${id}`,checkAutomatically:'NEVER',requestHeaders:{'expo-channel-name':'production'}} : {enabled:false},
    extra:{...expo.extra,...(id?{eas:{projectId:id}}:{})}};
};
