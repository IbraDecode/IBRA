import 'package:flutter/material.dart';
import '../models/session.dart';
import '../services/auth_service.dart';
import '../services/preferences_service.dart';
import '../services/api_service.dart';

class AuthProvider with ChangeNotifier {
  final AuthService _authService;
  final PreferencesService _prefsService;
  final ApiService _apiService;

  Session? _session;
  bool _isLoading = false;

  AuthProvider(this._authService, this._prefsService, this._apiService);

  Session? get session => _session;
  bool get isLoading => _isLoading;
  bool get isAuthenticated => _session?.isValid ?? false;

  Future<void> init() async {
    _isLoading = true;
    notifyListeners();

    try {
      // Try to load from prefs
      _session = _prefsService.getSession();

      if (_session == null || !_session!.isValid) {
        // Perform handshake if no valid session
        _session = await _authService.handshake();
        await _prefsService.saveSession(_session!);
      }

      // Configure API service
      if (_session != null) {
        _apiService.setSession(_session!.token, _session!.deviceId);
      }
    } catch (e) {
      debugPrint('Auth init failed: $e');
      // If handshake fails, we might settle for a degraded state or retry
    } finally {
      _isLoading = false;
      notifyListeners();
    }
  }
}
