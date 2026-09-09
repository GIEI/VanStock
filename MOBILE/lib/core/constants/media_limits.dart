/// Per-plan upload quotas for job photos and videos.
/// Must stay in sync with backend/src/services/media-limits.js.
class MediaQuota {
  final int image;
  final int video;
  const MediaQuota({required this.image, required this.video});

  /// Convention: 9999+ is treated as unlimited (matches server's Infinity).
  static const int unlimited = 9999;
  bool isUnlimitedImage() => image >= unlimited;
  bool isUnlimitedVideo() => video >= unlimited;
}

class MediaLimits {
  static const Map<String, MediaQuota> _byPlan = {
    'BASIC':      MediaQuota(image: 1, video: 0),
    'PRO':        MediaQuota(image: 3, video: 1),
    'ENTERPRISE': MediaQuota(image: MediaQuota.unlimited, video: MediaQuota.unlimited),
  };

  static MediaQuota forPlan(String? plan) {
    return _byPlan[plan ?? 'BASIC'] ?? _byPlan['BASIC']!;
  }
}
