import UIKit

class AppDelegate: NSObject, UIApplicationDelegate {

    func application(
        _ application: UIApplication,
        didFinishLaunchingWithOptions launchOptions: [UIApplication.LaunchOptionsKey: Any]? = nil
    ) -> Bool {
        UNUserNotificationCenter.current().delegate = NotificationManager.shared
        NotificationManager.shared.requestPermission()
        return true
    }

    // APNs registered successfully — forward token to our server
    func application(_ application: UIApplication, didRegisterForRemoteNotificationsWithDeviceToken deviceToken: Data) {
        let token = deviceToken.map { String(format: "%02.2hhx", $0) }.joined()
        NotificationManager.shared.deviceToken = token
        Task { await APIClient.shared.registerDevice(token: token) }
    }

    func application(_ application: UIApplication, didFailToRegisterForRemoteNotificationsWithError error: Error) {
        print("[APNs] registration failed: \(error.localizedDescription)")
    }
}
