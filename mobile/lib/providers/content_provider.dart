import 'package:flutter/material.dart';
import '../models/drama.dart';
import '../services/api_service.dart';

class ContentProvider with ChangeNotifier {
  final ApiService _apiService;

  List<Drama> _trendingDramas = [];
  bool _isLoading = false;
  String? _error;

  ContentProvider(this._apiService);

  List<Drama> get trendingDramas => _trendingDramas;
  bool get isLoading => _isLoading;
  String? get error => _error;

  Future<void> fetchTrending() async {
    if (_isLoading) return;

    _isLoading = true;
    _error = null;
    notifyListeners();

    try {
      final response = await _apiService.get('/content/trending');
      if (response.statusCode == 200) {
        final List data = response.data['data'] ?? [];
        _trendingDramas = data.map((json) => Drama.fromJson(json)).toList();
      } else {
        _error = 'Failed to load trending content';
      }
    } catch (e) {
      _error = e.toString();
    } finally {
      _isLoading = false;
      notifyListeners();
    }
  }
}
