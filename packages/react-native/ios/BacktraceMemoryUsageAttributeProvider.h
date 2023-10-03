#ifdef RCT_NEW_ARCH_ENABLED
#import "RNBacktraceReactNativeSpec.h"

@interface BacktraceMemoryUsageAttributeProvider : NSObject <NativeBacktraceReactNativeSpec>
#else
#import <React/RCTBridgeModule.h>

@interface BacktraceMemoryUsageAttributeProvider : NSObject <RCTBridgeModule>
#endif

@end
