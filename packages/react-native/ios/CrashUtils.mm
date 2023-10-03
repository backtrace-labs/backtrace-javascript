#import <Foundation/Foundation.h>
#import "CrashUtils.h"

#include <assert.h>
#include <stdbool.h>
#include <sys/types.h>
#include <unistd.h>
#include <sys/sysctl.h>


@implementation CrashUtils

+ (BOOL) isDebuggerAttached {
    // https://stackoverflow.com/questions/4744826/detecting-if-ios-app-is-run-in-debugger/4746378#4746378
    int                 junk;
    int                 mib[4];
    struct kinfo_proc   info;
    size_t              size;
    
    // Initialize the flags so that, if sysctl fails for some bizarre
    // reason, we get a predictable result.
    
    info.kp_proc.p_flag = 0;
    
    // Initialize mib, which tells sysctl the info we want, in this case
    // we're looking for information about a specific process ID.
    
    mib[0] = CTL_KERN;
    mib[1] = KERN_PROC;
    mib[2] = KERN_PROC_PID;
    mib[3] = getpid();
    
    // Call sysctl.
    
    size = sizeof(info);
    junk = sysctl(mib, sizeof(mib) / sizeof(*mib), &info, &size, NULL, 0);
    assert(junk == 0);
    
    // We're being debugged if the P_TRACED flag is set.
    
    return ( (info.kp_proc.p_flag & P_TRACED) != 0 );
}


//  returns cache dir path
+ (NSString*) getCacheDir {
    NSString *cacheDirectory = [NSSearchPathForDirectoriesInDomains(NSCachesDirectory, NSUserDomainMask, YES) objectAtIndex:0];
    return [cacheDirectory stringByAppendingPathComponent:@"BacktraceCache"];
}

// returns report path
+ (NSString*) getDefaultReportPath {
    return [ [CrashUtils getCacheDir] stringByAppendingPathComponent:@"Backtrace.plist"];
}

// returns path to oom status file path
+ (NSString*) getDefaultOomStatusPath {
    return [ [CrashUtils getCacheDir] stringByAppendingPathComponent:@"BacktraceOOMState.json"];
}

+ (BOOL) prepareCrashDirectory {
    NSString* backtraceDir = [CrashUtils getCacheDir];
    BOOL isDir = NO;
    NSError *error;
    if (! [[NSFileManager defaultManager] fileExistsAtPath:backtraceDir isDirectory:&isDir]) {
        return [[NSFileManager defaultManager] createDirectoryAtPath:backtraceDir withIntermediateDirectories:YES attributes:nil error:&error];
    } else {
        return isDir;
    }
}

+ (void) crash {
    NSArray *array = @[];
    NSObject *o = array[1];
    NSLog(array[2] == o ? @"YES": @"NO");
}
@end

