# Pixel ADB

## Recover the paired Pixel

1. Run `adb devices -l`. Use an entry marked `device`. The Tailscale IP and hostname can both appear for the same phone. Scope device commands with `-s <serial>` and keep using the ADB server that lists it.
2. For an offline entry, check `tailscale status` and retry `adb connect pixel-9-pro-xl:<last-port>` using the port from that entry. Recheck `adb devices -l` when the peer comes online. Check reachability before inferring a port change from a timeout.
3. If the peer is reachable and the old address fails, run `mdns services` with `~/.local/share/anki-streak-build/sdk/platform-tools/adb`. Look for `_adb-tls-connect._tcp`. If the shared server returns `unknown host service`, run the SDK binary with `-P 5038 start-server` and use `-P 5038` for discovery and connection. On the same LAN, `timeout 5 avahi-browse -rt _adb-tls-connect._tcp` can also discover the address. Connect using the existing pairing. Stop only a separate server you started.
4. If the paired Pixel is reachable and mDNS stays empty, use the LAN address from the direct Tailscale endpoint. Run a bounded TCP connect probe on that address for ports 32768–60999. Try any listener with the SDK's `adb -P 5038 connect <address>:<port>` and confirm the serial appears as `device` on that server.

Work through recovery before asking for connection details.

## Verify the app

Check `adb -s <serial> shell dumpsys window` for `isKeyguardShowing=false` before driving the UI. Launch the app as soon as the Pixel unlocks. Confirm app state with `uiautomator dump` after each action. When verifying a saved deck selection, wait for its row to load after reopening the picker. If the phone locks during verification, preserve the current test state and resume when it unlocks.
