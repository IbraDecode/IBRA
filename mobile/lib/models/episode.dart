class Episode {
  final String id;
  final String title;
  final int index;
  final String? coverUrl;
  final String? videoUrl; // For direct stream if available
  final int duration;

  Episode({
    required this.id,
    required this.title,
    required this.index,
    this.coverUrl,
    this.videoUrl,
    this.duration = 0,
  });

  factory Episode.fromJson(Map<String, dynamic> json) {
    return Episode(
      id: json['id']?.toString() ?? '',
      title: json['title'] ?? 'Episode ${json['index'] ?? 1}',
      index: json['index'] ?? 0,
      coverUrl: json['cover'],
      videoUrl: json['url'], // Might be null, fetched separately usually
      duration: json['duration'] ?? 0,
    );
  }
}
