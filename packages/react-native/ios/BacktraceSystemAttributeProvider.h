#ifdef RCT_NEW_ARCH_ENABLED
#import "RNBacktraceReactNativeSpec.h"

@interface BacktraceSystemAttributeProvider : NSObject <NativeBacktraceReactNativeSpec>
#else
#import <React/RCTBridgeModule.h>

@interface BacktraceSystemAttributeProvider : NSObject <RCTBridgeModule>
#endif

@end

