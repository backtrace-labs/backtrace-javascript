#import "BreadcrumbFileManager.h"
#import <mach/mach.h>

@implementation AlternatingFileWriter
RCT_EXPORT_MODULE()
RCT_EXPORT_BLOCKING_SYNCHRONOUS_METHOD(use:(NSString*) sourceFile
                                       fallbackFile: (NSString*) fallbackFile
                                       maximumBreadcrumbsPerFile: (NSInteger*) maximumBreadcrumbsPerFile) {
    return @YES;
}


RCT_EXPORT_METHOD(append:(NSString*)line
                  resolver:(RCTPromiseResolveBlock)resolve
                  rejecter:(RCTPromiseRejectBlock)reject)
{
    resolve(@YES);
}
@end
