import 'package:flutter_test/flutter_test.dart';
import 'package:van_stock/data/datasources/remote/vehicle_datasource.dart';
import 'package:van_stock/data/models/vehicle_models.dart';
import 'package:van_stock/data/models/inventory_models.dart';
import 'package:van_stock/data/repositories/vehicle_repository.dart';
import 'package:van_stock/core/errors/result.dart';

// Mock implementation
class MockVehicleRemoteDatasource implements VehicleRemoteDatasource {
  final Map<String, dynamic> _data = {};

  void setupGetMyBookings(Result<List<VehicleBooking>> result) {
    _data['getMyBookings'] = result;
  }

  void setupGetAvailableVans(Result<AvailableVansResponse> result) {
    _data['getAvailableVans'] = result;
  }

  void setupCreateBooking(Result<VehicleBooking> result) {
    _data['createBooking'] = result;
  }

  void setupDeleteBooking(Result<void> result) {
    _data['deleteBooking'] = result;
  }

  @override
  Future<Result<List<VehicleBooking>>> getMyBookings({String? date}) async {
    return _data['getMyBookings'] ?? Failure('Not mocked');
  }

  @override
  Future<Result<AvailableVansResponse>> getAvailableVans(
    String date,
    String period,
  ) async {
    return _data['getAvailableVans'] ?? Failure('Not mocked');
  }

  @override
  Future<Result<VehicleBooking>> createBooking(
    CreateVehicleBookingDto dto,
  ) async {
    return _data['createBooking'] ?? Failure('Not mocked');
  }

  @override
  Future<Result<void>> deleteBooking(int id) async {
    return _data['deleteBooking'] ?? Failure('Not mocked');
  }
}

void main() {
  late MockVehicleRemoteDatasource mockDatasource;
  late VehicleRepository repository;

  setUp(() {
    mockDatasource = MockVehicleRemoteDatasource();
    repository = VehicleRepository(mockDatasource);
  });

  group('VehicleRepository', () {
    group('getMyBookings', () {
      test('returns Success with list of vehicle bookings when datasource succeeds',
          () async {
        // Arrange
        final bookings = [
          VehicleBooking(
            id: 1,
            locationId: 1,
            jobId: 1,
            date: '2026-04-19',
            period: 'morning',
            bookedBy: 1,
            notes: 'Job site van',
            createdAt: '2026-04-19 10:00:00',
            vanName: 'Van A',
            vanPlate: 'ABC123',
            jobTitle: 'Site Installation',
            bookedByName: 'John Doe',
          ),
          VehicleBooking(
            id: 2,
            locationId: 2,
            jobId: 2,
            date: '2026-04-20',
            period: 'afternoon',
            bookedBy: 1,
            notes: null,
            createdAt: '2026-04-20 10:00:00',
            vanName: 'Van B',
            vanPlate: 'XYZ789',
            jobTitle: 'Maintenance',
            bookedByName: 'John Doe',
          ),
        ];

        mockDatasource.setupGetMyBookings(Success(bookings));

        // Act
        final result = await repository.getMyBookings();

        // Assert
        expect(result, isA<Success>());
        result.whenSuccess((bks) {
          expect(bks.length, 2);
          expect(bks[0].id, 1);
          expect(bks[0].vanName, 'Van A');
          expect(bks[1].vanName, 'Van B');
        });
      });

      test('returns Success with list filtered by date when datasource succeeds',
          () async {
        // Arrange
        final bookings = [
          VehicleBooking(
            id: 1,
            locationId: 1,
            jobId: 1,
            date: '2026-04-19',
            period: 'morning',
            bookedBy: 1,
            notes: 'Job site van',
            createdAt: '2026-04-19 10:00:00',
            vanName: 'Van A',
            vanPlate: 'ABC123',
            jobTitle: 'Site Installation',
            bookedByName: 'John Doe',
          ),
        ];

        mockDatasource.setupGetMyBookings(Success(bookings));

        // Act
        final result = await repository.getMyBookings(date: '2026-04-19');

        // Assert
        expect(result, isA<Success>());
        result.whenSuccess((bks) {
          expect(bks.length, 1);
          expect(bks[0].date, '2026-04-19');
        });
      });

      test('returns Success with empty list when no bookings', () async {
        // Arrange
        mockDatasource.setupGetMyBookings(Success([]));

        // Act
        final result = await repository.getMyBookings();

        // Assert
        expect(result, isA<Success>());
        result.whenSuccess((bks) {
          expect(bks.isEmpty, true);
        });
      });

      test('returns Failure when datasource fails', () async {
        // Arrange
        mockDatasource.setupGetMyBookings(Failure('Network error'));

        // Act
        final result = await repository.getMyBookings();

        // Assert
        expect(result, isA<Failure>());
        result.whenFailure((failure) {
          expect(failure, 'Network error');
        });
      });
    });

    group('getAvailableVans', () {
      test('returns Success with AvailableVansResponse when datasource succeeds',
          () async {
        // Arrange
        final availableVans = [
          Location(
            id: 1,
            name: 'Warehouse A',
            type: 'warehouse',
            status: 'active',
            plate: 'ABC123',
            description: 'Main warehouse with vans',
            productCount: 0,
            totalItems: 0,
            createdAt: '2026-04-19',
          ),
          Location(
            id: 2,
            name: 'Warehouse B',
            type: 'warehouse',
            status: 'active',
            plate: 'XYZ789',
            description: 'Secondary warehouse',
            productCount: 0,
            totalItems: 0,
            createdAt: '2026-04-19',
          ),
        ];

        final response = AvailableVansResponse(
          available: availableVans,
          existingBooking: null,
        );

        mockDatasource.setupGetAvailableVans(Success(response));

        // Act
        final result =
            await repository.getAvailableVans('2026-04-19', 'morning');

        // Assert
        expect(result, isA<Success>());
        result.whenSuccess((resp) {
          expect(resp.available.length, 2);
          expect(resp.available[0].name, 'Warehouse A');
          expect(resp.available[0].plate, 'ABC123');
          expect(resp.existingBooking, isNull);
        });
      });

      test(
          'returns Success with AvailableVansResponse including existing booking',
          () async {
        // Arrange
        final availableVans = [
          Location(
            id: 1,
            name: 'Warehouse A',
            type: 'warehouse',
            status: 'active',
            plate: 'ABC123',
            description: 'Main warehouse with vans',
            productCount: 0,
            totalItems: 0,
            createdAt: '2026-04-19',
          ),
        ];

        final existingBooking = VehicleBooking(
          id: 1,
          locationId: 1,
          jobId: 1,
          date: '2026-04-19',
          period: 'morning',
          bookedBy: 1,
          notes: 'Existing booking',
          createdAt: '2026-04-19 10:00:00',
          vanName: 'Van A',
          vanPlate: 'ABC123',
          jobTitle: 'Site Installation',
          bookedByName: 'John Doe',
        );

        final response = AvailableVansResponse(
          available: availableVans,
          existingBooking: existingBooking,
        );

        mockDatasource.setupGetAvailableVans(Success(response));

        // Act
        final result =
            await repository.getAvailableVans('2026-04-19', 'morning');

        // Assert
        expect(result, isA<Success>());
        result.whenSuccess((resp) {
          expect(resp.available.length, 1);
          expect(resp.existingBooking, isNotNull);
          expect(resp.existingBooking?.id, 1);
          expect(resp.existingBooking?.vanName, 'Van A');
        });
      });

      test('returns Failure when datasource fails', () async {
        // Arrange
        mockDatasource.setupGetAvailableVans(Failure('Server error'));

        // Act
        final result =
            await repository.getAvailableVans('2026-04-19', 'morning');

        // Assert
        expect(result, isA<Failure>());
        result.whenFailure((failure) {
          expect(failure, 'Server error');
        });
      });
    });

    group('createBooking', () {
      test('returns Success with created VehicleBooking when datasource succeeds',
          () async {
        // Arrange
        final dto = CreateVehicleBookingDto(
          locationId: 1,
          date: '2026-04-19',
          period: 'morning',
          jobId: 1,
          notes: 'New booking',
        );

        final booking = VehicleBooking(
          id: 1,
          locationId: 1,
          jobId: 1,
          date: '2026-04-19',
          period: 'morning',
          bookedBy: 1,
          notes: 'New booking',
          createdAt: '2026-04-19 10:00:00',
          vanName: 'Van A',
          vanPlate: 'ABC123',
          jobTitle: 'Site Installation',
          bookedByName: 'John Doe',
        );

        mockDatasource.setupCreateBooking(Success(booking));

        // Act
        final result = await repository.createBooking(dto);

        // Assert
        expect(result, isA<Success>());
        result.whenSuccess((bk) {
          expect(bk.id, 1);
          expect(bk.date, '2026-04-19');
          expect(bk.period, 'morning');
          expect(bk.vanName, 'Van A');
        });
      });

      test('returns Failure when datasource fails', () async {
        // Arrange
        final dto = CreateVehicleBookingDto(
          locationId: 999,
          date: '2026-04-19',
          period: 'morning',
          jobId: 1,
          notes: 'New booking',
        );

        mockDatasource.setupCreateBooking(Failure('Location not found'));

        // Act
        final result = await repository.createBooking(dto);

        // Assert
        expect(result, isA<Failure>());
        result.whenFailure((failure) {
          expect(failure, 'Location not found');
        });
      });
    });

    group('deleteBooking', () {
      test('returns Success with void when datasource succeeds', () async {
        // Arrange
        mockDatasource.setupDeleteBooking(Success(null));

        // Act
        final result = await repository.deleteBooking(1);

        // Assert
        expect(result, isA<Success>());
      });

      test('returns Failure when datasource fails', () async {
        // Arrange
        mockDatasource.setupDeleteBooking(Failure('Booking not found'));

        // Act
        final result = await repository.deleteBooking(999);

        // Assert
        expect(result, isA<Failure>());
        result.whenFailure((failure) {
          expect(failure, 'Booking not found');
        });
      });
    });
  });
}
