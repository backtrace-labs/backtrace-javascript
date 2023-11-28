#import "BacktraceDeviceAttributeProvider.h"
#import <sys/utsname.h>

@implementation BacktraceDeviceAttributeProvider

RCT_EXPORT_MODULE()
RCT_EXPORT_BLOCKING_SYNCHRONOUS_METHOD(get) {
    NSMutableDictionary *dictionary = [NSMutableDictionary dictionary];
    struct utsname systemInfo;
    uname(&systemInfo);
    
    [dictionary setObject: [NSString stringWithCString:systemInfo.machine
                                              encoding:NSUTF8StringEncoding] forKey: @"device.model"];
    [dictionary setObject: @"Apple Inc" forKey: @"device.brand"];
    [dictionary setObject: [[UIDevice currentDevice] model] forKey: @"device.product"];
    [dictionary setObject: @"Apple Inc" forKey: @"device.manufacturer"];
    [dictionary setObject: [[NSBundle mainBundle] infoDictionary][@"DTSDKName"] forKey: @"device.sdk"];
    [dictionary setObject: [[[NSBundle mainBundle] preferredLocalizations] objectAtIndex:0] forKey: @"culture"];
    
    return dictionary;
}

@end
