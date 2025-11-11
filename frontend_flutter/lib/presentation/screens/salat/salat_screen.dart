import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../../core/theme/app_colors.dart';

/// Prayer Times (Salat) screen showing daily prayers and monthly calendar
/// Based on HTML template Salat.txt
class SalatScreen extends ConsumerStatefulWidget {
  const SalatScreen({super.key});

  @override
  ConsumerState<SalatScreen> createState() => _SalatScreenState();
}

class _SalatScreenState extends ConsumerState<SalatScreen> {
  // Sample prayer times
  final List<Map<String, dynamic>> _prayers = [
    {'name': 'Fajr', 'time': '4:50 AM', 'completed': false},
    {'name': 'Dhuhr', 'time': '12:15 PM', 'completed': false, 'isCurrent': true},
    {'name': 'Asr', 'time': '3:45 PM', 'completed': false},
    {'name': 'Maghrib', 'time': '6:20 PM', 'completed': false},
    {'name': 'Isha', 'time': '7:45 PM', 'completed': false},
  ];

  int _selectedMonth = 10; // October
  int _selectedYear = 2024;
  int _currentDay = 5;

  bool _notificationPreview = true;

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        leading: IconButton(
          icon: const Icon(Icons.menu),
          onPressed: () => _showNavigationDrawer(context),
        ),
        title: const Text('Salat'),
        centerTitle: true,
        actions: [
          IconButton(
            icon: const Icon(Icons.home_outlined),
            onPressed: () => context.go('/home'),
            tooltip: 'Home',
          ),
        ],
      ),
      drawer: _buildNavigationDrawer(context),
      body: ListView(
        padding: const EdgeInsets.all(16),
        children: [
          // Today's Prayers section
          _buildTodaysPrayersSection(),

          const SizedBox(height: 32),

          // Monthly Prayer Times section
          _buildMonthlyCalendarSection(),

          const SizedBox(height: 32),

          // Quiet Hours section
          _buildNotificationSection(),

          const SizedBox(height: 24),
        ],
      ),
    );
  }

  /// Today's Prayers section
  Widget _buildTodaysPrayersSection() {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          "Today's Prayers",
          style: TextStyle(
            color: AppColors.textLight,
            fontSize: 20,
            fontWeight: FontWeight.w700,
          ),
        ),
        const SizedBox(height: 8),
        Text(
          'Next prayer in 3h 14m',
          style: TextStyle(
            color: AppColors.textLight.withOpacity(0.6),
            fontSize: 14,
          ),
        ),
        const SizedBox(height: 16),

        // Prayer cards
        ...List.generate(_prayers.length, (index) {
          final prayer = _prayers[index];
          return _buildPrayerCard(prayer, index);
        }),
      ],
    );
  }

  /// Individual prayer card
  Widget _buildPrayerCard(Map<String, dynamic> prayer, int index) {
    final isCurrent = prayer['isCurrent'] == true;
    final completed = prayer['completed'] == true;

    return Container(
      margin: const EdgeInsets.only(bottom: 12),
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: isCurrent
            ? AppColors.primary.withOpacity(0.1)
            : AppColors.white.withOpacity(0.05),
        borderRadius: BorderRadius.circular(12),
      ),
      child: Row(
        children: [
          // Prayer info
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  prayer['name'] as String,
                  style: TextStyle(
                    color: AppColors.textLight,
                    fontSize: 16,
                    fontWeight: FontWeight.w600,
                  ),
                ),
                const SizedBox(height: 4),
                Text(
                  prayer['time'] as String,
                  style: TextStyle(
                    color: AppColors.textLight.withOpacity(0.6),
                    fontSize: 14,
                  ),
                ),
              ],
            ),
          ),

          // Toggle switch
          Switch(
            value: completed,
            onChanged: (value) {
              setState(() {
                _prayers[index]['completed'] = value;
              });
            },
            activeColor: AppColors.primary,
          ),
        ],
      ),
    );
  }

  /// Monthly calendar section
  Widget _buildMonthlyCalendarSection() {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          'Monthly Prayer Times',
          style: TextStyle(
            color: AppColors.textLight,
            fontSize: 20,
            fontWeight: FontWeight.w700,
          ),
        ),
        const SizedBox(height: 16),

        // Month/Year selector with navigation
        Row(
          mainAxisAlignment: MainAxisAlignment.spaceBetween,
          children: [
            IconButton(
              icon: const Icon(Icons.chevron_left),
              onPressed: () {
                setState(() {
                  if (_selectedMonth > 1) {
                    _selectedMonth--;
                  } else {
                    _selectedMonth = 12;
                    _selectedYear--;
                  }
                });
              },
            ),
            Text(
              '${_getMonthName(_selectedMonth)} $_selectedYear',
              style: TextStyle(
                color: AppColors.textLight,
                fontSize: 16,
                fontWeight: FontWeight.w600,
              ),
            ),
            IconButton(
              icon: const Icon(Icons.chevron_right),
              onPressed: () {
                setState(() {
                  if (_selectedMonth < 12) {
                    _selectedMonth++;
                  } else {
                    _selectedMonth = 1;
                    _selectedYear++;
                  }
                });
              },
            ),
          ],
        ),

        const SizedBox(height: 16),

        // Calendar grid
        _buildCalendarGrid(),

        const SizedBox(height: 12),

        Text(
          'Times calculated for Makkah (auto-updated)',
          style: TextStyle(
            color: AppColors.textLight.withOpacity(0.6),
            fontSize: 12,
          ),
          textAlign: TextAlign.center,
        ),
      ],
    );
  }

  /// Calendar grid
  Widget _buildCalendarGrid() {
    const daysOfWeek = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];

    return Column(
      children: [
        // Days of week header
        Row(
          mainAxisAlignment: MainAxisAlignment.spaceAround,
          children: daysOfWeek.map((day) {
            return SizedBox(
              width: 40,
              child: Center(
                child: Text(
                  day,
                  style: TextStyle(
                    color: AppColors.textLight.withOpacity(0.6),
                    fontSize: 14,
                    fontWeight: FontWeight.w600,
                  ),
                ),
              ),
            );
          }).toList(),
        ),

        const SizedBox(height: 12),

        // Days grid (simplified - showing 31 days)
        ...List.generate(5, (weekIndex) {
          return Padding(
            padding: const EdgeInsets.only(bottom: 8),
            child: Row(
              mainAxisAlignment: MainAxisAlignment.spaceAround,
              children: List.generate(7, (dayIndex) {
                final dayNumber = weekIndex * 7 + dayIndex + 1;
                if (dayNumber > 31) return const SizedBox(width: 40);

                final isCurrentDay = dayNumber == _currentDay;

                return InkWell(
                  onTap: () {
                    if (mounted) {
                      setState(() {
                        _currentDay = dayNumber;
                      });
                      ScaffoldMessenger.of(context).showSnackBar(
                        SnackBar(
                          content: Text('Prayer times for day $dayNumber'),
                          duration: const Duration(seconds: 1),
                        ),
                      );
                    }
                  },
                  borderRadius: BorderRadius.circular(8),
                  child: Container(
                    width: 40,
                    height: 40,
                    decoration: BoxDecoration(
                      color: isCurrentDay
                          ? AppColors.primary
                          : Colors.transparent,
                      borderRadius: BorderRadius.circular(8),
                    ),
                    child: Center(
                      child: Text(
                        '$dayNumber',
                        style: TextStyle(
                          color: isCurrentDay
                              ? AppColors.white
                              : AppColors.textLight,
                          fontSize: 14,
                          fontWeight: isCurrentDay
                              ? FontWeight.w700
                              : FontWeight.w400,
                        ),
                      ),
                    ),
                  ),
                );
              }),
            ),
          );
        }),
      ],
    );
  }

  /// Notification section
  Widget _buildNotificationSection() {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Row(
          mainAxisAlignment: MainAxisAlignment.spaceBetween,
          children: [
            Text(
              'Notification Preview',
              style: TextStyle(
                color: AppColors.textLight,
                fontSize: 16,
                fontWeight: FontWeight.w600,
              ),
            ),
            Switch(
              value: _notificationPreview,
              onChanged: (value) {
                setState(() {
                  _notificationPreview = value;
                });
              },
              activeColor: AppColors.primary,
            ),
          ],
        ),
      ],
    );
  }

  /// Get month name from number
  String _getMonthName(int month) {
    const months = [
      'January', 'February', 'March', 'April', 'May', 'June',
      'July', 'August', 'September', 'October', 'November', 'December'
    ];
    return months[month - 1];
  }

  /// Show navigation drawer
  void _showNavigationDrawer(BuildContext context) {
    Scaffold.of(context).openDrawer();
  }

  /// Build navigation drawer
  Widget _buildNavigationDrawer(BuildContext context) {
    return Drawer(
      child: Container(
        color: AppColors.backgroundLight,
        child: SafeArea(
          child: Column(
            children: [
              // Header
              Container(
                width: double.infinity,
                padding: const EdgeInsets.all(24),
                decoration: BoxDecoration(
                  gradient: LinearGradient(
                    begin: Alignment.topLeft,
                    end: Alignment.bottomRight,
                    colors: [
                      AppColors.primary,
                      AppColors.primary.withOpacity(0.8),
                    ],
                  ),
                ),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    const Icon(
                      Icons.mosque,
                      color: AppColors.white,
                      size: 48,
                    ),
                    const SizedBox(height: 16),
                    Text(
                      'Umrah & Hajj Guide',
                      style: TextStyle(
                        color: AppColors.white,
                        fontSize: 20,
                        fontWeight: FontWeight.w700,
                      ),
                    ),
                    const SizedBox(height: 4),
                    Text(
                      'Prayer Times',
                      style: TextStyle(
                        color: AppColors.white.withOpacity(0.9),
                        fontSize: 14,
                      ),
                    ),
                  ],
                ),
              ),

              // Menu items
              Expanded(
                child: ListView(
                  padding: const EdgeInsets.symmetric(vertical: 8),
                  children: [
                    _buildDrawerItem(
                      context,
                      icon: Icons.home_outlined,
                      title: 'Home',
                      onTap: () {
                        Navigator.pop(context);
                        context.go('/home');
                      },
                    ),
                    _buildDrawerItem(
                      context,
                      icon: Icons.explore_outlined,
                      title: 'Qibla Direction',
                      onTap: () {
                        Navigator.pop(context);
                        context.go('/qibla');
                      },
                    ),
                    _buildDrawerItem(
                      context,
                      icon: Icons.menu_book_outlined,
                      title: 'Quran',
                      onTap: () {
                        Navigator.pop(context);
                        context.go('/quran');
                      },
                    ),
                    _buildDrawerItem(
                      context,
                      icon: Icons.access_time,
                      title: 'Prayer Times',
                      isSelected: true,
                      onTap: () {
                        Navigator.pop(context);
                      },
                    ),
                    _buildDrawerItem(
                      context,
                      icon: Icons.map_outlined,
                      title: 'Navigation',
                      onTap: () {
                        Navigator.pop(context);
                        context.go('/map');
                      },
                    ),
                    const Divider(height: 32),
                    _buildDrawerItem(
                      context,
                      icon: Icons.person_outline,
                      title: 'Profile',
                      onTap: () {
                        Navigator.pop(context);
                        context.go('/profile');
                      },
                    ),
                    _buildDrawerItem(
                      context,
                      icon: Icons.settings_outlined,
                      title: 'Settings',
                      onTap: () {
                        Navigator.pop(context);
                        if (mounted) {
                          ScaffoldMessenger.of(context).showSnackBar(
                            const SnackBar(content: Text('Settings coming soon')),
                          );
                        }
                      },
                    ),
                    _buildDrawerItem(
                      context,
                      icon: Icons.help_outline,
                      title: 'Help & Support',
                      onTap: () {
                        Navigator.pop(context);
                        if (mounted) {
                          ScaffoldMessenger.of(context).showSnackBar(
                            const SnackBar(content: Text('Help coming soon')),
                          );
                        }
                      },
                    ),
                  ],
                ),
              ),

              // Footer
              Padding(
                padding: const EdgeInsets.all(16),
                child: Text(
                  'Version 1.0.0',
                  style: TextStyle(
                    color: AppColors.textLight.withOpacity(0.5),
                    fontSize: 12,
                  ),
                  textAlign: TextAlign.center,
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }

  /// Build drawer menu item
  Widget _buildDrawerItem(
    BuildContext context, {
    required IconData icon,
    required String title,
    required VoidCallback onTap,
    bool isSelected = false,
  }) {
    return ListTile(
      leading: Icon(
        icon,
        color: isSelected ? AppColors.primary : AppColors.textLight,
      ),
      title: Text(
        title,
        style: TextStyle(
          color: isSelected ? AppColors.primary : AppColors.textLight,
          fontSize: 16,
          fontWeight: isSelected ? FontWeight.w600 : FontWeight.w400,
        ),
      ),
      selected: isSelected,
      selectedTileColor: AppColors.primary.withOpacity(0.1),
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(8),
      ),
      contentPadding: const EdgeInsets.symmetric(horizontal: 24, vertical: 8),
      onTap: onTap,
    );
  }
}
