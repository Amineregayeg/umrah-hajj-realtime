import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../../core/theme/app_colors.dart';

/// About screen showing app information and credits
class AboutScreen extends ConsumerWidget {
  const AboutScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    return Scaffold(
      appBar: AppBar(
        leading: IconButton(
          icon: const Icon(Icons.arrow_back),
          onPressed: () => context.go('/home'),
        ),
        title: const Text('About'),
        centerTitle: true,
        actions: [
          IconButton(
            icon: const Icon(Icons.home_outlined),
            onPressed: () => context.go('/home'),
            tooltip: 'Home',
          ),
        ],
      ),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(24),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.center,
          children: [
            // App Logo
            _buildAppLogo(),

            const SizedBox(height: 24),

            // App Name & Version
            _buildAppInfo(),

            const SizedBox(height: 32),

            // Description
            _buildDescription(),

            const SizedBox(height: 32),

            // Features
            _buildFeatures(),

            const SizedBox(height: 32),

            // Team & Credits
            _buildCredits(),

            const SizedBox(height: 32),

            // Links
            _buildLinks(context),

            const SizedBox(height: 32),

            // Legal
            _buildLegal(context),

            const SizedBox(height: 24),

            // Copyright
            _buildCopyright(),
          ],
        ),
      ),
    );
  }

  Widget _buildAppLogo() {
    return Container(
      width: 120,
      height: 120,
      decoration: BoxDecoration(
        gradient: LinearGradient(
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
          colors: [
            AppColors.primary,
            AppColors.primary.withOpacity(0.7),
          ],
        ),
        shape: BoxShape.circle,
        boxShadow: [
          BoxShadow(
            color: AppColors.primary.withOpacity(0.3),
            blurRadius: 20,
            offset: const Offset(0, 10),
          ),
        ],
      ),
      child: const Icon(
        Icons.mosque,
        size: 60,
        color: AppColors.white,
      ),
    );
  }

  Widget _buildAppInfo() {
    return Column(
      children: [
        const Text(
          'Umrah & Hajj Guide',
          style: TextStyle(
            fontSize: 28,
            fontWeight: FontWeight.w700,
            color: AppColors.textLight,
          ),
          textAlign: TextAlign.center,
        ),
        const SizedBox(height: 8),
        Container(
          padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
          decoration: BoxDecoration(
            color: AppColors.primary.withOpacity(0.1),
            borderRadius: BorderRadius.circular(20),
          ),
          child: const Text(
            'Version 1.0.0',
            style: TextStyle(
              fontSize: 14,
              fontWeight: FontWeight.w600,
              color: AppColors.primary,
            ),
          ),
        ),
      ],
    );
  }

  Widget _buildDescription() {
    return Text(
      'Your comprehensive companion for a spiritual and guided pilgrimage experience. '
      'Navigate through the sacred journey of Umrah and Hajj with real-time guidance, '
      'prayer times, Qibla direction, and Quranic verses at your fingertips.',
      style: TextStyle(
        fontSize: 16,
        color: AppColors.textLight.withOpacity(0.8),
        height: 1.6,
      ),
      textAlign: TextAlign.center,
    );
  }

  Widget _buildFeatures() {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        const Text(
          'Key Features',
          style: TextStyle(
            fontSize: 20,
            fontWeight: FontWeight.w700,
            color: AppColors.textLight,
          ),
        ),
        const SizedBox(height: 16),
        _buildFeatureItem(
          icon: Icons.explore,
          title: 'Qibla Compass',
          description: 'Accurate direction to the Kaaba',
        ),
        _buildFeatureItem(
          icon: Icons.access_time,
          title: 'Prayer Times',
          description: 'Precise timings based on your location',
        ),
        _buildFeatureItem(
          icon: Icons.menu_book,
          title: 'Holy Quran',
          description: 'Read and search verses with translations',
        ),
        _buildFeatureItem(
          icon: Icons.map,
          title: 'Navigation',
          description: 'Real-time guidance for rituals',
        ),
        _buildFeatureItem(
          icon: Icons.offline_bolt,
          title: 'Offline Mode',
          description: 'Access content without internet',
        ),
      ],
    );
  }

  Widget _buildFeatureItem({
    required IconData icon,
    required String title,
    required String description,
  }) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 16),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Container(
            padding: const EdgeInsets.all(10),
            decoration: BoxDecoration(
              color: AppColors.primary.withOpacity(0.1),
              borderRadius: BorderRadius.circular(8),
            ),
            child: Icon(
              icon,
              color: AppColors.primary,
              size: 20,
            ),
          ),
          const SizedBox(width: 16),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  title,
                  style: const TextStyle(
                    fontSize: 16,
                    fontWeight: FontWeight.w600,
                    color: AppColors.textLight,
                  ),
                ),
                const SizedBox(height: 4),
                Text(
                  description,
                  style: TextStyle(
                    fontSize: 14,
                    color: AppColors.textLight.withOpacity(0.6),
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildCredits() {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        const Text(
          'Developed By',
          style: TextStyle(
            fontSize: 20,
            fontWeight: FontWeight.w700,
            color: AppColors.textLight,
          ),
        ),
        const SizedBox(height: 16),
        Container(
          width: double.infinity,
          padding: const EdgeInsets.all(20),
          decoration: BoxDecoration(
            color: AppColors.subtleLight,
            borderRadius: BorderRadius.circular(12),
          ),
          child: Column(
            children: [
              const CircleAvatar(
                radius: 40,
                backgroundColor: AppColors.primary,
                child: Icon(
                  Icons.code,
                  size: 40,
                  color: AppColors.white,
                ),
              ),
              const SizedBox(height: 12),
              const Text(
                'Umrah Hajj Development Team',
                style: TextStyle(
                  fontSize: 16,
                  fontWeight: FontWeight.w600,
                  color: AppColors.textLight,
                ),
              ),
              const SizedBox(height: 4),
              Text(
                'With love for the Muslim community',
                style: TextStyle(
                  fontSize: 14,
                  color: AppColors.textLight.withOpacity(0.6),
                ),
              ),
            ],
          ),
        ),
      ],
    );
  }

  Widget _buildLinks(BuildContext context) {
    return Column(
      children: [
        _buildLinkCard(
          icon: Icons.public,
          title: 'Visit Website',
          onTap: () {
            ScaffoldMessenger.of(context).showSnackBar(
              const SnackBar(content: Text('Opening website...')),
            );
          },
        ),
        const SizedBox(height: 12),
        _buildLinkCard(
          icon: Icons.email,
          title: 'Contact Us',
          onTap: () {
            ScaffoldMessenger.of(context).showSnackBar(
              const SnackBar(content: Text('Opening email...')),
            );
          },
        ),
        const SizedBox(height: 12),
        _buildLinkCard(
          icon: Icons.star,
          title: 'Rate This App',
          onTap: () {
            ScaffoldMessenger.of(context).showSnackBar(
              const SnackBar(content: Text('Thank you for your support!')),
            );
          },
        ),
        const SizedBox(height: 12),
        _buildLinkCard(
          icon: Icons.share,
          title: 'Share With Friends',
          onTap: () {
            ScaffoldMessenger.of(context).showSnackBar(
              const SnackBar(content: Text('Sharing app...')),
            );
          },
        ),
      ],
    );
  }

  Widget _buildLinkCard({
    required IconData icon,
    required String title,
    required VoidCallback onTap,
  }) {
    return Material(
      color: AppColors.subtleLight,
      borderRadius: BorderRadius.circular(12),
      child: InkWell(
        onTap: onTap,
        borderRadius: BorderRadius.circular(12),
        child: Padding(
          padding: const EdgeInsets.all(16),
          child: Row(
            children: [
              Icon(icon, color: AppColors.primary),
              const SizedBox(width: 16),
              Expanded(
                child: Text(
                  title,
                  style: const TextStyle(
                    fontSize: 16,
                    fontWeight: FontWeight.w600,
                    color: AppColors.textLight,
                  ),
                ),
              ),
              Icon(
                Icons.arrow_forward_ios,
                size: 16,
                color: AppColors.textLight.withOpacity(0.4),
              ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildLegal(BuildContext context) {
    return Row(
      mainAxisAlignment: MainAxisAlignment.center,
      children: [
        TextButton(
          onPressed: () {
            ScaffoldMessenger.of(context).showSnackBar(
              const SnackBar(content: Text('Privacy Policy')),
            );
          },
          child: const Text('Privacy Policy'),
        ),
        Text(
          ' • ',
          style: TextStyle(color: AppColors.textLight.withOpacity(0.4)),
        ),
        TextButton(
          onPressed: () {
            ScaffoldMessenger.of(context).showSnackBar(
              const SnackBar(content: Text('Terms of Service')),
            );
          },
          child: const Text('Terms of Service'),
        ),
      ],
    );
  }

  Widget _buildCopyright() {
    return Column(
      children: [
        Text(
          '© 2024 Umrah & Hajj Guide',
          style: TextStyle(
            fontSize: 12,
            color: AppColors.textLight.withOpacity(0.5),
          ),
        ),
        const SizedBox(height: 4),
        Text(
          'All rights reserved',
          style: TextStyle(
            fontSize: 12,
            color: AppColors.textLight.withOpacity(0.5),
          ),
        ),
      ],
    );
  }
}
