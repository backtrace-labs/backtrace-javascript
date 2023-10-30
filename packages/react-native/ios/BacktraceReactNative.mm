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
    instance = [[BacktraceCrashReporter alloc] initWithBacktraceUrl:submissionUrl andDatabasePath: databasePath andAttributes: attributes andOomSupport:TRUE andAttachments:attachmentPaths];
    [instance start];
    return instance;
}

RCT_EXPORT_METHOD(useAttachments: (NSArray*) attachmentPaths) {
    if(instance == nil) {
        return;
    }
    
    [instance useAttachments:attachmentPaths];
}

RCT_EXPORT_METHOD(useAttributes: (NSDictionary*) attributes) {
    if(instance == nil) {
        return;
    }
    
    [instance setAttributes:attributes];
}

RCT_EXPORT_METHOD(crash)
{
    NSArray *array = @[];
    array[1];
}

@end
