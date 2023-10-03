export interface NodeDiagnosticReport {
    header: Header;
    javascriptStack: JavascriptStack;
    nativeStack: NativeStack[];
    javascriptHeap: JavascriptHeap;
    resourceUsage: ResourceUsage;
    uvthreadResourceUsage: UvthreadResourceUsage;
    libuv: Libuv[];
    workers: unknown[];
    environmentVariables: EnvironmentVariables;
    userLimits: UserLimits;
    sharedObjects: string[];
}

export interface Header {
    reportVersion: number;
    event: string;
    trigger: string;
    filename: string;
    dumpEventTime: string;
    dumpEventTimeStamp: string;
    processId: number;
    cwd: string;
    commandLine: string[];
    nodejsVersion: string;
    glibcVersionRuntime: string;
    glibcVersionCompiler: string;
    wordSize: string;
    arch: string;
    platform: string;
    componentVersions: ComponentVersions;
    release: Release;
    osName: string;
    osRelease: string;
    osVersion: string;
    osMachine: string;
    cpus: Cpu[];
    networkInterfaces: NetworkInterface[];
    host: string;
}

export interface ComponentVersions {
    node: string;
    v8: string;
    uv: string;
    zlib: string;
    ares: string;
    modules: string;
    nghttp2: string;
    napi: string;
    llhttp: string;
    openssl: string;
}

export interface Release {
    name: string;
}

export interface Cpu {
    model: string;
    speed: number;
    user: number;
    nice: number;
    sys: number;
    idle: number;
    irq: number;
}

export interface NetworkInterface {
    name: string;
    internal: boolean;
    mac: string;
    address: string;
    netmask: string;
    family: string;
}

export interface JavascriptStack {
    message: string;
    stack: string[];
}

export interface NativeStack {
    pc: string;
    symbol: string;
}

export interface JavascriptHeap {
    totalMemory: number;
    executableMemory: number;
    totalCommittedMemory: number;
    availableMemory: number;
    totalGlobalHandlesMemory: number;
    usedGlobalHandlesMemory: number;
    usedMemory: number;
    memoryLimit: number;
    mallocedMemory: number;
    externalMemory: number;
    peakMallocedMemory: number;
    nativeContextCount: number;
    detachedContextCount: number;
    doesZapGarbage: number;
    heapSpaces: HeapSpaces;
}

export interface HeapSpaces {
    read_only_space: ReadOnlySpace;
    new_space: NewSpace;
    old_space: OldSpace;
    code_space: CodeSpace;
    map_space: MapSpace;
    large_object_space: LargeObjectSpace;
    new_large_object_space: NewLargeObjectSpace;
}

export interface ReadOnlySpace {
    memorySize: number;
    committedMemory: number;
    capacity: number;
    used: number;
    available: number;
}

export interface NewSpace {
    memorySize: number;
    committedMemory: number;
    capacity: number;
    used: number;
    available: number;
}

export interface OldSpace {
    memorySize: number;
    committedMemory: number;
    capacity: number;
    used: number;
    available: number;
}

export interface CodeSpace {
    memorySize: number;
    committedMemory: number;
    capacity: number;
    used: number;
    available: number;
}

export interface MapSpace {
    memorySize: number;
    committedMemory: number;
    capacity: number;
    used: number;
    available: number;
}

export interface LargeObjectSpace {
    memorySize: number;
    committedMemory: number;
    capacity: number;
    used: number;
    available: number;
}

export interface NewLargeObjectSpace {
    memorySize: number;
    committedMemory: number;
    capacity: number;
    used: number;
    available: number;
}

export interface ResourceUsage {
    rss: string;
    free_memory: string;
    total_memory: string;
    available_memory: string;
    maxRss: string;
    constrained_memory: string;
    userCpuSeconds: number;
    kernelCpuSeconds: number;
    cpuConsumptionPercent: number;
    userCpuConsumptionPercent: number;
    kernelCpuConsumptionPercent: number;
    pageFaults: PageFaults;
    fsActivity: FsActivity;
}

export interface PageFaults {
    IORequired: number;
    IONotRequired: number;
}

export interface FsActivity {
    reads: number;
    writes: number;
}

export interface UvthreadResourceUsage {
    userCpuSeconds: number;
    kernelCpuSeconds: number;
    cpuConsumptionPercent: number;
    userCpuConsumptionPercent: number;
    kernelCpuConsumptionPercent: number;
    fsActivity: FsActivity2;
}

export interface FsActivity2 {
    reads: number;
    writes: number;
}

export interface Libuv {
    type: string;
    is_active: boolean;
    is_referenced?: boolean;
    address: string;
    details?: string;
    repeat?: number;
    firesInMsFromNow?: number;
    expired?: boolean;
    width?: number;
    height?: number;
    fd?: number;
    writeQueueSize?: number;
    readable?: boolean;
    writable?: boolean;
    signum?: number;
    signal?: string;
    loopIdleTimeSeconds?: number;
}

export interface EnvironmentVariables {
    REMOTEHOST: string;
    MANPATH: string;
    XDG_SESSION_ID: string;
    HOSTNAME: string;
    HOST: string;
    TERM: string;
    SHELL: string;
    SSH_CLIENT: string;
    PERL5LIB: string;
    OLDPWD: string;
    JAVACONFDIRS: string;
    SSH_TTY: string;
    PCP_DIR: string;
    GROUP: string;
    USER: string;
    LD_LIBRARY_PATH: string;
    HOSTTYPE: string;
    XDG_CONFIG_DIRS: string;
    MAIL: string;
    PATH: string;
    PWD: string;
    LANG: string;
    PS1: string;
    SHLVL: string;
    HOME: string;
    OSTYPE: string;
    VENDOR: string;
    PYTHONPATH: string;
    MACHTYPE: string;
    LOGNAME: string;
    XDG_DATA_DIRS: string;
    LESSOPEN: string;
    INFOPATH: string;
    XDG_RUNTIME_DIR: string;
    _: string;
}

export interface UserLimits {
    core_file_size_blocks: CoreFileSizeBlocks;
    data_seg_size_kbytes: DataSegSizeKbytes;
    file_size_blocks: FileSizeBlocks;
    max_locked_memory_bytes: MaxLockedMemoryBytes;
    max_memory_size_kbytes: MaxMemorySizeKbytes;
    open_files: OpenFiles;
    stack_size_bytes: StackSizeBytes;
    cpu_time_seconds: CpuTimeSeconds;
    max_user_processes: MaxUserProcesses;
    virtual_memory_kbytes: VirtualMemoryKbytes;
}

export interface CoreFileSizeBlocks {
    soft: string;
    hard: string;
}

export interface DataSegSizeKbytes {
    soft: string;
    hard: string;
}

export interface FileSizeBlocks {
    soft: string;
    hard: string;
}

export interface MaxLockedMemoryBytes {
    soft: string;
    hard: number;
}

export interface MaxMemorySizeKbytes {
    soft: string;
    hard: string;
}

export interface OpenFiles {
    soft: string;
    hard: number;
}

export interface StackSizeBytes {
    soft: string;
    hard: string;
}

export interface CpuTimeSeconds {
    soft: string;
    hard: string;
}

export interface MaxUserProcesses {
    soft: string;
    hard: number;
}

export interface VirtualMemoryKbytes {
    soft: string;
    hard: string;
}
