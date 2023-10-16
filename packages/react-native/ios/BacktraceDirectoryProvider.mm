#import "BacktraceDirectoryProvider.h"
#import <mach/mach.h>

@implementation BacktraceDirectoryProvider
RCT_EXPORT_MODULE()
RCT_EXPORT_BLOCKING_SYNCHRONOUS_METHOD(createDirSync:(NSString*)path) {
    NSError * error = nil;
    BOOL success = [[NSFileManager defaultManager] createDirectoryAtPath:path
                                             withIntermediateDirectories:YES
                                                              attributes:nil
                                                                   error:&error];
    if (error) {
        return @NO;
    }
    return @(success);
}


RCT_EXPORT_METHOD(createDir:(NSString*)path
                  resolver:(RCTPromiseResolveBlock)resolve
                  rejecter:(RCTPromiseRejectBlock)reject)
{
    NSError * error = nil;
    BOOL success = [[NSFileManager defaultManager] createDirectoryAtPath:path
                                             withIntermediateDirectories:YES
                                                              attributes:nil
                                                                   error:&error];
    if (error) {
        reject(@"Create directory", [error localizedDescription], error);
        return;
    }
    if (!success) {
        reject(@"Create directory", @"Cannot create a directory.", nil);
        return;
    }
    
    resolve(@YES);
}

RCT_EXPORT_BLOCKING_SYNCHRONOUS_METHOD(readDirSync:(NSString*)path) {
    NSError * error = nil;
    NSArray* dirs = [[NSFileManager defaultManager] contentsOfDirectoryAtPath:path
                                                                        error:&error];
    return dirs ? dirs: [NSMutableArray new];
}


RCT_EXPORT_METHOD(readDir:(NSString*)path
                  resolver:(RCTPromiseResolveBlock)resolve
                  rejecter:(RCTPromiseRejectBlock)reject)
{
    NSError * error = nil;
    NSArray* dirs = [[NSFileManager defaultManager] contentsOfDirectoryAtPath:path
                                                                        error:&error];
    resolve(dirs ? dirs : [NSMutableArray new]);
}

RCT_EXPORT_BLOCKING_SYNCHRONOUS_METHOD(applicationDirectory) {
    return [NSSearchPathForDirectoriesInDomains(NSCachesDirectory, NSUserDomainMask, YES) objectAtIndex:0];
}


@end
