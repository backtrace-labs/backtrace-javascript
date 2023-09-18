#import "BacktraceSystemAttributeProvider.h"
#include <sys/sysctl.h>

@implementation BacktraceSystemAttributeProvider
RCT_EXPORT_MODULE()
RCT_EXPORT_BLOCKING_SYNCHRONOUS_METHOD(readMachineId) {
    NSString* cacheKey = @"backtrace-react.unique.user.identifier";
    NSUserDefaults *prefs = [NSUserDefaults standardUserDefaults];
    NSString* guid = [prefs stringForKey:cacheKey];
    if(guid == nil) {
        guid =  [[NSUUID UUID] UUIDString];
        [prefs setObject:guid forKey:cacheKey];
    }
    return guid;
}


RCT_EXPORT_BLOCKING_SYNCHRONOUS_METHOD(readSystemName) {
    return [[UIDevice currentDevice] systemName];
}

RCT_EXPORT_BLOCKING_SYNCHRONOUS_METHOD(readSystemArchitecture) {
    size_t size;
    cpu_type_t type;
    size = sizeof(type);
    sysctlbyname("hw.cputype", &type, &size, NULL, 0);
    
    // values for cputype and cpusubtype defined in mach/machine.h
    if (type == CPU_TYPE_X86)
    {
        return @"x86";
    } else if (type == CPU_TYPE_ARM)
    {
        return @"ARM";
    } else if(type == CPU_TYPE_ARM64)
    {
        return @"ARM64";
    } else if(type == CPU_TYPE_ARM64_32)
    {
        return @"ARM64_32";
    } else {
        return @"Unknown";
    }
}

RCT_EXPORT_BLOCKING_SYNCHRONOUS_METHOD(readSystemVersion) {
    return [[UIDevice currentDevice] systemVersion];
}

@end

