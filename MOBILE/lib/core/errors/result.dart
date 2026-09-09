/// Result type wrapper per gestire Success/Failure
sealed class Result<T> {
  const Result();

  /// Esegui callback su Success
  void whenSuccess(void Function(T) callback) {
    if (this is Success<T>) {
      callback((this as Success<T>).data);
    }
  }

  /// Esegui callback su Failure
  void whenFailure(void Function(dynamic) callback) {
    if (this is Failure<T>) {
      callback((this as Failure<T>).failure);
    }
  }

  /// Map Success value
  Result<U> map<U>(U Function(T) mapper) {
    return switch (this) {
      Success<T>(:final data) => Success(mapper(data)),
      Failure<T>(:final failure) => Failure(failure),
    };
  }

  /// Ottieni il valore o null
  T? getOrNull() {
    return switch (this) {
      Success<T>(:final data) => data,
      Failure<T>() => null,
    };
  }
}

/// Success result
class Success<T> extends Result<T> {
  final T data;

  const Success(this.data);

  @override
  String toString() => 'Success(data: $data)';
}

/// Failure result
class Failure<T> extends Result<T> {
  final dynamic failure;

  const Failure(this.failure);

  @override
  String toString() => 'Failure(failure: $failure)';
}
