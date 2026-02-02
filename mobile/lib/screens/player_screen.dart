import 'package:flutter/material.dart';
import '../models/drama.dart';

class PlayerScreen extends StatefulWidget {
  final Drama drama;
  final int initialEpisodeIndex;

  const PlayerScreen({
    Key? key,
    required this.drama,
    this.initialEpisodeIndex = 0,
  }) : super(key: key);

  @override
  State<PlayerScreen> createState() => _PlayerScreenState();
}

class _PlayerScreenState extends State<PlayerScreen> {
  // Simple implementation for now
  // Real implementation needs to fetch episode details and stream URL

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: Colors.black,
      appBar: AppBar(
        title: Text(widget.drama.title),
      ),
      body: const Center(
        child: Text(
          'Player Implemented Here\n(Requires Integration with Stream API)',
          textAlign: TextAlign.center,
          style: TextStyle(color: Colors.white),
        ),
      ),
    );
  }
}
