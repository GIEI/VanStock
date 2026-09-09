import '../datasources/remote/auth_datasource.dart';
import '../models/auth_models.dart';
import '../../core/errors/result.dart';

class AuthRepository {
  final AuthRemoteDatasource _remoteDatasource;

  AuthRepository(this._remoteDatasource);

  Future<Result<LoginResponse>> login(LoginRequest request) =>
      _remoteDatasource.login(request);

  Future<Result<AuthUser>> me() => _remoteDatasource.me();
}
