@interface CrashUtils : NSObject
+ (BOOL)isDebuggerAttached;
+ (NSString*) getCacheDir;
+ (NSString*) getDefaultReportPath;
+ (NSString*) getDefaultOomStatusPath;
+ (BOOL) prepareCrashDirectory;
+ (void) crash;
@end
