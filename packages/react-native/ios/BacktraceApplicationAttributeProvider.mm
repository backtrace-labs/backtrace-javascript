#import "BacktraceApplicationAttributeProvider.h"

@implementation BacktraceApplicationAttributeProvider
    RCT_EXPORT_MODULE()
    RCT_EXPORT_BLOCKING_SYNCHRONOUS_METHOD(readApplicationName) {
        NSString *displayName = [[NSBundle mainBundle] objectForInfoDictionaryKey:@"CFBundleDisplayName"];
        NSString *bundleName = [[NSBundle mainBundle] objectForInfoDictionaryKey:@"CFBundleName"];
        return displayName ? displayName : bundleName;
    }


    RCT_EXPORT_BLOCKING_SYNCHRONOUS_METHOD(readApplicationVersion) {
        return [[NSBundle mainBundle] objectForInfoDictionaryKey:@"CFBundleShortVersionString"];
    }

@end
