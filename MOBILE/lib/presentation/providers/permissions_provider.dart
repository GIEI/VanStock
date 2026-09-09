import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../data/services/permissions_service.dart';

final permissionsServiceProvider = Provider((ref) {
  return PermissionsService();
});
