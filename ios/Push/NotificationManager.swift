import UserNotifications
import UIKit

struct PushNotification: Identifiable {
    let id   = UUID()
    let title: String
    let body:  String
    let date:  Date
}

final class NotificationManager: NSObject, ObservableObject, UNUserNotificationCenterDelegate {
    static let shared = NotificationManager()

    @Published var notifications: [PushNotification] = []
    @Published var deviceToken: String = ""

    var isRegistered: Bool { !deviceToken.isEmpty }

    func requestPermission() {
        UNUserNotificationCenter.current().requestAuthorization(options: [.alert, .sound, .badge]) { granted, _ in
            guard granted else { return }
            DispatchQueue.main.async { UIApplication.shared.registerForRemoteNotifications() }
        }
    }

    // Show banner even when the app is in the foreground
    func userNotificationCenter(
        _ center: UNUserNotificationCenter,
        willPresent notification: UNNotification,
        withCompletionHandler handler: @escaping (UNNotificationPresentationOptions) -> Void
    ) {
        let c = notification.request.content
        DispatchQueue.main.async {
            self.notifications.insert(PushNotification(title: c.title, body: c.body, date: .now), at: 0)
        }
        handler([.banner, .sound, .badge])
    }

    func userNotificationCenter(
        _ center: UNUserNotificationCenter,
        didReceive response: UNNotificationResponse,
        withCompletionHandler handler: @escaping () -> Void
    ) {
        handler()
    }
}
