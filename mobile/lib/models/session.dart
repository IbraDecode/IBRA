class Session {
  final String token;
  final String deviceId;
  final int expiresAt;

  Session({
    required this.token,
    required this.deviceId,
    required this.expiresAt,
  });

  bool get isValid =>
      DateTime.now().millisecondsSinceEpoch <
      expiresAt; // Simplified, will fix in proper file

  factory Session.fromJson(Map<String, dynamic> json) {
    return Session(
      token: json['token'] ?? '',
      deviceId: json['deviceId'] ?? '',
      expiresAt: json['expiresAt'] ?? 0,
    );
  }

  Map<String, dynamic> toJson() => {
        'token': token,
        'deviceId': deviceId,
        'expiresAt': expiresAt,
      };
}
