#ifdef RCT_NEW_ARCH_ENABLED
#import "RNBacktraceReactNativeSpec.h"

@interface BacktraceDeviceAttributeProvider : NSObject <NativeBacktraceReactNativeSpec>
#else
#import <React/RCTBridgeModule.h>

@interface BacktraceDeviceAttributeProvider : NSObject <RCTBridgeModule>
#endif

@end

