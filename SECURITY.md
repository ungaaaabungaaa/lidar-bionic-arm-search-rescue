# Security and reporting

The lab is local static code with no login, device interface, remote service or analytics. Its included server binds127.0.0.1 and serves a fixed public file list with GET/HEAD only, Host validation, no-cache, no-sniff and a restrictive content policy. Do not expose the development server to an untrusted network or remove the file/Host checks casually.

Cloud files are untrusted: the CLI reads at most2MiB before parsing; exact schema, units, finite numbers, transform, point count and neighbor-work limits apply. Reports are bounded and exports never overwrite a file through the CLI. Browser values are inserted as text, not HTML. The browser does not import arbitrary executable code or access a device. CRC detects accidental corruption; it is not authentication or encryption. The setpoint latch is only an emulator, not a physical safety controller.

For a security issue, use the repository's private vulnerability reporting feature when available; otherwise ask the maintainer for a private contact without posting exploit data, credentials or sensitive scans in a public issue. A fix should include a bounded regression and state whether any device or physical configuration is affected. No response-time guarantee is offered.
