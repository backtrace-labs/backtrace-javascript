@interface BacktraceApi : NSObject{
    /**
     Backtrace URL
     */
    NSURL* _uploadUrl;
}
- (instancetype)initWithBacktraceUrl:(NSString*) rawUrl;
- (void) upload:(NSData*) crash withAttributes:(NSDictionary*) attributes andAttachments:
(NSArray*) attachmentsPaths andCompletionHandler:(void (^)(bool shouldRemoveReports)) completionHandler;
@end
