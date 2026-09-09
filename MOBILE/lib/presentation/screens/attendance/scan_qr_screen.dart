import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:mobile_scanner/mobile_scanner.dart';
import 'package:easy_localization/easy_localization.dart';
import '../../../data/models/attendance_v2_models.dart';
import '../../providers/attendance_v2_providers.dart';

class ScanQrScreen extends ConsumerStatefulWidget {
  final AttendanceAction intent;
  const ScanQrScreen({super.key, required this.intent});

  @override
  ConsumerState<ScanQrScreen> createState() => _ScanQrScreenState();
}

class _ScanQrScreenState extends ConsumerState<ScanQrScreen> {
  late final MobileScannerController _controller;
  String? _lastToken;
  bool _isHandling = false;

  @override
  void initState() {
    super.initState();
    _controller = MobileScannerController(formats: [BarcodeFormat.qrCode]);
    // Avoid showing a stale ScanError/ScanSuccess left over from a previous
    // visit to this screen (the provider is shared/global, not autoDispose).
    Future.microtask(
      () => ref.read(attendanceScannerProvider.notifier).reset(),
    );
  }

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  Future<void> _handleScan(String token) async {
    if (_isHandling || token == _lastToken) return;
    _isHandling = true;
    _lastToken = token;
    await ref.read(attendanceScannerProvider.notifier).scanQr(
          token: token,
          intent: widget.intent,
        );
    _isHandling = false;
  }

  String _intentLabel() {
    return switch (widget.intent) {
      AttendanceAction.CHECK_IN => 'attendance.btn_enter'.tr(),
      AttendanceAction.CHECK_OUT => 'attendance.btn_exit'.tr(),
      AttendanceAction.BREAK_START => 'attendance.btn_break_start'.tr(),
      AttendanceAction.BREAK_END => 'attendance.btn_break_end'.tr(),
    };
  }

  Color _intentColor() {
    return switch (widget.intent) {
      AttendanceAction.CHECK_IN => Colors.green.shade600,
      AttendanceAction.CHECK_OUT => Colors.red.shade600,
      AttendanceAction.BREAK_START => Colors.orange.shade700,
      AttendanceAction.BREAK_END => Colors.blue.shade600,
    };
  }

  @override
  Widget build(BuildContext context) {
    final scanState = ref.watch(attendanceScannerProvider);

    // Handle terminal states
    ref.listen(attendanceScannerProvider, (prev, next) {
      if (next is ScanSuccess) {
        Future.delayed(const Duration(milliseconds: 1500), () {
          if (!mounted || !context.mounted) return;
          ref.read(attendanceScannerProvider.notifier).reset();
          context.pop();
        });
      }
      if (next is ScanError) {
        // Allow retry: clear last token after a moment
        Future.delayed(const Duration(seconds: 2), () {
          if (!mounted) return;
          _lastToken = null;
          ref.read(attendanceScannerProvider.notifier).reset();
        });
      }
    });

    return Scaffold(
      appBar: AppBar(
        title: Text(_intentLabel()),
        backgroundColor: _intentColor(),
        foregroundColor: Colors.white,
      ),
      body: Stack(
        children: [
          MobileScanner(
            controller: _controller,
            onDetect: (capture) {
              for (final barcode in capture.barcodes) {
                final token = barcode.rawValue;
                if (token != null && token.isNotEmpty) {
                  _handleScan(token);
                  break;
                }
              }
            },
          ),
          // Hint overlay
          Positioned(
            top: 0,
            left: 0,
            right: 0,
            child: Container(
              padding: const EdgeInsets.symmetric(vertical: 12, horizontal: 16),
              color: Colors.black.withValues(alpha: 0.6),
              child: Text(
                'attendance.scan_qr_hint'.tr(args: [_intentLabel()]),
                textAlign: TextAlign.center,
                style: const TextStyle(color: Colors.white, fontSize: 14),
              ),
            ),
          ),
          // Result overlay
          if (scanState is ScanProcessing) const _ProcessingOverlay(),
          if (scanState is ScanSuccess) _SuccessOverlay(state: scanState),
          if (scanState is ScanError) _ErrorOverlay(state: scanState),
        ],
      ),
    );
  }
}

class _ProcessingOverlay extends StatelessWidget {
  const _ProcessingOverlay();

  @override
  Widget build(BuildContext context) {
    return Container(
      color: Colors.black.withValues(alpha: 0.5),
      child: Center(
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            const CircularProgressIndicator(color: Colors.white),
            const SizedBox(height: 16),
            Text(
              'attendance.scan_in_progress'.tr(),
              style: const TextStyle(color: Colors.white, fontSize: 16),
            ),
          ],
        ),
      ),
    );
  }
}

class _SuccessOverlay extends StatelessWidget {
  final ScanSuccess state;
  const _SuccessOverlay({required this.state});

  @override
  Widget build(BuildContext context) {
    return Container(
      color: Colors.green.shade700.withValues(alpha: 0.92),
      child: Center(
        child: Padding(
          padding: const EdgeInsets.all(24),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              const Icon(Icons.check_circle, color: Colors.white, size: 96),
              const SizedBox(height: 24),
              Text(
                state.response.message,
                textAlign: TextAlign.center,
                style: const TextStyle(
                  color: Colors.white,
                  fontSize: 24,
                  fontWeight: FontWeight.bold,
                ),
              ),
              if (state.response.anomalyType != null) ...[
                const SizedBox(height: 16),
                Text(
                  'attendance.anomaly_warning'.tr(),
                  textAlign: TextAlign.center,
                  style: TextStyle(
                    color: Colors.yellow.shade100,
                    fontSize: 14,
                  ),
                ),
              ],
            ],
          ),
        ),
      ),
    );
  }
}

class _ErrorOverlay extends StatelessWidget {
  final ScanError state;
  const _ErrorOverlay({required this.state});

  @override
  Widget build(BuildContext context) {
    return Container(
      color: Colors.red.shade700.withValues(alpha: 0.92),
      child: Center(
        child: Padding(
          padding: const EdgeInsets.all(24),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              const Icon(Icons.error_outline, color: Colors.white, size: 96),
              const SizedBox(height: 24),
              Text(
                state.message,
                textAlign: TextAlign.center,
                style: const TextStyle(
                  color: Colors.white,
                  fontSize: 20,
                  fontWeight: FontWeight.bold,
                ),
              ),
              const SizedBox(height: 16),
              Text(
                'attendance.scan_retry_hint'.tr(),
                style: TextStyle(color: Colors.red.shade100, fontSize: 14),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
