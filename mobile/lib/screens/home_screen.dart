import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../providers/content_provider.dart';
import '../widgets/vertical_player_item.dart';

class HomeScreen extends StatefulWidget {
  const HomeScreen({Key? key}) : super(key: key);

  @override
  State<HomeScreen> createState() => _HomeScreenState();
}

class _HomeScreenState extends State<HomeScreen> {
  final PageController _pageController = PageController();

  @override
  void initState() {
    super.initState();
    Future.microtask(() {
      if (mounted) {
        Provider.of<ContentProvider>(context, listen: false).fetchTrending();
      }
    });
  }

  @override
  void dispose() {
    _pageController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: Colors.black,
      body: Consumer<ContentProvider>(
        builder: (context, provider, child) {
          if (provider.isLoading && provider.trendingDramas.isEmpty) {
            return const Center(child: CircularProgressIndicator());
          }

          if (provider.error != null) {
            return Center(child: Text('Error: ${provider.error}'));
          }

          if (provider.trendingDramas.isEmpty) {
            return const Center(child: Text('No dramas found.'));
          }

          return PageView.builder(
            controller: _pageController,
            scrollDirection: Axis.vertical,
            itemCount: provider.trendingDramas.length,
            itemBuilder: (context, index) {
              final drama = provider.trendingDramas[index];
              return VerticalPlayerItem(
                drama: drama,
                onTap: () {
                  // Navigate to full player or details
                  debugPrint('Tapped on ${drama.title}');
                },
              );
            },
          );
        },
      ),
    );
  }
}
