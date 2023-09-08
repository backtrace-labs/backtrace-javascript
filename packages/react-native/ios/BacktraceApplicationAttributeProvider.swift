import Foundation

@objc(ReactNative)
class BacktraceApplicationAttributeProvider: NSObject {

    @objc
    func readApplicationName() -> String {
        return Bundle.main.displayName
    }
    @objc
    func readApplicationVerson() -> String {
        return Bundle.main.releaseVersionNumber
    }
}
