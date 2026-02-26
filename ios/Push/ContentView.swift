import SwiftUI

struct ContentView: View {
    @EnvironmentObject var manager: NotificationManager

    var body: some View {
        NavigationStack {
            Group {
                if manager.notifications.isEmpty {
                    emptyState
                } else {
                    notificationList
                }
            }
            .navigationTitle("Push")
            .toolbar {
                ToolbarItem(placement: .topBarTrailing) {
                    // Green dot when device token is registered with the server
                    Image(systemName: manager.isRegistered ? "checkmark.circle.fill" : "circle.dashed")
                        .foregroundStyle(manager.isRegistered ? Color.green : Color.secondary)
                        .help(manager.isRegistered ? "Registered" : "Not registered")
                }
            }
        }
    }

    private var emptyState: some View {
        VStack(spacing: 14) {
            Image(systemName: "bell.badge")
                .font(.system(size: 56))
                .foregroundStyle(.secondary)

            Text("No notifications yet")
                .font(.headline)
                .foregroundStyle(.secondary)

            Text("curl -X POST \(Config.serverURL)/push \\\n  -H 'x-api-key: …' \\\n  -d '{\"title\":\"hi\",\"body\":\"world\"}'")
                .font(.system(.caption2, design: .monospaced))
                .multilineTextAlignment(.leading)
                .foregroundStyle(.tertiary)
                .padding(.horizontal)
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity)
    }

    private var notificationList: some View {
        List(manager.notifications) { note in
            VStack(alignment: .leading, spacing: 5) {
                HStack(alignment: .top) {
                    Text(note.title)
                        .font(.headline)
                    Spacer()
                    Text(note.date, style: .relative)
                        .font(.caption2)
                        .foregroundStyle(.tertiary)
                }
                Text(note.body)
                    .font(.subheadline)
                    .foregroundStyle(.secondary)
            }
            .padding(.vertical, 3)
        }
        .listStyle(.insetGrouped)
    }
}
