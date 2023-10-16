@interface CrashUtils : NSObject
+ (BOOL)isDebuggerAttached;
+ (void) crash;
+ (NSError*) convertExceptionToError:(NSException*) exception;
@end
