import Foundation
import UIKit

final class APIClient {
    static let shared = APIClient()

    private var baseURL: String { Config.serverURL }
    private var apiKey:  String { Config.apiKey }

    func registerDevice(token: String) async {
        guard let url = URL(string: "\(baseURL)/register") else { return }

        var req = URLRequest(url: url)
        req.httpMethod = "POST"
        req.setValue("application/json",  forHTTPHeaderField: "Content-Type")
        req.setValue(apiKey,              forHTTPHeaderField: "x-api-key")
        req.httpBody = try? JSONEncoder().encode([
            "token":       token,
            "device_name": UIDevice.current.name,
        ])

        do {
            let (_, response) = try await URLSession.shared.data(for: req)
            let status = (response as? HTTPURLResponse)?.statusCode ?? 0
            print("[push] registered device, HTTP \(status)")
        } catch {
            print("[push] register failed: \(error.localizedDescription)")
        }
    }
}
