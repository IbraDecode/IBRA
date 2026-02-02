import 'dart:io';
import 'package:device_info_plus/device_info_plus.dart';
import 'package:uuid/uuid.dart';
import '../models/session.dart';
import 'api_service.dart';

class AuthService {
  final ApiService _apiService;

  AuthService(this._apiService);

  Future<String> _getDeviceId() async {
    final deviceInfo = DeviceInfoPlugin();
    String deviceId;
    try {
      if (Platform.isAndroid) {
        final androidInfo = await deviceInfo.androidInfo;
        deviceId = androidInfo.id; // unique ID on Android
      } else if (Platform.isIOS) {
        final iosInfo = await deviceInfo.iosInfo;
        deviceId = iosInfo.identifierForVendor ?? const Uuid().v4();
      } else {
        deviceId = const Uuid().v4();
      }
    } catch (e) {
      deviceId = const Uuid().v4();
    }
    return deviceId;
  }

  Future<Session> handshake() async {
    final deviceId = await _getDeviceId();
    final timestamp = DateTime.now().millisecondsSinceEpoch;

    try {
      final response = await _apiService.post('/client/handshake', data: {
        'device_fingerprint': deviceId,
        'timestamp': timestamp,
        'app_version': '1.0.0',
        'platform': Platform.operatingSystem,
      });

      if (response.statusCode == 200 &&
          response.data['session_token'] != null) {
        final data = response.data;
        return Session(
          token: data['session_token'],
          expiresAt: DateTime.now().millisecondsSinceEpoch +
              ((data['expires_in'] as int) * 1000),
          deviceId: deviceId,
        );
      } else {
        throw Exception('Handshake failed: ${response.statusCode}');
      }
    } catch (e) {
      throw Exception('Handshake error: $e');
    }
  }
}
