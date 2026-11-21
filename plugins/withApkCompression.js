import { AndroidConfig, withGradleProperties } from 'expo/config-plugins';

export default (config) => withGradleProperties(config, (config) => {
  const { updateAndroidBuildProperty } = AndroidConfig.BuildProperties;
  updateAndroidBuildProperty(config.modResults, 'expo.useLegacyPackaging', 'true');
  updateAndroidBuildProperty(config.modResults, 'android.enableBundleCompression', 'true');
  return config;
});
