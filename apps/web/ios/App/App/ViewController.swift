import UIKit
import Capacitor
import WebKit

class ViewController: CAPBridgeViewController, WKUIDelegate {

    override func capacitorDidLoad() {
        bridge?.webView?.uiDelegate = self
    }

    func webView(_ webView: WKWebView,
                 requestMediaCapturePermissionFor origin: WKSecurityOrigin,
                 initiatedByFrame frame: WKFrameInfo,
                 type: WKMediaCaptureType,
                 decisionHandler: @escaping (WKPermissionDecision) -> Void) {
        decisionHandler(.grant)
    }
}
