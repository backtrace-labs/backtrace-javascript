#import "BacktraceReactNative.h"
#import "BacktraceCrashReporter.h"

static BacktraceCrashReporter *instance;

@implementation BacktraceReactNative
RCT_EXPORT_MODULE()

RCT_EXPORT_BLOCKING_SYNCHRONOUS_METHOD(initialize:(NSString*)submissionUrl
                                       database:(NSString*)databasePath
                                       attributes:(NSDictionary*)attributes
                                       attachmentPaths:(NSArray*)attachmentPaths) {
    if(instance != nil) {
        return nil;
    }
    @try {
        instance = [[BacktraceCrashReporter alloc] initWithBacktraceUrl:submissionUrl andDatabasePath: databasePath andAttributes: (attributes ?: @{}) andOomSupport:TRUE andAttachments:(attachmentPaths ?: @[])];
        if (instance == nil) {
            return @NO;
        }
        [instance start];
    } @catch (NSException *exception) {
        NSLog(@"Backtrace: Native crash reporting is off (%@)", exception.name);
        instance = nil;
        return @NO;
    }
    return nil;
}

RCT_EXPORT_METHOD(useAttachments: (NSArray*) attachmentPaths) {
    if(instance == nil || attachmentPaths == nil) {
        return;
    }

    @try {
        [instance useAttachments:attachmentPaths];
    } @catch (NSException *exception) {
        NSLog(@"Backtrace: Failed to update native attachments (%@)", exception.name);
    }
}

RCT_EXPORT_METHOD(useAttributes: (NSDictionary*) attributes) {
    if(instance == nil || attributes == nil) {
        return;
    }

    @try {
        [instance setAttributes:attributes];
    } @catch (NSException *exception) {
        NSLog(@"Backtrace: Failed to update native attributes (%@)", exception.name);
    }
}

RCT_EXPORT_METHOD(crash)
{
    NSArray *array = @[];
    array[1];
}

// Synchronous so the flag is set before JS proceeds to RCTFatal.
RCT_EXPORT_BLOCKING_SYNCHRONOUS_METHOD(markFatalError)
{
    if (instance != nil) {
        [instance markJsFatalError];
    }
    return nil;
}

@end
