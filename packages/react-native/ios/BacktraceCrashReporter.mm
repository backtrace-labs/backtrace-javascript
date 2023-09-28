#import "BacktraceCrashReporter.h"
#import "CrashReporter/CrashReporter.h"
#import "BacktraceApi.h"
#import "OomWatcher.h"
#import "CrashUtils.h"
@implementation BacktraceCrashReporter
/**
 PL Crash reporter instance
 */
PLCrashReporter* _crashReporter;

/**
 Backtrace API Instance - http client to send Backtrace Reports
 */
BacktraceApi* _backtraceApi;


/**
 Backtrace OOM watcher instance
 */
OomWatcher* _oomWatcher;

/**
 Attachment paths
 */
NSArray* _attachmentsPaths;
/**
 Class instance
 */
static BacktraceCrashReporter *instance;

NSMutableDictionary* _attributes;

Boolean disabled = TRUE;

static void onCrash(siginfo_t *info, ucontext_t *uap, void *context) {
    [OomWatcher cleanup];
}


- (instancetype)initWithBacktraceUrl:(NSString*) submissionUrl andAttributes:(NSDictionary*) attributes andOomSupport:(bool) enableOomSupport andAttachments:(NSArray*) attachments  {
    if(instance != nil) {
        return instance;
    }
    
    if(!submissionUrl) {
        NSLog(@"Backtrace: Backtrace URL is not available");
        return nil;
    }
    if( self = [super init]) {
        if(![CrashUtils prepareCrashDirectory]) {
            NSLog(@"Backtrace: Cannot start integration - cannot create cache dir");
            return nil;
        }
        NSLog(@"Backtrace: Initializing native client");
        _backtraceApi = [[BacktraceApi alloc] initWithBacktraceUrl:submissionUrl];
        _attachmentsPaths = [attachments mutableCopy];
        _attributes = [attributes mutableCopy];
        
        _crashReporter = [[PLCrashReporter alloc] initWithConfiguration:
                          [[PLCrashReporterConfig alloc]
                           initWithSignalHandlerType: PLCrashReporterSignalHandlerTypeBSD
                           symbolicationStrategy: PLCrashReporterSymbolicationStrategyAll]];
        [self saveReportData];
        PLCrashReporterCallbacks callback = {
            .version = 0,
            .context = nil,
            .handleSignal = &onCrash
        };
        
        [_crashReporter setCrashCallbacks:&callback];
        
        if(enableOomSupport) {
            _oomWatcher = [[OomWatcher alloc] init];
        }
        
        instance = self;
        disabled = NO;
    }
    
    return instance;
}

- (void) saveReportData {
    NSMutableDictionary *reportData = [[NSMutableDictionary alloc] init];
    [_attributes setObject:@"Crash" forKey:@"error.type"];
    [reportData setObject: _attributes forKey: @"attributes"];
    [reportData setObject: _attachmentsPaths forKey: @"attachments"];
    [_crashReporter setCustomData: [NSKeyedArchiver archivedDataWithRootObject:reportData]];
}


- (void)useAttachments:(NSArray*) attachments {
    _attachmentsPaths = [attachments mutableCopy];
    [self saveReportData];
    if(_oomWatcher != nil) {
        [_oomWatcher updateAttachments:attachments];
    }
}

-(void)setAttributes:(NSDictionary*) attributes {
    [_attributes addEntriesFromDictionary:attributes];
    [self saveReportData];
    if(_oomWatcher != nil) {
        [_oomWatcher updateAttributes: _attributes];
    }
}

- (void) start {
    BOOL hasPendingCrashReport = [_crashReporter hasPendingCrashReport];
    //send pending reports
    [self sendPendingReports];
    //enable crash reporter
    NSError* error;
    [_crashReporter enableCrashReporterAndReturnError:&error];
    
    if(error) {
        NSLog(@"Backtrace: Cannot initialize crash reporter. Reason: %@ %@", error, [error userInfo]);
        return;
    }
    
    if(_oomWatcher != nil) {
        if([_oomWatcher shouldReportOom:hasPendingCrashReport]) {
            NSDictionary* state = [_oomWatcher getOomState];
            NSData* resource = [_crashReporter generateLiveReportAndReturnError:&error];
            if(error) {
                NSLog(@"Backtrace: Cannot create a native report for OOM integration. Reason: %@ %@", error, [error userInfo]);
                return;
            }
            [_backtraceApi upload:resource withAttributes:[state objectForKey:@"attributes"] andAttachments:[state objectForKey:@"attachments"] andCompletionHandler:^(bool shouldRemove) {
                if(!shouldRemove) {
                    NSLog(@"Backtrace: Cannot send the OOM report.");
                }
            }];
        }
        [_oomWatcher startOomIntegration:_attachmentsPaths andAttributes:_attributes];
        [self startNotificationsIntegration];
    }
}


- (void) sendPendingReports {
    if(![_crashReporter hasPendingCrashReport])
    {
        NSLog(@"Backtrace: No pending crash reports");
        return;
    }
    NSError *error = nil;
    NSData *data = [_crashReporter loadPendingCrashReportDataAndReturnError:&error];
    if(error) {
        NSLog(@"Backtrace: Cannot load pending crash reports. Reason: %@ %@", error, [error userInfo]);
        [_crashReporter purgePendingCrashReport];
    }
    if(!data) {
        NSLog(@"Backtrace: empty crash report data");
        return;
    }
    
    PLCrashReport *report = [[PLCrashReport alloc] initWithData: data error:&error];
    if(error) {
        NSLog(@"Backtrace: Cannot initialize a new report from the old application session. Reason: %@ %@", error, [error userInfo]);
        [_crashReporter purgePendingCrashReport];
        return;
    }
    if (report){
        NSDictionary* reportData =  (NSDictionary*) [NSKeyedUnarchiver unarchiveObjectWithData: [report customData]];
        NSArray* attachments = reportData != nil ? [reportData objectForKey:@"attachments"] :  [NSMutableArray new];
        NSDictionary* attributes = reportData != nil ? [reportData objectForKey:@"attributes"] : [NSDictionary new];
        NSLog(@"Backtrace: Found a crash generated in the last user session. Sending data to Backtrace.");
        [_backtraceApi upload:data withAttributes:attributes andAttachments:attachments andCompletionHandler:^(bool shouldRemove) {
            if(!shouldRemove) {
                NSLog(@"Backtrace: Cannot send report to Backtrace.");
                return;
            }
            [_crashReporter purgePendingCrashReport];
        }];
    }
}

- (void) startNotificationsIntegration {
    [[NSNotificationCenter defaultCenter] addObserver:self
                                             selector:@selector(handleBackgroundNotification)
                                                 name:UIApplicationDidEnterBackgroundNotification
                                               object:nil];
    
    [[NSNotificationCenter defaultCenter] addObserver:self
                                             selector:@selector(handleForegroundNotification)
                                                 name:UIApplicationWillEnterForegroundNotification
                                               object:nil];
    
    [[NSNotificationCenter defaultCenter] addObserver:self
                                             selector:@selector(disableIntegration)
                                                 name:UIApplicationWillTerminateNotification
                                               object:nil];
    
    [[NSNotificationCenter defaultCenter] addObserver:self
                                             selector:@selector(handleLowMemoryWarning)
                                                 name:UIApplicationDidReceiveMemoryWarningNotification
                                               object:nil];
}


- (void)handleBackgroundNotification {
    [_oomWatcher backgroundNotification];
}

- (void)handleForegroundNotification {
    [_oomWatcher foregroundNotification];
}

- (void)disableIntegration {
    if(disabled == YES){
        return;
    }
    [OomWatcher cleanup];
    [[NSNotificationCenter defaultCenter] removeObserver:self];
    if(_oomWatcher != nil){
        [_oomWatcher disable];
    }
    disabled = YES;
    NSLog(@"Backtrace: Backtrace native integration has been disabled.");
}

- (void)handleLowMemoryWarning {
    [_oomWatcher saveLowMemoryWarning];
}
@end



