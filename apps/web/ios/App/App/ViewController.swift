import UIKit
import Capacitor
import WebKit

class ViewController: CAPBridgeViewController {
    override func webView(_ webView: WKWebView,
                          requestMediaCapturePermissionFor origin: WKSecurityOrigin,
                          initiatedByFrame frame: WKFrameInfo,
                          type: WKMediaCaptureType,
                          decisionHandler: @escaping (WKPermissionDecision) -> Void) {
        decisionHandler(.grant)
    }
}
