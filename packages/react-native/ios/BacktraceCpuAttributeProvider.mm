#import "BacktraceCpuAttributeProvider.h"
#import <mach/mach.h>

@implementation BacktraceCpuAttributeProvider
RCT_EXPORT_MODULE()
RCT_EXPORT_BLOCKING_SYNCHRONOUS_METHOD(get) {
    NSMutableDictionary *dictionary = [NSMutableDictionary dictionary];
    
    processor_cpu_load_info_t cpuLoad;
    mach_msg_type_number_t processorMsgCount;
    natural_t processorCount;
    
    uint64_t totalSystemTime = 0, totalUserTime = 0, totalIdleTime = 0, totalNiceTime = 0;
    
    kern_return_t err = host_processor_info(mach_host_self(), PROCESSOR_CPU_LOAD_INFO, &processorCount, (processor_info_array_t *)&cpuLoad, &processorMsgCount);
    
    for (natural_t i = 0; i < processorCount; i++) {
        totalSystemTime += cpuLoad[i].cpu_ticks[CPU_STATE_SYSTEM];
        totalUserTime += cpuLoad[i].cpu_ticks[CPU_STATE_USER] + cpuLoad[i].cpu_ticks[CPU_STATE_NICE];
        totalIdleTime += cpuLoad[i].cpu_ticks[CPU_STATE_IDLE];
        totalNiceTime += cpuLoad[i].cpu_ticks[CPU_STATE_NICE];
        
    }
    
    [dictionary setObject: [NSString stringWithFormat:@"%0.0lu", [[NSProcessInfo processInfo] processorCount]] forKey:@"cpu.count"];
    [dictionary setObject: [NSString stringWithFormat:@"%0.0lu", [[NSProcessInfo processInfo] activeProcessorCount]] forKey:@"cpu.count.active"];
    [dictionary setObject: [NSString stringWithFormat:@"%0.0llu", totalSystemTime] forKey:@"cpu.system"];
    [dictionary setObject: [NSString stringWithFormat:@"%0.0llu", totalUserTime] forKey:@"cpu.user"];
    [dictionary setObject: [NSString stringWithFormat:@"%0.0llu", totalIdleTime] forKey:@"cpu.idle"];
    [dictionary setObject: [NSString stringWithFormat:@"%0.0llu", totalNiceTime] forKey:@"cpu.nice"];
    
    
    return dictionary;
}

@end
