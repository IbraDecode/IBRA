import 'package:flutter/material.dart';
import '../models/drama.dart';
import '../services/api_service.dart';

class UserDataProvider with ChangeNotifier {
  final ApiService _apiService;

  Set<String> _favoriteIds = {};
  bool _isLoading = false;

  UserDataProvider(this._apiService);

  bool isFavorite(String dramaId) => _favoriteIds.contains(dramaId);
  bool get isLoading => _isLoading;

  Future<void> fetchFavorites() async {
    _isLoading = true;
    notifyListeners();
    try {
      final response = await _apiService.get('/local/favorites');
      if (response.statusCode == 200) {
        final List data = response.data['data'] ?? [];
        _favoriteIds = data.map((e) => e['drama_id'].toString()).toSet();
      }
    } catch (e) {
      debugPrint('Error fetching favorites: $e');
    } finally {
      _isLoading = false;
      notifyListeners();
    }
  }

  Future<void> toggleFavorite(Drama drama) async {
    final isFav = isFavorite(drama.id);

    // Optimistic update
    if (isFav) {
      _favoriteIds.remove(drama.id);
    } else {
      _favoriteIds.add(drama.id);
    }
    notifyListeners();

    try {
      if (isFav) {
        await _apiService.delete('/local/favorite/${drama.id}');
      } else {
        await _apiService.post('/local/favorite', data: {
          'drama_id': drama.id,
          'drama_title': drama.title,
          'poster_url': drama.coverUrl,
          'total_episodes': drama.totalEpisodes,
        });
      }
    } catch (e) {
      // Revert on error
      if (isFav) {
        _favoriteIds.add(drama.id);
      } else {
        _favoriteIds.remove(drama.id);
      }
      notifyListeners();
      debugPrint('Error toggling favorite: $e');
    }
  }
}
