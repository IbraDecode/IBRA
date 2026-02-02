class Drama {
  final String id;
  final String title;
  final String coverUrl;
  final String? description;
  final int totalEpisodes;
  final List<String> genres;
  final double rating;
  final String? verticalPoster;

  Drama({
    required this.id,
    required this.title,
    required this.coverUrl,
    this.description,
    this.totalEpisodes = 0,
    this.genres = const [],
    this.rating = 0.0,
    this.verticalPoster,
  });

  factory Drama.fromJson(Map<String, dynamic> json) {
    return Drama(
      id: json['id']?.toString() ?? '',
      title: json['title'] ?? 'Unknown Title',
      coverUrl: json['cover_url'] ?? json['poster'] ?? '',
      description: json['introduction'] ?? json['description'],
      totalEpisodes: json['total_episodes'] ?? 0,
      genres: (json['tags'] as List?)?.map((e) => e.toString()).toList() ?? [],
      rating: (json['score'] as num?)?.toDouble() ?? 0.0,
      verticalPoster: json['vertical_poster'],
    );
  }
}
