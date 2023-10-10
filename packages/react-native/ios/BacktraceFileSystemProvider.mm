#import "BacktraceFileSystemProvider.h"
#import <mach/mach.h>

@implementation BacktraceFileSystemProvider
RCT_EXPORT_MODULE()
RCT_EXPORT_BLOCKING_SYNCHRONOUS_METHOD(readFileSync:(NSString*)path) {
    NSFileManager *fileManager = [NSFileManager defaultManager];
    if (![fileManager fileExistsAtPath: path]) {
        return NULL;
    }
    NSError *error= NULL;
    NSData* data = [NSData dataWithContentsOfFile:path];
    if (error) {
        return NULL;
    }
    NSString* result = [[NSString alloc] initWithData:data encoding:NSUTF8StringEncoding];
    return result;
    
}


RCT_EXPORT_METHOD(readFile:(NSString*)path
                  resolver:(RCTPromiseResolveBlock)resolve
                  rejecter:(RCTPromiseRejectBlock)reject)
{
    NSFileManager *fileManager = [NSFileManager defaultManager];
    if (![fileManager fileExistsAtPath: path]) {
        resolve(NULL);
        return;
    }
    NSError *error= NULL;
    NSData* data = [NSData dataWithContentsOfFile:path];
    if (error) {
        reject(@"Cannot read file", [error localizedDescription], error);
        return;
    }
    NSString* result = [[NSString alloc] initWithData:data encoding:NSUTF8StringEncoding];
    resolve(result);
}

RCT_EXPORT_BLOCKING_SYNCHRONOUS_METHOD(writeFileSync:(NSString*)path
                                       content:(NSString*)fileContent) {
    NSError *error= NULL;
    [fileContent writeToFile:path atomically:YES encoding:NSUTF8StringEncoding error: &error];
    
    if (error) {
        NSLog(@"%@", [NSString stringWithFormat:@"Backtrace: Cannot write file to the path %@. Reason: %@", path, [error localizedDescription]]);
        return @NO;
    }
    return @YES;
}


RCT_EXPORT_METHOD(writeFile:(NSString*)path
                  content:(NSString*)fileContent
                  resolver:(RCTPromiseResolveBlock)resolve
                  rejecter:(RCTPromiseRejectBlock)reject)
{
    NSError *error= NULL;
    [fileContent writeToFile:path atomically:YES encoding:NSUTF8StringEncoding error: &error];
    
    if (error) {
        NSString* message = [NSString stringWithFormat:@"Backtrace: Cannot write file to the path %@. Reason: %@", path, [error localizedDescription]];
        NSLog(@"%@", message);
        reject(@"Cannot write file", message, error);
        return;
    }
    resolve(nil);
}


RCT_EXPORT_BLOCKING_SYNCHRONOUS_METHOD(unlinkSync:(NSString*)path) {
    NSError * error = nil;
    [[NSFileManager defaultManager] removeItemAtPath:path error:&error];
    if (error) {
        return @NO;
    }
    return @YES;
}


RCT_EXPORT_METHOD(unlink:(NSString*)path
                  resolver:(RCTPromiseResolveBlock)resolve
                  rejecter:(RCTPromiseRejectBlock)reject)
{
    NSError * error = nil;
    [[NSFileManager defaultManager] removeItemAtPath:path error:&error];
    if (error) {
        reject(@"Cannot unlink the file", [error localizedDescription], error);
        return;
    }
    return resolve(@YES);
}

RCT_EXPORT_BLOCKING_SYNCHRONOUS_METHOD(existsSync:(NSString*)path) {
    return [[NSFileManager defaultManager] fileExistsAtPath: path] ? @YES : @NO;
}


RCT_EXPORT_METHOD(exists:(NSString*)path
                  resolver:(RCTPromiseResolveBlock)resolve
                  rejecter:(RCTPromiseRejectBlock)reject)
{
    resolve([[NSFileManager defaultManager] fileExistsAtPath: path] ? @YES : @NO);
}

@end
