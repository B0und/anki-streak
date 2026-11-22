import { AndroidConfig, withGradleProperties, type ConfigPlugin } from 'expo/config-plugins';

const withApkCompression: ConfigPlugin = (config) => withGradleProperties(config, (config) => {
  const { updateAndroidBuildProperty } = AndroidConfig.BuildProperties;
  updateAndroidBuildProperty(config.modResults, 'expo.useLegacyPackaging', 'true');
  updateAndroidBuildProperty(config.modResults, 'android.enableBundleCompression', 'true');
  return config;
});

export default withApkCompression;
