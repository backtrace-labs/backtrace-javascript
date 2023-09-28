import { Platform } from 'react-native';

export function version(): string {
    const version = Platform.constants.reactNativeVersion;
    return `${version.major}.${version.minor}.${version.patch}${version?.prerelease ? `.${version.prerelease}` : ''}`;
}
