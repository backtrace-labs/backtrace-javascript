@interface BacktraceCrashReporter : NSObject
- (instancetype)initWithBacktraceUrl:(NSString*) rawUrl andDatabasePath:(NSString*) databasePath andAttributes:(NSDictionary*) attributes andOomSupport:(bool) enableOomSupport andAttachments:(NSArray*) attachments;
- (void)useAttachments:(NSArray*) attachments;
- (void)setAttributes:(NSDictionary*) attributes;
- (void)markJsFatalError;
- (void)start;
@end
