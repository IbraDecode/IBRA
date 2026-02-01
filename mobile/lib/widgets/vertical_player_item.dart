import 'package:flutter/material.dart';
import 'package:cached_network_image/cached_network_image.dart';
import 'package:provider/provider.dart';
import '../models/drama.dart';
import '../providers/user_data_provider.dart';

class VerticalPlayerItem extends StatefulWidget {
  final Drama drama;
  final VoidCallback onTap;

  const VerticalPlayerItem({
    Key? key,
    required this.drama,
    required this.onTap,
  }) : super(key: key);

  @override
  State<VerticalPlayerItem> createState() => _VerticalPlayerItemState();
}

class _VerticalPlayerItemState extends State<VerticalPlayerItem> {
  // Placeholder for actual video logic.
  // In a real app, we'd pre-load the next video and dispose the previous.
  // For the feed preview, we might just show the poster or a Loop.
  // Assuming the feed plays a trailer or the first episode.

  @override
  Widget build(BuildContext context) {
    return Stack(
      fit: StackFit.expand,
      children: [
        // Background Image (Poster)
        CachedNetworkImage(
          imageUrl: widget.drama.verticalPoster ?? widget.drama.coverUrl,
          fit: BoxFit.cover,
          placeholder: (context, url) => Container(color: Colors.black),
          errorWidget: (context, url, error) => const Icon(Icons.error),
        ),

        // Gradient Overlay
        DecoratedBox(
          decoration: BoxDecoration(
            gradient: LinearGradient(
              colors: [
                Colors.black.withValues(alpha: 0.6),
                Colors.transparent,
                Colors.black.withValues(alpha: 0.6),
              ],
              begin: Alignment.topCenter,
              end: Alignment.bottomCenter,
            ),
          ),
        ),

        // Info Overlay
        Positioned(
          bottom: 20,
          left: 16,
          right: 16,
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            mainAxisSize: MainAxisSize.min,
            children: [
              Text(
                widget.drama.title,
                style: Theme.of(context).textTheme.headlineSmall?.copyWith(
                      color: Colors.white,
                      fontWeight: FontWeight.bold,
                    ),
              ),
              const SizedBox(height: 8),
              if (widget.drama.description != null)
                Text(
                  widget.drama.description!,
                  maxLines: 2,
                  overflow: TextOverflow.ellipsis,
                  style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                        color: Colors.white70,
                      ),
                ),
              const SizedBox(height: 16),
              Row(
                children: [
                  ElevatedButton.icon(
                    onPressed: widget.onTap,
                    icon: const Icon(Icons.play_arrow),
                    label: const Text('Tonton Sekarang'),
                    style: ElevatedButton.styleFrom(
                      backgroundColor: Theme.of(context).primaryColor,
                      foregroundColor: Colors.white,
                    ),
                  ),
                  const SizedBox(width: 16),
                  Consumer<UserDataProvider>(
                    builder: (context, userData, _) {
                      final isFav = userData.isFavorite(widget.drama.id);
                      return IconButton(
                        onPressed: () => userData.toggleFavorite(widget.drama),
                        icon: Icon(
                          isFav ? Icons.favorite : Icons.favorite_border,
                          color: isFav ? Colors.red : Colors.white,
                        ),
                      );
                    },
                  ),
                ],
              ),
              const SizedBox(height: 40), // Space for bottom nav
            ],
          ),
        ),
      ],
    );
  }
}
