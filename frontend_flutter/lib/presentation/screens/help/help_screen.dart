import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../../core/theme/app_colors.dart';

/// Help & Support screen with FAQ and contact options
class HelpScreen extends ConsumerStatefulWidget {
  const HelpScreen({super.key});

  @override
  ConsumerState<HelpScreen> createState() => _HelpScreenState();
}

class _HelpScreenState extends ConsumerState<HelpScreen> {
  final TextEditingController _searchController = TextEditingController();
  String _searchQuery = '';

  final List<FAQItem> _faqs = [
    FAQItem(
      question: 'How do I find the Qibla direction?',
      answer: 'Go to the Qibla screen from the home page. The app uses your location to calculate the direction to the Kaaba in Makkah. Make sure location services are enabled.',
      category: 'Navigation',
    ),
    FAQItem(
      question: 'How accurate are the prayer times?',
      answer: 'Prayer times are calculated based on your GPS location and the selected calculation method. You can change the calculation method in Settings > Prayer Calculation.',
      category: 'Prayer Times',
    ),
    FAQItem(
      question: 'Can I use the app offline?',
      answer: 'Yes! Enable offline mode in Settings. The app will save Quran content and prayer times for offline access. Note that some features like live navigation require internet.',
      category: 'General',
    ),
    FAQItem(
      question: 'How do I change the prayer time calculation method?',
      answer: 'Go to Settings > Prayer Calculation > Calculation Method. Choose from various methods like Muslim World League, ISNA, Egyptian General Authority, etc.',
      category: 'Prayer Times',
    ),
    FAQItem(
      question: 'How do I report a bug or issue?',
      answer: 'Use the "Report an Issue" button below or contact us through email. Please provide as much detail as possible including screenshots if available.',
      category: 'Support',
    ),
    FAQItem(
      question: 'Is my data secure?',
      answer: 'Yes, we take your privacy seriously. Your personal data is encrypted and never shared with third parties. See our Privacy Policy for more details.',
      category: 'Privacy',
    ),
    FAQItem(
      question: 'How do I change the app language?',
      answer: 'Go to Settings > Language & Region > Language. We support English, Arabic, French, Urdu, Turkish, and Indonesian.',
      category: 'General',
    ),
    FAQItem(
      question: 'What is the AR Qibla feature?',
      answer: 'AR (Augmented Reality) Qibla overlays the Qibla direction on your camera view. This feature is coming soon and will make finding Qibla even easier.',
      category: 'Navigation',
    ),
  ];

  @override
  void dispose() {
    _searchController.dispose();
    super.dispose();
  }

  List<FAQItem> get _filteredFAQs {
    if (_searchQuery.isEmpty) return _faqs;
    return _faqs.where((faq) {
      return faq.question.toLowerCase().contains(_searchQuery.toLowerCase()) ||
          faq.answer.toLowerCase().contains(_searchQuery.toLowerCase()) ||
          faq.category.toLowerCase().contains(_searchQuery.toLowerCase());
    }).toList();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        leading: IconButton(
          icon: const Icon(Icons.arrow_back),
          onPressed: () => context.go('/home'),
        ),
        title: const Text('Help & Support'),
        centerTitle: true,
        actions: [
          IconButton(
            icon: const Icon(Icons.home_outlined),
            onPressed: () => context.go('/home'),
            tooltip: 'Home',
          ),
        ],
      ),
      body: Column(
        children: [
          // Search Bar
          _buildSearchBar(),

          // Content
          Expanded(
            child: SingleChildScrollView(
              padding: const EdgeInsets.all(16),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  // Quick Actions
                  _buildQuickActions(context),

                  const SizedBox(height: 32),

                  // FAQ Section
                  _buildSectionHeader('Frequently Asked Questions'),
                  const SizedBox(height: 16),
                  _buildFAQList(),

                  const SizedBox(height: 32),

                  // Contact Section
                  _buildSectionHeader('Still Need Help?'),
                  const SizedBox(height: 16),
                  _buildContactOptions(context),

                  const SizedBox(height: 24),
                ],
              ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildSearchBar() {
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: AppColors.subtleLight,
        border: Border(
          bottom: BorderSide(
            color: AppColors.textLight.withOpacity(0.1),
            width: 1,
          ),
        ),
      ),
      child: TextField(
        controller: _searchController,
        onChanged: (value) => setState(() => _searchQuery = value),
        decoration: InputDecoration(
          hintText: 'Search help articles...',
          prefixIcon: Icon(Icons.search, color: AppColors.primary),
          suffixIcon: _searchQuery.isNotEmpty
              ? IconButton(
                  icon: const Icon(Icons.clear),
                  onPressed: () {
                    _searchController.clear();
                    setState(() => _searchQuery = '');
                  },
                )
              : null,
          filled: true,
          fillColor: AppColors.white,
          border: OutlineInputBorder(
            borderRadius: BorderRadius.circular(12),
            borderSide: BorderSide.none,
          ),
          contentPadding: const EdgeInsets.symmetric(vertical: 12),
        ),
      ),
    );
  }

  Widget _buildQuickActions(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        _buildSectionHeader('Quick Actions'),
        const SizedBox(height: 12),
        Row(
          children: [
            Expanded(
              child: _buildQuickActionCard(
                icon: Icons.chat_bubble_outline,
                title: 'Live Chat',
                subtitle: 'Chat with us',
                onTap: () {
                  ScaffoldMessenger.of(context).showSnackBar(
                    const SnackBar(content: Text('Live chat coming soon')),
                  );
                },
              ),
            ),
            const SizedBox(width: 12),
            Expanded(
              child: _buildQuickActionCard(
                icon: Icons.bug_report_outlined,
                title: 'Report Issue',
                subtitle: 'Found a bug?',
                onTap: () => _showReportIssueDialog(context),
              ),
            ),
          ],
        ),
      ],
    );
  }

  Widget _buildQuickActionCard({
    required IconData icon,
    required String title,
    required String subtitle,
    required VoidCallback onTap,
  }) {
    return Material(
      color: AppColors.primary.withOpacity(0.1),
      borderRadius: BorderRadius.circular(12),
      child: InkWell(
        onTap: onTap,
        borderRadius: BorderRadius.circular(12),
        child: Padding(
          padding: const EdgeInsets.all(16),
          child: Column(
            children: [
              Icon(icon, color: AppColors.primary, size: 32),
              const SizedBox(height: 8),
              Text(
                title,
                style: TextStyle(
                  fontSize: 14,
                  fontWeight: FontWeight.w700,
                  color: AppColors.primary,
                ),
                textAlign: TextAlign.center,
              ),
              const SizedBox(height: 4),
              Text(
                subtitle,
                style: TextStyle(
                  fontSize: 12,
                  color: AppColors.textLight.withOpacity(0.7),
                ),
                textAlign: TextAlign.center,
              ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildSectionHeader(String title) {
    return Text(
      title,
      style: const TextStyle(
        fontSize: 20,
        fontWeight: FontWeight.w700,
        color: AppColors.textLight,
      ),
    );
  }

  Widget _buildFAQList() {
    final faqs = _filteredFAQs;

    if (faqs.isEmpty) {
      return Center(
        child: Padding(
          padding: const EdgeInsets.all(32),
          child: Column(
            children: [
              Icon(
                Icons.search_off,
                size: 64,
                color: AppColors.textLight.withOpacity(0.3),
              ),
              const SizedBox(height: 16),
              Text(
                'No results found',
                style: TextStyle(
                  fontSize: 16,
                  color: AppColors.textLight.withOpacity(0.6),
                ),
              ),
            ],
          ),
        ),
      );
    }

    // Group by category
    final groupedFAQs = <String, List<FAQItem>>{};
    for (final faq in faqs) {
      groupedFAQs.putIfAbsent(faq.category, () => []).add(faq);
    }

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: groupedFAQs.entries.map((entry) {
        return Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Padding(
              padding: const EdgeInsets.only(left: 4, top: 16, bottom: 8),
              child: Text(
                entry.key,
                style: TextStyle(
                  fontSize: 14,
                  fontWeight: FontWeight.w700,
                  color: AppColors.primary,
                  letterSpacing: 0.5,
                ),
              ),
            ),
            ...entry.value.map((faq) => _buildFAQItem(faq)),
          ],
        );
      }).toList(),
    );
  }

  Widget _buildFAQItem(FAQItem faq) {
    return Container(
      margin: const EdgeInsets.only(bottom: 12),
      decoration: BoxDecoration(
        color: AppColors.subtleLight,
        borderRadius: BorderRadius.circular(12),
      ),
      child: Theme(
        data: Theme.of(context).copyWith(dividerColor: Colors.transparent),
        child: ExpansionTile(
          tilePadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
          childrenPadding: const EdgeInsets.fromLTRB(16, 0, 16, 16),
          title: Text(
            faq.question,
            style: const TextStyle(
              fontSize: 16,
              fontWeight: FontWeight.w600,
              color: AppColors.textLight,
            ),
          ),
          iconColor: AppColors.primary,
          collapsedIconColor: AppColors.textLight.withOpacity(0.6),
          children: [
            Text(
              faq.answer,
              style: TextStyle(
                fontSize: 14,
                color: AppColors.textLight.withOpacity(0.8),
                height: 1.5,
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildContactOptions(BuildContext context) {
    return Column(
      children: [
        _buildContactCard(
          icon: Icons.email_outlined,
          title: 'Email Support',
          subtitle: 'support@umrahhajjguide.com',
          onTap: () {
            ScaffoldMessenger.of(context).showSnackBar(
              const SnackBar(content: Text('Opening email app...')),
            );
          },
        ),
        const SizedBox(height: 12),
        _buildContactCard(
          icon: Icons.phone_outlined,
          title: 'Phone Support',
          subtitle: '+1 (555) 123-4567',
          onTap: () {
            ScaffoldMessenger.of(context).showSnackBar(
              const SnackBar(content: Text('Calling support...')),
            );
          },
        ),
        const SizedBox(height: 12),
        _buildContactCard(
          icon: Icons.public,
          title: 'Visit Website',
          subtitle: 'www.umrahhajjguide.com',
          onTap: () {
            ScaffoldMessenger.of(context).showSnackBar(
              const SnackBar(content: Text('Opening website...')),
            );
          },
        ),
      ],
    );
  }

  Widget _buildContactCard({
    required IconData icon,
    required String title,
    required String subtitle,
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
              Container(
                padding: const EdgeInsets.all(12),
                decoration: BoxDecoration(
                  color: AppColors.primary.withOpacity(0.1),
                  borderRadius: BorderRadius.circular(10),
                ),
                child: Icon(icon, color: AppColors.primary, size: 24),
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
                      subtitle,
                      style: TextStyle(
                        fontSize: 14,
                        color: AppColors.textLight.withOpacity(0.6),
                      ),
                    ),
                  ],
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

  void _showReportIssueDialog(BuildContext context) {
    final issueController = TextEditingController();

    showDialog(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('Report an Issue'),
        content: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            const Text(
              'Please describe the issue you\'re experiencing:',
              style: TextStyle(fontSize: 14),
            ),
            const SizedBox(height: 16),
            TextField(
              controller: issueController,
              maxLines: 5,
              decoration: InputDecoration(
                hintText: 'Describe the issue...',
                border: OutlineInputBorder(
                  borderRadius: BorderRadius.circular(8),
                ),
              ),
            ),
          ],
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context),
            child: const Text('Cancel'),
          ),
          ElevatedButton(
            onPressed: () {
              Navigator.pop(context);
              ScaffoldMessenger.of(context).showSnackBar(
                const SnackBar(
                  content: Text('Thank you for your report! We\'ll look into it.'),
                ),
              );
            },
            child: const Text('Submit'),
          ),
        ],
      ),
    );
  }
}

class FAQItem {
  final String question;
  final String answer;
  final String category;

  FAQItem({
    required this.question,
    required this.answer,
    required this.category,
  });
}
