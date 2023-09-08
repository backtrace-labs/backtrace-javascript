@objc(ReactNative)
class BacktraceDeviceAttributeProvider: NSObject {

    @objc
    func getDeviceModel() {
        return try? System.model() else { "Unknown" };
    }
    
    @objc
    func getMachineInfo() {
        return try? System.machine() else { "Unknown" };
    }
}
