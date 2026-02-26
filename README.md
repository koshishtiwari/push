# push

Personal push notification server. Send a notification to your iPhone from anything with one curl call.

## Send a notification

```bash
curl -X POST https://push-backend.up.railway.app/push \
  -H "x-api-key: 77f95da2577330514d02a6867c7c1e2bfe98565b96dfff010280f090adeb3caf" \
  -H "Content-Type: application/json" \
  -d '{"title":"Hello","body":"It works"}'
```

With custom data payload:

```bash
curl -X POST https://push-backend.up.railway.app/push \
  -H "x-api-key: 77f95da2577330514d02a6867c7c1e2bfe98565b96dfff010280f090adeb3caf" \
  -H "Content-Type: application/json" \
  -d '{"title":"BTC Signal","body":"BUY at $95k","data":{"asset":"BTC","action":"buy"}}'
```

## Other endpoints

```bash
# Health check
curl https://push-backend.up.railway.app/health

# Check registered device
curl https://push-backend.up.railway.app/device \
  -H "x-api-key: 77f95da2577330514d02a6867c7c1e2bfe98565b96dfff010280f090adeb3caf"

# Last 50 notifications sent
curl https://push-backend.up.railway.app/notifications \
  -H "x-api-key: 77f95da2577330514d02a6867c7c1e2bfe98565b96dfff010280f090adeb3caf"
```

## Notes

- Open the iOS app at least once to register your device token before sending
- `APNS_PRODUCTION=false` for Xcode direct installs, `true` for TestFlight


