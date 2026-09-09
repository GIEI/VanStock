import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:easy_localization/easy_localization.dart';

class VehicleDetailScreen extends ConsumerWidget {
  final int bookingId;

  const VehicleDetailScreen({super.key, required this.bookingId});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    return Scaffold(
      appBar: AppBar(title: Text('vehicles.detail_title'.tr())),
      body: Center(
        child: Text('common.loading'.tr()),
      ),
    );
  }
}
