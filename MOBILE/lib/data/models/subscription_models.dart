class SeatUsage {
  final String planType;
  final int maxSeats;
  final int usedSeats;
  final String? expiresAt;
  final String status;

  const SeatUsage({
    required this.planType,
    required this.maxSeats,
    required this.usedSeats,
    required this.expiresAt,
    required this.status,
  });

  factory SeatUsage.fromJson(Map<String, dynamic> json) => SeatUsage(
        planType:  (json['plan_type'] ?? 'BASIC').toString(),
        maxSeats:  (json['max_seats']  as num?)?.toInt() ?? 0,
        usedSeats: (json['used_seats'] as num?)?.toInt() ?? 0,
        expiresAt: json['expires_at']?.toString(),
        status:    (json['status'] ?? 'ACTIVE').toString(),
      );

  bool  get isFull     => maxSeats > 0 && usedSeats >= maxSeats;
  double get ratio     => maxSeats == 0 ? 0 : usedSeats / maxSeats;
  bool  get isWarning  => !isFull && ratio >= 0.8;
}
