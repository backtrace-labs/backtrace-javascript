@interface OomWatcher : NSObject {

    // current application state
    NSMutableDictionary* _applicationState;
    
    // last memory warning update time
    NSTimeInterval _lastUpdateTime;
    
    // determine if debugger is available or not
    BOOL _debugMode;
    
    // determine if oom watcher have been disabled
    BOOL _disabled;
}
- (void) disable;
+ (void) cleanup;
- (instancetype) init;
- (BOOL) shouldReportOom:(BOOL)didCrash;
- (NSDictionary*) getOomState;
- (void) startOomIntegration: (NSArray*) attachments andAttributes:(NSDictionary*) attributes;
- (void) backgroundNotification;
- (void) foregroundNotification;
- (void) updateAttributes:(NSDictionary*) attributes;
- (void) updateAttachments:(NSArray*) attachments;
- (void) saveLowMemoryWarning;
- (void) setDefaultApplicationState: (NSArray*) attachments andAttributes:(NSDictionary*) attributes;
- (BOOL) verifyOomState: (NSDictionary*) state;
- (void) saveApplicationState;
@end
