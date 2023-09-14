#import "BacktraceDeviceAttributeProvider.h"
#import <sys/utsname.h>

@implementation BacktraceDeviceAttributeProvider
RCT_EXPORT_MODULE()
RCT_EXPORT_BLOCKING_SYNCHRONOUS_METHOD(readCulture) {
    NSString* culture =[[[NSBundle mainBundle] preferredLocalizations] objectAtIndex:0];
    return culture;
}


RCT_EXPORT_BLOCKING_SYNCHRONOUS_METHOD(getDeviceModel) {
    struct utsname systemInfo;
    uname(&systemInfo);
    
    return [NSString stringWithCString:systemInfo.machine
                              encoding:NSUTF8StringEncoding];
}

RCT_EXPORT_BLOCKING_SYNCHRONOUS_METHOD(getDeviceBrand) {
    return @"Apple Inc";
}

RCT_EXPORT_BLOCKING_SYNCHRONOUS_METHOD(getDeviceProduct) {
    return [[UIDevice currentDevice] model];
}

RCT_EXPORT_BLOCKING_SYNCHRONOUS_METHOD(getDeviceManufacturer) {
    return @"Apple Inc";
}
RCT_EXPORT_BLOCKING_SYNCHRONOUS_METHOD(getDeviceSdk) {
    return [[NSBundle mainBundle] infoDictionary][@"DTSDKName"];
}
@end
