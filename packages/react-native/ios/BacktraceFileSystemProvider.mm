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
        NSLog(@"Backtrace: Cannot read the file. Reason: %@ %@", error, [error userInfo]);
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
        NSLog(@"Backtrace: Cannot read the file. Reason: %@ %@", error, [error userInfo]);
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
        NSLog(@"Backtrace: Cannot write file to the path %@. Reason: %@", path, [error localizedDescription]);
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
        NSLog(@"Backtrace: Cannot write file to the path %@. Reason: %@", path, [error localizedDescription]);
        reject(@"Cannot write file", [error localizedDescription], error);
        return;
    }
    resolve(nil);
}


RCT_EXPORT_BLOCKING_SYNCHRONOUS_METHOD(unlinkSync:(NSString*)path) {
    NSError * error = nil;
    [[NSFileManager defaultManager] removeItemAtPath:path error:&error];
    if (error) {
        NSLog(@"Backtrace: Cannot unlink the file. Reason: %@ %@", error, [error userInfo]);
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
        NSLog(@"Backtrace: Cannot unlink the file. Reason: %@ %@", error, [error userInfo]);
        reject(@"Cannot unlink the file", [error localizedDescription], error);
        return;
    }
    return resolve(@YES);
}

RCT_EXPORT_BLOCKING_SYNCHRONOUS_METHOD(existsSync:(NSString*)path) {
    return @([[NSFileManager defaultManager] fileExistsAtPath: path]);
}


RCT_EXPORT_METHOD(exists:(NSString*)path
                  resolver:(RCTPromiseResolveBlock)resolve
                  rejecter:(RCTPromiseRejectBlock)reject)
{
    resolve(@([[NSFileManager defaultManager] fileExistsAtPath: path]));
}


RCT_EXPORT_BLOCKING_SYNCHRONOUS_METHOD(copySync:(NSString*)sourcePath
                                       andDestinationPath: (NSString*)destinationPath) {
    NSError *error = nil;
    BOOL result = [[NSFileManager defaultManager] replaceItemAtURL:[NSURL fileURLWithPath:destinationPath]  withItemAtURL:[NSURL fileURLWithPath:sourcePath] backupItemName:nil options:0 resultingItemURL:nil error:&error];
    if (error) {
        NSLog(@"Backtrace: Cannot rename the file. Reason: %@ %@", error, [error userInfo]);
        return @NO;
    }
    
    if(![[NSFileManager defaultManager] fileExistsAtPath:sourcePath]) {
        [[NSFileManager defaultManager] copyItemAtPath:destinationPath toPath:sourcePath error:&error];
    }
    
    if (error) {
        NSLog(@"Backtrace: Cannot copy the file. Reason: %@ %@", error, [error userInfo]);
        return @NO;
    }
    return @(result);
}


RCT_EXPORT_METHOD(copy:(NSString*)sourcePath
                  andDestinationPath: (NSString*)destinationPath
                  andResolver:(RCTPromiseResolveBlock)resolve
                  andRejecter:(RCTPromiseRejectBlock)reject)
{
    NSError *error = nil;
    BOOL result = [[NSFileManager defaultManager] replaceItemAtURL:[NSURL fileURLWithPath:destinationPath]  withItemAtURL:[NSURL fileURLWithPath:sourcePath] backupItemName:nil options:0 resultingItemURL:nil error:&error];
    if (error) {
        NSLog(@"Backtrace: Cannot rename the file. Reason: %@ %@", error, [error userInfo]);
        reject(@"Cannot rename the file", [error localizedDescription], error);
        return;
    }
    
    if(![[NSFileManager defaultManager] fileExistsAtPath:sourcePath]) {
        [[NSFileManager defaultManager] copyItemAtPath:destinationPath toPath:sourcePath error:&error];
    }
    
    if (error) {
        NSLog(@"Backtrace: Cannot copy the file. Reason: %@ %@", error, [error userInfo]);
        reject(@"Cannot copy the file", [error localizedDescription], error);
        return;
    }
    
    resolve(@(result));
}

@end
