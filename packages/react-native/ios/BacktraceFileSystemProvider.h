#ifdef RCT_NEW_ARCH_ENABLED
#import "RNBacktraceReactNativeSpec.h"

@interface BacktraceFileSystemProvider : NSObject <NativeBacktraceReactNativeSpec>
#else
#import <React/RCTBridgeModule.h>

@interface BacktraceFileSystemProvider : NSObject <RCTBridgeModule>
#endif

@end

