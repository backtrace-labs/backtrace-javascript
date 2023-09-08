#import <React/RCTBridgeModule.h>

@interface RCT_EXTERN_MODULE(BacktraceApplicationAttributeProvider, NSObject)

RCT_EXTERN_METHOD(readApplicationName)
RCT_EXTERN_METHOD(readApplicationVerson)

+ (BOOL)requiresMainQueueSetup
{
  return NO;
}

@end
