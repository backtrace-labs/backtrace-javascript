#import "StreamWriter.h"
#import "CrashUtils.h"
#import <mach/mach.h>

@implementation StreamWriter

NSMutableDictionary *dictionary = [NSMutableDictionary new];

RCT_EXPORT_MODULE()
RCT_EXPORT_BLOCKING_SYNCHRONOUS_METHOD(create:(NSString*) sourceFile) {
    @synchronized (self) {
        if([dictionary objectForKey: sourceFile]) {
            return sourceFile;
        }
        
        NSFileManager* manager = [NSFileManager defaultManager];
        
        if(![manager createFileAtPath:sourceFile
                             contents:nil
                           attributes:nil]){
            return nil;
        }
        
        NSFileHandle* output = [NSFileHandle fileHandleForWritingAtPath:sourceFile];
        if(!output) {
            return nil;
        }
        [dictionary setValue:output forKey:sourceFile];
    }
    
    return sourceFile;
    
}

RCT_EXPORT_METHOD(append:(NSString*) sourceKey
                  withContent:(NSString*) content
                  AndResolver:(RCTPromiseResolveBlock)resolve
                  andRejecter:(RCTPromiseRejectBlock)reject) {
    
    NSFileHandle* output = [dictionary objectForKey: sourceKey];
    if(!output) {
        reject(@"Stream writer append", @"File handler not found", nil);
        return;
    }
    
    if (@available(iOS 13.0, *)) {
        NSError* error;
        [output writeData:[content dataUsingEncoding:NSUTF8StringEncoding] error:&error];
        if(error) {
            reject(@"Stream writer append", error.localizedDescription, error);
            return;
        }
    } else {
        @try {
            [output writeData:[content dataUsingEncoding:NSUTF8StringEncoding]];
        } @catch (NSException *exception) {
            NSError* error = [CrashUtils convertExceptionToError:exception];
            NSLog(@"Backtrace: Cannot write data to stream writer. Reason: %@ %@", exception, [exception userInfo]);
            reject(@"Stream writer append", error.localizedDescription, error);
            return;
        }
    }
    
    
    resolve(@YES);
}

RCT_EXPORT_BLOCKING_SYNCHRONOUS_METHOD(close:(NSString*) sourceKey) {
    
    NSFileHandle* output = [dictionary objectForKey: sourceKey];
    if(!output) {
        return @YES;
    }
    [dictionary removeObjectForKey:sourceKey];
    
    if (@available(iOS 13.0, *)) {
        NSError* error;
        [output closeAndReturnError:&error];
        if(error) {
            NSLog(@"Backtrace: Cannot close stream writer. Reason: %@ %@", error.localizedDescription, [error userInfo]);
            return @NO;
        }
    } else {
        @try {
            [output closeFile];
        } @catch (NSException *exception) {
            NSLog(@"Backtrace: Cannot close the stream writer. Reason: %@ %@", exception.reason, [exception userInfo]);
            return @NO;
        }
    }
    
    return @YES;
}

@end
 
