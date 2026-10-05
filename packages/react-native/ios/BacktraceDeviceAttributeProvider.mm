#import "BacktraceDeviceAttributeProvider.h"
#import <sys/utsname.h>

@implementation BacktraceDeviceAttributeProvider

RCT_EXPORT_MODULE()
RCT_EXPORT_BLOCKING_SYNCHRONOUS_METHOD(get) {
    NSMutableDictionary *dictionary = [NSMutableDictionary dictionary];
    struct utsname systemInfo;
    uname(&systemInfo);

    dictionary[@"device.model"] = [NSString stringWithCString:systemInfo.machine encoding:NSUTF8StringEncoding];
    dictionary[@"device.brand"] = @"Apple Inc";
    dictionary[@"device.product"] = [[UIDevice currentDevice] model];
    dictionary[@"device.manufacturer"] = @"Apple Inc";
    dictionary[@"device.sdk"] = [[NSBundle mainBundle] infoDictionary][@"DTSDKName"];
    dictionary[@"culture"] = [[[NSBundle mainBundle] preferredLocalizations] firstObject];

    return dictionary;
}

@end
