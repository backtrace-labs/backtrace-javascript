#import <React/RCTBridgeModule.h>

@interface RCT_EXTERN_MODULE(BacktraceSystemAttributeProvider, NSObject)

RCT_EXTERN_METHOD(readMachineId)
RCT_EXTERN_METHOD(readOperatingSystemName)

+ (BOOL)requiresMainQueueSetup
{
  return NO;
}

@end
