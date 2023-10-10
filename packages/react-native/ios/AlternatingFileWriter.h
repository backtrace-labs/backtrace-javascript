#ifdef RCT_NEW_ARCH_ENABLED
#import "RNBacktraceReactNativeSpec.h"

@interface AlternatingFileWriter : NSObject <NativeBacktraceReactNativeSpec>
#else
#import <React/RCTBridgeModule.h>

@interface AlternatingFileWriter : NSObject <RCTBridgeModule>
#endif

@end

