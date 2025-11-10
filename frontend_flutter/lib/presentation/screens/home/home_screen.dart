import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../../core/theme/app_colors.dart';
import '../../widgets/common/custom_button.dart';

/// Home screen - Entry point with location context and quick actions
/// Matches HTML design from Home.txt with hero image and CTAs
class HomeScreen extends ConsumerWidget {
  const HomeScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    return Scaffold(
      body: Stack(
        fit: StackFit.expand,
        children: [
          // Background image with overlay
          _buildBackgroundImage(),

          // Content overlay
          SafeArea(
            child: Column(
              children: [
                // Header with location and menu
                _buildHeader(context),

                const Spacer(),

                // Main content area
                _buildMainContent(context),

                const SizedBox(height: 48),
              ],
            ),
          ),
        ],
      ),
    );
  }

  /// Background image with dark overlay
  Widget _buildBackgroundImage() {
    return Stack(
      fit: StackFit.expand,
      children: [
        // Background image (placeholder - add actual image asset)
        Container(
          decoration: BoxDecoration(
            gradient: LinearGradient(
              begin: Alignment.topCenter,
              end: Alignment.bottomCenter,
              colors: [
                AppColors.backgroundDark,
                AppColors.backgroundDark.withOpacity(0.8),
              ],
            ),
          ),
        ),

        // Dark overlay
        Container(
          color: Colors.black.withOpacity(0.3),
        ),
      ],
    );
  }

  /// Header with location badge and menu buttons
  Widget _buildHeader(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.all(16.0),
      child: Row(
        children: [
          // Location badge with glassmorphism
          Expanded(
            child: Container(
              padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
              decoration: BoxDecoration(
                color: AppColors.backgroundDark.withOpacity(0.5),
                borderRadius: BorderRadius.circular(24),
                border: Border.all(
                  color: Colors.white.withOpacity(0.1),
                  width: 1,
                ),
              ),
              child: Row(
                mainAxisSize: MainAxisSize.min,
                children: [
                  Icon(
                    Icons.location_on_outlined,
                    color: AppColors.white.withOpacity(0.9),
                    size: 20,
                  ),
                  const SizedBox(width: 8),
                  Text(
                    'Masjid al-Haram',
                    style: TextStyle(
                      color: AppColors.white.withOpacity(0.9),
                      fontSize: 14,
                      fontWeight: FontWeight.w500,
                    ),
                  ),
                ],
              ),
            ),
          ),

          const SizedBox(width: 12),

          // Search button
          _buildIconButton(
            icon: Icons.search,
            onPressed: () {
              // TODO: Navigate to search screen
              ScaffoldMessenger.of(context).showSnackBar(
                const SnackBar(content: Text('Search feature coming soon')),
              );
            },
          ),

          const SizedBox(width: 8),

          // Menu button
          _buildIconButton(
            icon: Icons.more_vert,
            onPressed: () {
              _showMenuBottomSheet(context);
            },
          ),
        ],
      ),
    );
  }

  /// Icon button with glassmorphism background
  Widget _buildIconButton({
    required IconData icon,
    required VoidCallback onPressed,
  }) {
    return Container(
      decoration: BoxDecoration(
        color: AppColors.backgroundDark.withOpacity(0.5),
        borderRadius: BorderRadius.circular(12),
        border: Border.all(
          color: Colors.white.withOpacity(0.1),
          width: 1,
        ),
      ),
      child: IconButton(
        icon: Icon(icon, color: AppColors.white.withOpacity(0.9)),
        onPressed: onPressed,
        iconSize: 24,
      ),
    );
  }

  /// Main content with title and action buttons
  Widget _buildMainContent(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 24.0),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          // Title
          Text(
            'Your Guide to Umrah',
            style: TextStyle(
              color: AppColors.white,
              fontSize: 32,
              fontWeight: FontWeight.w700,
              height: 1.2,
            ),
            textAlign: TextAlign.center,
          ),

          const SizedBox(height: 16),

          // Subtitle
          Text(
            'Experience a guided and spiritually fulfilling pilgrimage',
            style: TextStyle(
              color: AppColors.white.withOpacity(0.8),
              fontSize: 16,
              height: 1.5,
            ),
            textAlign: TextAlign.center,
          ),

          const SizedBox(height: 40),

          // Start Umrah button
          CustomButton(
            text: 'Start Umrah',
            onPressed: () {
              context.go('/map');
            },
            fullWidth: true,
          ),

          const SizedBox(height: 16),

          // Start Simulation button (disabled - coming soon)
          CustomButton(
            text: 'Start Simulation',
            onPressed: null, // Disabled
            variant: ButtonVariant.outline,
            fullWidth: true,
          ),

          const SizedBox(height: 8),

          // Coming soon tag
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 4),
            decoration: BoxDecoration(
              color: AppColors.primary.withOpacity(0.2),
              borderRadius: BorderRadius.circular(12),
            ),
            child: Text(
              'Coming Soon',
              style: TextStyle(
                color: AppColors.primary,
                fontSize: 12,
                fontWeight: FontWeight.w600,
              ),
            ),
          ),
        ],
      ),
    );
  }

  /// Show menu bottom sheet
  void _showMenuBottomSheet(BuildContext context) {
    showModalBottomSheet(
      context: context,
      backgroundColor: Colors.transparent,
      builder: (context) => Container(
        decoration: BoxDecoration(
          color: AppColors.backgroundLight,
          borderRadius: const BorderRadius.vertical(top: Radius.circular(20)),
        ),
        padding: const EdgeInsets.all(24),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            // Handle bar
            Container(
              width: 40,
              height: 4,
              decoration: BoxDecoration(
                color: Colors.grey[300],
                borderRadius: BorderRadius.circular(2),
              ),
            ),

            const SizedBox(height: 24),

            // Menu items
            _buildMenuItem(
              context,
              icon: Icons.person_outline,
              title: 'Profile',
              onTap: () {
                Navigator.pop(context);
                context.go('/profile');
              },
            ),

            _buildMenuItem(
              context,
              icon: Icons.settings_outlined,
              title: 'Settings',
              onTap: () {
                final messenger = ScaffoldMessenger.of(context);
                Navigator.pop(context);
                Future.microtask(() {
                  messenger.showSnackBar(
                    const SnackBar(content: Text('Settings coming soon')),
                  );
                });
              },
            ),

            _buildMenuItem(
              context,
              icon: Icons.help_outline,
              title: 'Help & Support',
              onTap: () {
                final messenger = ScaffoldMessenger.of(context);
                Navigator.pop(context);
                Future.microtask(() {
                  messenger.showSnackBar(
                    const SnackBar(content: Text('Help coming soon')),
                  );
                });
              },
            ),

            _buildMenuItem(
              context,
              icon: Icons.info_outline,
              title: 'About',
              onTap: () {
                final messenger = ScaffoldMessenger.of(context);
                Navigator.pop(context);
                Future.microtask(() {
                  messenger.showSnackBar(
                    const SnackBar(content: Text('About coming soon')),
                  );
                });
              },
            ),
          ],
        ),
      ),
    );
  }

  /// Build menu item
  Widget _buildMenuItem(
    BuildContext context, {
    required IconData icon,
    required String title,
    required VoidCallback onTap,
  }) {
    return ListTile(
      leading: Icon(icon, color: AppColors.textLight),
      title: Text(
        title,
        style: TextStyle(
          color: AppColors.textLight,
          fontSize: 16,
          fontWeight: FontWeight.w500,
        ),
      ),
      trailing: Icon(
        Icons.chevron_right,
        color: AppColors.textLight.withOpacity(0.5),
      ),
      onTap: onTap,
    );
  }
}
