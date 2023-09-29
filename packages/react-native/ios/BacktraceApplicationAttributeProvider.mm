#import "BacktraceApplicationAttributeProvider.h"

@implementation BacktraceApplicationAttributeProvider
RCT_EXPORT_MODULE()
RCT_EXPORT_BLOCKING_SYNCHRONOUS_METHOD(get) {
    NSMutableDictionary *dictionary = [NSMutableDictionary dictionary];
    NSString *displayName = [[NSBundle mainBundle] objectForInfoDictionaryKey:@"CFBundleDisplayName"];
    NSString *bundleName = [[NSBundle mainBundle] objectForInfoDictionaryKey:@"CFBundleName"];
    [dictionary setObject: displayName ? displayName : bundleName forKey: @"application"];
    [dictionary setObject: [[NSBundle mainBundle] objectForInfoDictionaryKey:@"CFBundleShortVersionString"] ? displayName : bundleName forKey: @"application.version"];
    return dictionary;
}

@end
