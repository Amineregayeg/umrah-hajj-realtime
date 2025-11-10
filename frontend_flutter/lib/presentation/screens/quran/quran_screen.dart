import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/theme/app_colors.dart';

/// Quran screen showing list of all 114 Surahs with search and filters
/// Based on HTML template Quran.txt
class QuranScreen extends ConsumerStatefulWidget {
  const QuranScreen({super.key});

  @override
  ConsumerState<QuranScreen> createState() => _QuranScreenState();
}

class _QuranScreenState extends ConsumerState<QuranScreen> {
  final TextEditingController _searchController = TextEditingController();
  String _selectedFilter = 'All'; // All, Makki, Madani

  // Sample Surah data (first 6 from HTML template)
  final List<Map<String, dynamic>> _surahs = [
    {'number': 1, 'nameAr': 'الفاتحة', 'nameEn': 'Al-Fatihah', 'type': 'Makki'},
    {'number': 2, 'nameAr': 'البقرة', 'nameEn': 'Al-Baqarah', 'type': 'Madani'},
    {'number': 3, 'nameAr': 'آل عمران', 'nameEn': "Ali 'Imran", 'type': 'Madani'},
    {'number': 4, 'nameAr': 'النساء', 'nameEn': 'An-Nisa', 'type': 'Madani'},
    {'number': 5, 'nameAr': 'المائدة', 'nameEn': "Al-Ma'idah", 'type': 'Madani'},
    {'number': 6, 'nameAr': 'الأنعام', 'nameEn': "Al-An'am", 'type': 'Makki'},
  ];

  @override
  void dispose() {
    _searchController.dispose();
    super.dispose();
  }

  List<Map<String, dynamic>> get _filteredSurahs {
    var filtered = _surahs;

    // Apply type filter
    if (_selectedFilter != 'All') {
      filtered = filtered.where((s) => s['type'] == _selectedFilter).toList();
    }

    // Apply search filter
    final query = _searchController.text.toLowerCase();
    if (query.isNotEmpty) {
      filtered = filtered.where((s) =>
        s['nameEn'].toString().toLowerCase().contains(query) ||
        s['nameAr'].toString().contains(query)
      ).toList();
    }

    return filtered;
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: SafeArea(
        child: Column(
          children: [
            // Sticky header
            _buildHeader(),

            // Search bar
            _buildSearchBar(),

            // Filter buttons
            _buildFilterButtons(),

            const SizedBox(height: 16),

            // Surah list
            Expanded(
              child: _buildSurahList(),
            ),
          ],
        ),
      ),
    );
  }

  /// Header with title and bookmark button
  Widget _buildHeader() {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
      decoration: BoxDecoration(
        color: AppColors.backgroundLight.withOpacity(0.8),
        border: Border(
          bottom: BorderSide(
            color: Colors.grey.withOpacity(0.2),
            width: 1,
          ),
        ),
      ),
      child: Row(
        children: [
          const Spacer(),
          Text(
            'Qur\'an',
            style: TextStyle(
              color: AppColors.textLight,
              fontSize: 20,
              fontWeight: FontWeight.w700,
            ),
          ),
          const Spacer(),
          IconButton(
            icon: Icon(Icons.bookmark_border, color: AppColors.textLight),
            onPressed: () {
              if (mounted) {
                ScaffoldMessenger.of(context).showSnackBar(
                  const SnackBar(content: Text('Bookmarks coming soon')),
                );
              }
            },
          ),
        ],
      ),
    );
  }

  /// Search bar
  Widget _buildSearchBar() {
    return Padding(
      padding: const EdgeInsets.all(16.0),
      child: TextField(
        controller: _searchController,
        onChanged: (value) => setState(() {}),
        style: TextStyle(color: AppColors.textLight),
        decoration: InputDecoration(
          hintText: 'Search Surah or Ayah',
          hintStyle: TextStyle(
            color: AppColors.placeholderLight,
          ),
          prefixIcon: Icon(
            Icons.search,
            color: AppColors.textLight.withOpacity(0.6),
          ),
          filled: true,
          fillColor: AppColors.subtleLight,
          border: OutlineInputBorder(
            borderRadius: BorderRadius.circular(12),
            borderSide: BorderSide.none,
          ),
          focusedBorder: OutlineInputBorder(
            borderRadius: BorderRadius.circular(12),
            borderSide: BorderSide(color: AppColors.primary, width: 2),
          ),
          contentPadding: const EdgeInsets.symmetric(vertical: 16),
        ),
      ),
    );
  }

  /// Filter buttons (All, Makki, Madani)
  Widget _buildFilterButtons() {
    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 16.0),
      child: Row(
        children: [
          _buildFilterChip('All'),
          const SizedBox(width: 12),
          _buildFilterChip('Makki'),
          const SizedBox(width: 12),
          _buildFilterChip('Madani'),
        ],
      ),
    );
  }

  Widget _buildFilterChip(String label) {
    final isSelected = _selectedFilter == label;
    return FilterChip(
      label: Text(label),
      selected: isSelected,
      onSelected: (selected) {
        setState(() {
          _selectedFilter = label;
        });
      },
      backgroundColor: AppColors.primary.withOpacity(0.1),
      selectedColor: AppColors.primary.withOpacity(0.3),
      labelStyle: TextStyle(
        color: AppColors.primary,
        fontWeight: isSelected ? FontWeight.w700 : FontWeight.w500,
      ),
      side: BorderSide.none,
    );
  }

  /// Surah list
  Widget _buildSurahList() {
    final filteredSurahs = _filteredSurahs;

    if (filteredSurahs.isEmpty) {
      return Center(
        child: Text(
          'No surahs found',
          style: TextStyle(
            color: AppColors.textLight.withOpacity(0.6),
            fontSize: 16,
          ),
        ),
      );
    }

    return ListView.builder(
      itemCount: filteredSurahs.length,
      padding: const EdgeInsets.symmetric(horizontal: 16),
      itemBuilder: (context, index) {
        final surah = filteredSurahs[index];
        return _buildSurahItem(surah);
      },
    );
  }

  /// Individual Surah item
  Widget _buildSurahItem(Map<String, dynamic> surah) {
    return Container(
      margin: const EdgeInsets.only(bottom: 12),
      decoration: BoxDecoration(
        color: AppColors.subtleLight,
        borderRadius: BorderRadius.circular(12),
      ),
      child: Material(
        color: Colors.transparent,
        child: InkWell(
          borderRadius: BorderRadius.circular(12),
          onTap: () {
            // TODO: Navigate to Surah detail screen
            if (mounted) {
              ScaffoldMessenger.of(context).showSnackBar(
                SnackBar(
                  content: Text('Opening ${surah['nameEn']}...'),
                ),
              );
            }
          },
          child: Padding(
            padding: const EdgeInsets.all(16.0),
            child: Row(
              children: [
                // Surah number
                Container(
                  width: 40,
                  height: 40,
                  decoration: BoxDecoration(
                    color: AppColors.primary.withOpacity(0.1),
                    borderRadius: BorderRadius.circular(8),
                  ),
                  child: Center(
                    child: Text(
                      '${surah['number']}',
                      style: TextStyle(
                        color: AppColors.primary,
                        fontSize: 16,
                        fontWeight: FontWeight.w700,
                      ),
                    ),
                  ),
                ),

                const SizedBox(width: 16),

                // Surah names
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        surah['nameAr'] as String,
                        style: TextStyle(
                          color: AppColors.textLight,
                          fontSize: 18,
                          fontWeight: FontWeight.w600,
                        ),
                      ),
                      const SizedBox(height: 4),
                      Text(
                        surah['nameEn'] as String,
                        style: TextStyle(
                          color: AppColors.textLight.withOpacity(0.6),
                          fontSize: 14,
                        ),
                      ),
                    ],
                  ),
                ),

                // Chevron icon
                Icon(
                  Icons.chevron_right,
                  color: AppColors.textLight.withOpacity(0.4),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }
}
