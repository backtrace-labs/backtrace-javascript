@interface BacktraceCrashReporter : NSObject
- (instancetype)initWithBacktraceUrl:(NSString*) rawUrl andAttributes:(NSDictionary*) attributes andOomSupport:(bool) enableOomSupport andAttachments:(NSArray*) attachments;
- (void)useAttachments:(NSArray*) attachments;
- (void)setAttributes:(NSDictionary*) attributes;
- (void)start;
@end
