#import "BacktraceApplicationAttributeProvider.h"

@implementation BacktraceApplicationAttributeProvider
RCT_EXPORT_MODULE()
RCT_EXPORT_BLOCKING_SYNCHRONOUS_METHOD(get) {
    NSMutableDictionary *dictionary = [NSMutableDictionary dictionary];
    NSBundle *bundle = [NSBundle mainBundle];
    NSString *displayName = [bundle objectForInfoDictionaryKey:@"CFBundleDisplayName"];
    NSString *bundleName = [bundle objectForInfoDictionaryKey:@"CFBundleName"];
    dictionary[@"application"] = displayName ?: bundleName;
    dictionary[@"application.version"] = [bundle objectForInfoDictionaryKey:@"CFBundleShortVersionString"];
    return dictionary;
}

@end
