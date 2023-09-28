#import "BacktraceSystemAttributeProvider.h"
#include <sys/sysctl.h>

@implementation BacktraceSystemAttributeProvider
+ (NSString*) readMachineId {
    NSString* cacheKey = @"backtrace-react.unique.user.identifier";
    NSUserDefaults *prefs = [NSUserDefaults standardUserDefaults];
    NSString* guid = [prefs stringForKey:cacheKey];
    if(guid == nil) {
        guid =  [[NSUUID UUID] UUIDString];
        [prefs setObject:guid forKey:cacheKey];
    }
    return guid;
}
+ (NSString*) readSystemArchitecture {
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

RCT_EXPORT_MODULE()
RCT_EXPORT_BLOCKING_SYNCHRONOUS_METHOD(get) {
    NSMutableDictionary *dictionary = [NSMutableDictionary dictionary];
    [dictionary setObject: [BacktraceSystemAttributeProvider readMachineId] forKey:@"guid"];
    [dictionary setObject: [[UIDevice currentDevice] systemName] forKey:@"uname.sysname"];
    [dictionary setObject: [BacktraceSystemAttributeProvider readSystemArchitecture] forKey:@"uname.machine"];
    [dictionary setObject: [[UIDevice currentDevice] systemVersion] forKey:@"uname.version"];
    return dictionary;
}

@end

