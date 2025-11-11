import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../../core/theme/app_colors.dart';

/// Saved Items screen showing bookmarked content
class SavedItemsScreen extends ConsumerStatefulWidget {
  const SavedItemsScreen({super.key});

  @override
  ConsumerState<SavedItemsScreen> createState() => _SavedItemsScreenState();
}

class _SavedItemsScreenState extends ConsumerState<SavedItemsScreen>
    with SingleTickerProviderStateMixin {
  late TabController _tabController;

  final List<SavedItem> _savedSurahs = [
    SavedItem(
      title: 'Al-Fatihah',
      subtitle: 'Surah 1 • 7 verses',
      icon: Icons.menu_book,
      savedDate: 'Saved 2 days ago',
    ),
    SavedItem(
      title: 'Ayat al-Kursi',
      subtitle: 'Surah 2:255',
      icon: Icons.menu_book,
      savedDate: 'Saved 1 week ago',
    ),
    SavedItem(
      title: 'Surah Yaseen',
      subtitle: 'Surah 36 • 83 verses',
      icon: Icons.menu_book,
      savedDate: 'Saved 2 weeks ago',
    ),
  ];

  final List<SavedItem> _savedPrayers = [
    SavedItem(
      title: 'Prayer Time Reminder',
      subtitle: 'Fajr - 4:50 AM',
      icon: Icons.access_time,
      savedDate: 'Today',
    ),
    SavedItem(
      title: 'Custom Prayer Alert',
      subtitle: 'Maghrib - 15 min before',
      icon: Icons.notifications,
      savedDate: 'Yesterday',
    ),
  ];

  final List<SavedItem> _savedLocations = [
    SavedItem(
      title: 'Masjid al-Haram',
      subtitle: 'Makkah, Saudi Arabia',
      icon: Icons.location_on,
      savedDate: 'Saved 1 month ago',
    ),
    SavedItem(
      title: 'Masjid an-Nabawi',
      subtitle: 'Madinah, Saudi Arabia',
      icon: Icons.location_on,
      savedDate: 'Saved 1 month ago',
    ),
  ];

  @override
  void initState() {
    super.initState();
    _tabController = TabController(length: 3, vsync: this);
  }

  @override
  void dispose() {
    _tabController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        leading: IconButton(
          icon: const Icon(Icons.arrow_back),
          onPressed: () => context.go('/profile'),
        ),
        title: const Text('Saved Items'),
        centerTitle: true,
        actions: [
          IconButton(
            icon: const Icon(Icons.home_outlined),
            onPressed: () => context.go('/home'),
            tooltip: 'Home',
          ),
        ],
        bottom: TabBar(
          controller: _tabController,
          labelColor: AppColors.primary,
          unselectedLabelColor: AppColors.textLight.withOpacity(0.5),
          indicatorColor: AppColors.primary,
          tabs: const [
            Tab(text: 'Quran', icon: Icon(Icons.menu_book, size: 20)),
            Tab(text: 'Prayers', icon: Icon(Icons.access_time, size: 20)),
            Tab(text: 'Places', icon: Icon(Icons.location_on, size: 20)),
          ],
        ),
      ),
      body: TabBarView(
        controller: _tabController,
        children: [
          _buildItemsList(_savedSurahs, 'Quran verses'),
          _buildItemsList(_savedPrayers, 'prayer times'),
          _buildItemsList(_savedLocations, 'locations'),
        ],
      ),
    );
  }

  Widget _buildItemsList(List<SavedItem> items, String type) {
    if (items.isEmpty) {
      return _buildEmptyState(type);
    }

    return ListView.builder(
      padding: const EdgeInsets.all(16),
      itemCount: items.length,
      itemBuilder: (context, index) {
        final item = items[index];
        return _buildSavedItem(item, () {
          _removeSavedItem(items, index, item.title);
        });
      },
    );
  }

  Widget _buildEmptyState(String type) {
    return Center(
      child: Padding(
        padding: const EdgeInsets.all(32),
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Icon(
              Icons.bookmark_border,
              size: 80,
              color: AppColors.textLight.withOpacity(0.3),
            ),
            const SizedBox(height: 24),
            Text(
              'No Saved $type',
              style: TextStyle(
                fontSize: 20,
                fontWeight: FontWeight.w600,
                color: AppColors.textLight.withOpacity(0.7),
              ),
            ),
            const SizedBox(height: 12),
            Text(
              'Start saving your favorite $type to access them quickly',
              style: TextStyle(
                fontSize: 14,
                color: AppColors.textLight.withOpacity(0.5),
              ),
              textAlign: TextAlign.center,
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildSavedItem(SavedItem item, VoidCallback onRemove) {
    return Dismissible(
      key: Key(item.title + item.savedDate),
      direction: DismissDirection.endToStart,
      background: Container(
        alignment: Alignment.centerRight,
        padding: const EdgeInsets.only(right: 20),
        margin: const EdgeInsets.only(bottom: 12),
        decoration: BoxDecoration(
          color: AppColors.error,
          borderRadius: BorderRadius.circular(12),
        ),
        child: const Icon(
          Icons.delete,
          color: AppColors.white,
          size: 28,
        ),
      ),
      confirmDismiss: (direction) async {
        return await showDialog(
          context: context,
          builder: (context) => AlertDialog(
            title: const Text('Remove Item?'),
            content: Text('Remove "${item.title}" from saved items?'),
            actions: [
              TextButton(
                onPressed: () => Navigator.pop(context, false),
                child: const Text('Cancel'),
              ),
              TextButton(
                onPressed: () => Navigator.pop(context, true),
                child: const Text(
                  'Remove',
                  style: TextStyle(color: AppColors.error),
                ),
              ),
            ],
          ),
        );
      },
      onDismissed: (direction) {
        onRemove();
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('${item.title} removed'),
            action: SnackBarAction(
              label: 'Undo',
              onPressed: () {
                // TODO: Implement undo functionality
                ScaffoldMessenger.of(context).showSnackBar(
                  const SnackBar(content: Text('Undo not implemented yet')),
                );
              },
            ),
          ),
        );
      },
      child: Container(
        margin: const EdgeInsets.only(bottom: 12),
        decoration: BoxDecoration(
          color: AppColors.subtleLight,
          borderRadius: BorderRadius.circular(12),
        ),
        child: Material(
          color: Colors.transparent,
          child: InkWell(
            onTap: () {
              ScaffoldMessenger.of(context).showSnackBar(
                SnackBar(content: Text('Opening ${item.title}...')),
              );
            },
            borderRadius: BorderRadius.circular(12),
            child: Padding(
              padding: const EdgeInsets.all(16),
              child: Row(
                children: [
                  // Icon
                  Container(
                    padding: const EdgeInsets.all(12),
                    decoration: BoxDecoration(
                      color: AppColors.primary.withOpacity(0.1),
                      borderRadius: BorderRadius.circular(10),
                    ),
                    child: Icon(
                      item.icon,
                      color: AppColors.primary,
                      size: 24,
                    ),
                  ),
                  const SizedBox(width: 16),

                  // Content
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          item.title,
                          style: const TextStyle(
                            fontSize: 16,
                            fontWeight: FontWeight.w600,
                            color: AppColors.textLight,
                          ),
                        ),
                        const SizedBox(height: 4),
                        Text(
                          item.subtitle,
                          style: TextStyle(
                            fontSize: 14,
                            color: AppColors.textLight.withOpacity(0.6),
                          ),
                        ),
                        const SizedBox(height: 4),
                        Text(
                          item.savedDate,
                          style: TextStyle(
                            fontSize: 12,
                            color: AppColors.textLight.withOpacity(0.5),
                          ),
                        ),
                      ],
                    ),
                  ),

                  // Action Buttons
                  PopupMenuButton<String>(
                    icon: Icon(
                      Icons.more_vert,
                      color: AppColors.textLight.withOpacity(0.5),
                    ),
                    onSelected: (value) {
                      if (value == 'share') {
                        ScaffoldMessenger.of(context).showSnackBar(
                          SnackBar(content: Text('Sharing ${item.title}...')),
                        );
                      } else if (value == 'remove') {
                        onRemove();
                      }
                    },
                    itemBuilder: (context) => [
                      const PopupMenuItem(
                        value: 'share',
                        child: Row(
                          children: [
                            Icon(Icons.share, size: 20),
                            SizedBox(width: 12),
                            Text('Share'),
                          ],
                        ),
                      ),
                      const PopupMenuItem(
                        value: 'remove',
                        child: Row(
                          children: [
                            Icon(Icons.delete, size: 20, color: AppColors.error),
                            SizedBox(width: 12),
                            Text(
                              'Remove',
                              style: TextStyle(color: AppColors.error),
                            ),
                          ],
                        ),
                      ),
                    ],
                  ),
                ],
              ),
            ),
          ),
        ),
      ),
    );
  }

  void _removeSavedItem(List<SavedItem> items, int index, String title) {
    setState(() {
      items.removeAt(index);
    });
  }
}

class SavedItem {
  final String title;
  final String subtitle;
  final IconData icon;
  final String savedDate;

  SavedItem({
    required this.title,
    required this.subtitle,
    required this.icon,
    required this.savedDate,
  });
}
