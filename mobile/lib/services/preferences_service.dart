import 'dart:convert';
import 'package:shared_preferences/shared_preferences.dart';
import '../models/session.dart';

class PreferencesService {
  static const String _keySession = 'ibra_session';

  final SharedPreferences _prefs;

  PreferencesService(this._prefs);

  Future<void> saveSession(Session session) async {
    await _prefs.setString(_keySession, jsonEncode(session.toJson()));
  }

  Session? getSession() {
    final String? jsonStr = _prefs.getString(_keySession);
    if (jsonStr == null) return null;
    try {
      return Session.fromJson(jsonDecode(jsonStr));
    } catch (e) {
      return null;
    }
  }

  Future<void> clearSession() async {
    await _prefs.remove(_keySession);
  }
}
