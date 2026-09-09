import '../datasources/remote/subscription_datasource.dart';
import '../models/subscription_models.dart';
import '../../core/errors/result.dart';

class SubscriptionsRepository {
  final SubscriptionRemoteDatasource _remote;

  SubscriptionsRepository(this._remote);

  Future<Result<SeatUsage>> getMyUsage() => _remote.getMyUsage();
}
