@objc(ReactNative)
class BacktraceSystemAttributeProvider: NSObject {
    private let applicationGuidKey = "backtrace.unique.user.identifier"

    @objc
    func readMachineId() -> String{
        if let uuidString: String = store.value(forKey: applicationGuidKey), let uuid = UUID(uuidString: uuidString) {
            return uuid
        } else {
            let uuid = UUID()
            store.store(uuid.uuidString, forKey: applicationGuidKey)
            return uuid
        }
    }
    
    @objc
    func readOperatingSystemName() -> {
    #if os(iOS)
            return "iOS"
    #elseif os(tvOS)
            return "tvOS"
    #elseif os(macOS)
            return "macOS"
    #else
            return "Unsupported device"
    #endif
    }
    
}
