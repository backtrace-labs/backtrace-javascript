#import <Foundation/Foundation.h>
#include "OomWatcher.h"
#include "CrashUtils.h"
#import "CrashReporter/CrashReporter.h"

@implementation OomWatcher

// current application state
NSMutableDictionary* _applicationState;

NSTimeInterval _lastUpdateTime;

// determine if debugger is available or not
bool _debugMode;

// determine if oom watcher have been disposed
bool _disabled;

- (instancetype) init {
    if (self = [super init]) {
        _lastUpdateTime = 0;
        _applicationState = [NSMutableDictionary dictionary];
        _debugMode = [CrashUtils isDebuggerAttached];
        _disabled = NO;
    }
    
    return self;
}

// decide if ios integration should send oom report to Backtrace
- (BOOL) shouldReportOom:(BOOL)didCrash {
    // check if crash happened in the previous session
    if(didCrash) {
        return NO;
    }
    NSDictionary* state= [self getOomState];
    if(state == nil) {
        return NO;
    }
    return [self verifyOomState:state];
}

- (NSDictionary*) getOomState {
    NSString* statusPath = [CrashUtils getDefaultOomStatusPath];
    NSFileManager* manager = [NSFileManager defaultManager];
    if([manager fileExistsAtPath:statusPath] == NO) {
        return nil;
    }
    
    NSDictionary* state= [NSDictionary dictionaryWithContentsOfFile:statusPath];
    return state;
}

- (void) startOomIntegration: (NSArray*) attachments andAttributes:(NSDictionary*) attributes  {
    [self setDefaultApplicationState:attachments andAttributes:attributes];
    [self saveApplicationState];
}

- (void) backgroundNotification {
    [_applicationState setObject:@"background" forKey:@"state"];
    [self saveApplicationState];
}

- (void) foregroundNotification {
    [_applicationState setObject:@"foreground" forKey:@"state"];
    [self saveApplicationState];
}

- (void) updateAttributes:(NSDictionary*) clientAttributes {
    NSMutableDictionary* attributes = [clientAttributes mutableCopy];
    [attributes setObject:@"OOMException: Out of memory detected."  forKey:@"error.message"];
    [attributes setObject:@"OOMException" forKey:@"classifiers"];
    [_applicationState setObject:attributes forKey:@"attributes"];
}

- (void) updateAttachments:(NSArray*) attachments {
    [_applicationState setObject:attachments forKey:@"attachments"];
}
- (void) saveLowMemoryWarning {
    NSTimeInterval currentTime = [[NSDate date] timeIntervalSince1970];
    if( (currentTime - _lastUpdateTime) < 120) {
        _lastUpdateTime = currentTime;
        return;
    }
    
    NSLog(@"Backtrace: Received a memory warning message. Saving application state.");
    _lastUpdateTime = currentTime;
    
    NSMutableDictionary* attributes = [_applicationState objectForKey:@"attributes"];
    [attributes setObject: @"true"  forKey: @"memory.warning"];
    [attributes setObject: [NSString stringWithFormat:@"%f", currentTime] forKey:@"memory.warning.time"];
    
    [_applicationState setObject:attributes forKey:@"attributes"];
    [self saveApplicationState];
}


- (void) setDefaultApplicationState: (NSArray*) attachments andAttributes:(NSDictionary*) attributes  {
    [_applicationState setObject:@"foreground" forKey:@"state"];
    [_applicationState setObject:attachments forKey:@"attachments"];
    [_applicationState setObject:[[NSProcessInfo processInfo] operatingSystemVersionString] forKey:@"osVersion"];
    [_applicationState setObject:[[[NSBundle mainBundle] infoDictionary] objectForKey:@"CFBundleShortVersionString"] forKey:@"appVersion"];
    [_applicationState setObject:[NSNumber numberWithBool:_debugMode] forKey:@"debuggerEnabled"];
    [self updateAttributes:[attributes mutableCopy]];
    [self updateAttachments:attachments];
}

- (BOOL) verifyOomState: (NSDictionary*) state {
    if(!state) {
        return NO;
    }
    
    NSString* osVersion = [state objectForKey:@"osVersion"];
    if(osVersion == nil || ![osVersion isEqualToString: [[NSProcessInfo processInfo] operatingSystemVersionString]]) {
        return NO;
    }
    
    NSString* appVersion = [state objectForKey:@"appVersion"];
    if(appVersion == nil || ![appVersion isEqualToString: [[[NSBundle mainBundle] infoDictionary] objectForKey:@"CFBundleShortVersionString"]]) {
        return NO;
    }
    
    NSNumber* isDebuggerEnabled = [state objectForKey:@"debuggerEnabled"];
    if([isDebuggerEnabled isEqualToNumber:@1]) {
        return NO;
    }
    NSLog(@"Backtrace: Detected OOM state");
    return YES;
}

// cleanup Oom integration
+ (void) cleanup {
    NSString* statusPath = [CrashUtils getDefaultOomStatusPath];
    NSFileManager* manager = [NSFileManager defaultManager];
    if(![manager fileExistsAtPath:statusPath]) {
        return;
    }
    
    NSError *error;
    [manager removeItemAtPath:statusPath error: &error];
}

- (void) disable {
    _disabled =  YES;
}


- (void) saveApplicationState {
    if(_disabled == YES) {
        return;
    }
    NSString* statusPath = [CrashUtils getDefaultOomStatusPath];
    [_applicationState writeToFile:statusPath atomically:YES];
}
@end
