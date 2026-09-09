abstract class Failure {
  final String message;

  Failure(this.message);

  @override
  String toString() => message;
}

class ServerFailure extends Failure {
  final int? statusCode;

  ServerFailure({
    String message = 'Server error occurred',
    this.statusCode,
  }) : super(message);
}

class NetworkFailure extends Failure {
  NetworkFailure({String message = 'Network error occurred'}) : super(message);
}

class AuthenticationFailure extends Failure {
  AuthenticationFailure({String message = 'Authentication failed'}) : super(message);
}

class ValidationFailure extends Failure {
  ValidationFailure({String message = 'Validation failed'}) : super(message);
}

class UnknownFailure extends Failure {
  UnknownFailure({String message = 'Unknown error occurred'}) : super(message);
}
