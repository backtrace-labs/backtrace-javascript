
#ifdef RCT_NEW_ARCH_ENABLED
#import "RNBacktraceReactNativeSpec.h"

@interface BacktraceReactNative : NSObject <NativeBacktraceReactNativeSpec>
#else
#import <React/RCTBridgeModule.h>

@interface BacktraceReactNative : NSObject <RCTBridgeModule>
#endif

@end
