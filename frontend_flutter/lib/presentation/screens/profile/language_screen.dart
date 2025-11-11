import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../../core/theme/app_colors.dart';

/// Language selection screen
class LanguageScreen extends ConsumerStatefulWidget {
  const LanguageScreen({super.key});

  @override
  ConsumerState<LanguageScreen> createState() => _LanguageScreenState();
}

class _LanguageScreenState extends ConsumerState<LanguageScreen> {
  String _selectedLanguage = 'English';

  final List<LanguageOption> _languages = [
    LanguageOption(
      code: 'en',
      name: 'English',
      nativeName: 'English',
      isRTL: false,
    ),
    LanguageOption(
      code: 'ar',
      name: 'Arabic',
      nativeName: 'العربية',
      isRTL: true,
    ),
    LanguageOption(
      code: 'fr',
      name: 'French',
      nativeName: 'Français',
      isRTL: false,
    ),
    LanguageOption(
      code: 'ur',
      name: 'Urdu',
      nativeName: 'اردو',
      isRTL: true,
    ),
    LanguageOption(
      code: 'id',
      name: 'Indonesian',
      nativeName: 'Bahasa Indonesia',
      isRTL: false,
    ),
    LanguageOption(
      code: 'tr',
      name: 'Turkish',
      nativeName: 'Türkçe',
      isRTL: false,
    ),
    LanguageOption(
      code: 'ms',
      name: 'Malay',
      nativeName: 'Bahasa Melayu',
      isRTL: false,
    ),
    LanguageOption(
      code: 'bn',
      name: 'Bengali',
      nativeName: 'বাংলা',
      isRTL: false,
    ),
  ];

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        leading: IconButton(
          icon: const Icon(Icons.arrow_back),
          onPressed: () => context.go('/profile'),
        ),
        title: const Text('Language'),
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
          // Info Banner
          _buildInfoBanner(),

          // Language List
          Expanded(
            child: ListView.builder(
              padding: const EdgeInsets.all(16),
              itemCount: _languages.length,
              itemBuilder: (context, index) {
                final language = _languages[index];
                return _buildLanguageItem(language);
              },
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildInfoBanner() {
    return Container(
      width: double.infinity,
      padding: const EdgeInsets.all(16),
      margin: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: AppColors.primary.withOpacity(0.1),
        borderRadius: BorderRadius.circular(12),
        border: Border.all(
          color: AppColors.primary.withOpacity(0.3),
          width: 1,
        ),
      ),
      child: Row(
        children: [
          Icon(Icons.info_outline, color: AppColors.primary, size: 20),
          const SizedBox(width: 12),
          Expanded(
            child: Text(
              'The app will restart to apply the language change',
              style: TextStyle(
                fontSize: 13,
                color: AppColors.primary,
              ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildLanguageItem(LanguageOption language) {
    final isSelected = _selectedLanguage == language.name;

    return Container(
      margin: const EdgeInsets.only(bottom: 12),
      decoration: BoxDecoration(
        color: isSelected
            ? AppColors.primary.withOpacity(0.1)
            : AppColors.subtleLight,
        borderRadius: BorderRadius.circular(12),
        border: Border.all(
          color: isSelected
              ? AppColors.primary
              : Colors.transparent,
          width: 2,
        ),
      ),
      child: Material(
        color: Colors.transparent,
        child: InkWell(
          onTap: () => _selectLanguage(language),
          borderRadius: BorderRadius.circular(12),
          child: Padding(
            padding: const EdgeInsets.all(16),
            child: Row(
              children: [
                // Language Icon/Flag Placeholder
                Container(
                  width: 48,
                  height: 48,
                  decoration: BoxDecoration(
                    color: isSelected
                        ? AppColors.primary
                        : AppColors.primary.withOpacity(0.2),
                    borderRadius: BorderRadius.circular(8),
                  ),
                  child: Center(
                    child: Text(
                      language.code.toUpperCase(),
                      style: TextStyle(
                        fontSize: 14,
                        fontWeight: FontWeight.w700,
                        color: isSelected
                            ? AppColors.white
                            : AppColors.primary,
                      ),
                    ),
                  ),
                ),
                const SizedBox(width: 16),

                // Language Names
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        language.name,
                        style: TextStyle(
                          fontSize: 16,
                          fontWeight: FontWeight.w600,
                          color: isSelected
                              ? AppColors.primary
                              : AppColors.textLight,
                        ),
                      ),
                      const SizedBox(height: 4),
                      Text(
                        language.nativeName,
                        style: TextStyle(
                          fontSize: 14,
                          color: AppColors.textLight.withOpacity(0.6),
                        ),
                        textDirection: language.isRTL
                            ? TextDirection.rtl
                            : TextDirection.ltr,
                      ),
                    ],
                  ),
                ),

                // Selection Indicator
                if (isSelected)
                  Icon(
                    Icons.check_circle,
                    color: AppColors.primary,
                    size: 28,
                  )
                else
                  Icon(
                    Icons.circle_outlined,
                    color: AppColors.textLight.withOpacity(0.3),
                    size: 28,
                  ),
              ],
            ),
          ),
        ),
      ),
    );
  }

  void _selectLanguage(LanguageOption language) {
    if (_selectedLanguage == language.name) return;

    showDialog(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('Change Language?'),
        content: Text(
          'The app will change to ${language.name} and restart to apply the changes.',
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context),
            child: const Text('Cancel'),
          ),
          ElevatedButton(
            onPressed: () {
              setState(() => _selectedLanguage = language.name);
              Navigator.pop(context);
              ScaffoldMessenger.of(context).showSnackBar(
                SnackBar(
                  content: Text('Language changed to ${language.name}. Restart the app to apply changes.'),
                  backgroundColor: AppColors.success,
                  duration: const Duration(seconds: 3),
                ),
              );
              // TODO: Actually change app language and restart
            },
            child: const Text('Change'),
          ),
        ],
      ),
    );
  }
}

class LanguageOption {
  final String code;
  final String name;
  final String nativeName;
  final bool isRTL;

  LanguageOption({
    required this.code,
    required this.name,
    required this.nativeName,
    required this.isRTL,
  });
}
