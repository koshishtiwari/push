import SwiftUI

@main
struct PushApp: App {
    @UIApplicationDelegateAdaptor(AppDelegate.self) var appDelegate

    var body: some Scene {
        WindowGroup {
            ContentView()
                .environmentObject(NotificationManager.shared)
        }
    }
}
