import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../../core/theme/app_colors.dart';
import '../../providers/theme_provider.dart';

/// Settings screen for app preferences and configurations
class SettingsScreen extends ConsumerStatefulWidget {
  const SettingsScreen({super.key});

  @override
  ConsumerState<SettingsScreen> createState() => _SettingsScreenState();
}

class _SettingsScreenState extends ConsumerState<SettingsScreen> {
  bool _notificationsEnabled = true;
  bool _prayerReminders = true;
  bool _locationServices = true;
  bool _offlineMode = false;
  double _fontSize = 16.0;
  String _selectedLanguage = 'English';

  @override
  Widget build(BuildContext context) {
    final themeMode = ref.watch(themeModeProvider);

    return Scaffold(
      appBar: AppBar(
        leading: IconButton(
          icon: const Icon(Icons.arrow_back),
          onPressed: () => context.go('/home'),
        ),
        title: const Text('Settings'),
        centerTitle: true,
        actions: [
          IconButton(
            icon: const Icon(Icons.home_outlined),
            onPressed: () => context.go('/home'),
            tooltip: 'Home',
          ),
        ],
      ),
      body: ListView(
        padding: const EdgeInsets.all(16),
        children: [
          // Appearance Section
          _buildSectionHeader('Appearance'),
          _buildThemeSelector(themeMode),
          _buildFontSizeSlider(),

          const SizedBox(height: 24),

          // Notifications Section
          _buildSectionHeader('Notifications'),
          _buildSwitchTile(
            title: 'Enable Notifications',
            subtitle: 'Receive prayer time reminders',
            value: _notificationsEnabled,
            onChanged: (value) => setState(() => _notificationsEnabled = value),
          ),
          _buildSwitchTile(
            title: 'Prayer Reminders',
            subtitle: '15 minutes before prayer time',
            value: _prayerReminders,
            onChanged: (value) => setState(() => _prayerReminders = value),
            enabled: _notificationsEnabled,
          ),

          const SizedBox(height: 24),

          // Location & Services Section
          _buildSectionHeader('Location & Services'),
          _buildSwitchTile(
            title: 'Location Services',
            subtitle: 'For accurate prayer times and Qibla',
            value: _locationServices,
            onChanged: (value) => setState(() => _locationServices = value),
          ),
          _buildSwitchTile(
            title: 'Offline Mode',
            subtitle: 'Save content for offline access',
            value: _offlineMode,
            onChanged: (value) => setState(() => _offlineMode = value),
          ),

          const SizedBox(height: 24),

          // Language & Region Section
          _buildSectionHeader('Language & Region'),
          _buildLanguageSelector(),
          _buildOptionTile(
            icon: Icons.calendar_today_outlined,
            title: 'Calendar Type',
            subtitle: 'Gregorian & Hijri',
            onTap: () {
              ScaffoldMessenger.of(context).showSnackBar(
                const SnackBar(content: Text('Calendar settings coming soon')),
              );
            },
          ),

          const SizedBox(height: 24),

          // Prayer Calculation Section
          _buildSectionHeader('Prayer Calculation'),
          _buildOptionTile(
            icon: Icons.calculate_outlined,
            title: 'Calculation Method',
            subtitle: 'Muslim World League',
            onTap: () {
              _showCalculationMethodDialog();
            },
          ),
          _buildOptionTile(
            icon: Icons.school_outlined,
            title: 'Juristic Method',
            subtitle: 'Standard (Shafi, Maliki, Hanbali)',
            onTap: () {
              ScaffoldMessenger.of(context).showSnackBar(
                const SnackBar(content: Text('Juristic method selection coming soon')),
              );
            },
          ),

          const SizedBox(height: 24),

          // Privacy & Security Section
          _buildSectionHeader('Privacy & Security'),
          _buildOptionTile(
            icon: Icons.privacy_tip_outlined,
            title: 'Privacy Policy',
            subtitle: 'View privacy policy',
            onTap: () {
              ScaffoldMessenger.of(context).showSnackBar(
                const SnackBar(content: Text('Privacy policy coming soon')),
              );
            },
          ),
          _buildOptionTile(
            icon: Icons.security_outlined,
            title: 'Data & Storage',
            subtitle: 'Manage app data',
            onTap: () {
              ScaffoldMessenger.of(context).showSnackBar(
                const SnackBar(content: Text('Data management coming soon')),
              );
            },
          ),

          const SizedBox(height: 32),

          // Reset Settings Button
          OutlinedButton.icon(
            onPressed: _showResetConfirmation,
            icon: const Icon(Icons.restore),
            label: const Text('Reset to Default Settings'),
            style: OutlinedButton.styleFrom(
              foregroundColor: AppColors.error,
              side: const BorderSide(color: AppColors.error),
              padding: const EdgeInsets.symmetric(vertical: 16),
            ),
          ),

          const SizedBox(height: 16),
        ],
      ),
    );
  }

  Widget _buildSectionHeader(String title) {
    return Padding(
      padding: const EdgeInsets.only(left: 4, bottom: 12),
      child: Text(
        title,
        style: TextStyle(
          fontSize: 14,
          fontWeight: FontWeight.w700,
          color: AppColors.primary,
          letterSpacing: 0.5,
        ),
      ),
    );
  }

  Widget _buildThemeSelector(ThemeMode currentMode) {
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: AppColors.subtleLight,
        borderRadius: BorderRadius.circular(12),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Icon(Icons.brightness_6_outlined, color: AppColors.primary),
              const SizedBox(width: 12),
              const Text(
                'Theme',
                style: TextStyle(
                  fontSize: 16,
                  fontWeight: FontWeight.w600,
                  color: AppColors.textLight,
                ),
              ),
            ],
          ),
          const SizedBox(height: 16),
          Row(
            children: [
              Expanded(
                child: _buildThemeOption(
                  'Light',
                  Icons.light_mode,
                  currentMode == ThemeMode.light,
                  () => ref.read(themeModeProvider.notifier).state = ThemeMode.light,
                ),
              ),
              const SizedBox(width: 8),
              Expanded(
                child: _buildThemeOption(
                  'Dark',
                  Icons.dark_mode,
                  currentMode == ThemeMode.dark,
                  () => ref.read(themeModeProvider.notifier).state = ThemeMode.dark,
                ),
              ),
              const SizedBox(width: 8),
              Expanded(
                child: _buildThemeOption(
                  'System',
                  Icons.settings_system_daydream,
                  currentMode == ThemeMode.system,
                  () => ref.read(themeModeProvider.notifier).state = ThemeMode.system,
                ),
              ),
            ],
          ),
        ],
      ),
    );
  }

  Widget _buildThemeOption(String label, IconData icon, bool isSelected, VoidCallback onTap) {
    return GestureDetector(
      onTap: onTap,
      child: Container(
        padding: const EdgeInsets.symmetric(vertical: 12),
        decoration: BoxDecoration(
          color: isSelected ? AppColors.primary : Colors.transparent,
          borderRadius: BorderRadius.circular(8),
          border: Border.all(
            color: isSelected ? AppColors.primary : AppColors.textLight.withOpacity(0.2),
          ),
        ),
        child: Column(
          children: [
            Icon(
              icon,
              color: isSelected ? AppColors.white : AppColors.textLight,
              size: 24,
            ),
            const SizedBox(height: 4),
            Text(
              label,
              style: TextStyle(
                fontSize: 12,
                fontWeight: FontWeight.w600,
                color: isSelected ? AppColors.white : AppColors.textLight,
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildFontSizeSlider() {
    return Container(
      margin: const EdgeInsets.only(top: 12),
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: AppColors.subtleLight,
        borderRadius: BorderRadius.circular(12),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Row(
                children: [
                  Icon(Icons.format_size, color: AppColors.primary),
                  const SizedBox(width: 12),
                  const Text(
                    'Font Size',
                    style: TextStyle(
                      fontSize: 16,
                      fontWeight: FontWeight.w600,
                      color: AppColors.textLight,
                    ),
                  ),
                ],
              ),
              Text(
                '${_fontSize.toInt()}',
                style: TextStyle(
                  fontSize: 14,
                  fontWeight: FontWeight.w600,
                  color: AppColors.primary,
                ),
              ),
            ],
          ),
          Slider(
            value: _fontSize,
            min: 12,
            max: 24,
            divisions: 12,
            activeColor: AppColors.primary,
            onChanged: (value) => setState(() => _fontSize = value),
          ),
        ],
      ),
    );
  }

  Widget _buildSwitchTile({
    required String title,
    required String subtitle,
    required bool value,
    required ValueChanged<bool> onChanged,
    bool enabled = true,
  }) {
    return Container(
      margin: const EdgeInsets.only(bottom: 12),
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: AppColors.subtleLight,
        borderRadius: BorderRadius.circular(12),
      ),
      child: Row(
        children: [
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  title,
                  style: TextStyle(
                    fontSize: 16,
                    fontWeight: FontWeight.w600,
                    color: enabled ? AppColors.textLight : AppColors.textLight.withOpacity(0.5),
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
          Switch(
            value: value,
            onChanged: enabled ? onChanged : null,
            activeColor: AppColors.primary,
          ),
        ],
      ),
    );
  }

  Widget _buildLanguageSelector() {
    return Container(
      margin: const EdgeInsets.only(bottom: 12),
      decoration: BoxDecoration(
        color: AppColors.subtleLight,
        borderRadius: BorderRadius.circular(12),
      ),
      child: ListTile(
        leading: Icon(Icons.language, color: AppColors.primary),
        title: const Text(
          'Language',
          style: TextStyle(
            fontSize: 16,
            fontWeight: FontWeight.w600,
            color: AppColors.textLight,
          ),
        ),
        subtitle: Text(
          _selectedLanguage,
          style: TextStyle(
            fontSize: 14,
            color: AppColors.textLight.withOpacity(0.6),
          ),
        ),
        trailing: Icon(
          Icons.chevron_right,
          color: AppColors.textLight.withOpacity(0.4),
        ),
        onTap: _showLanguageDialog,
      ),
    );
  }

  Widget _buildOptionTile({
    required IconData icon,
    required String title,
    required String subtitle,
    required VoidCallback onTap,
  }) {
    return Container(
      margin: const EdgeInsets.only(bottom: 12),
      decoration: BoxDecoration(
        color: AppColors.subtleLight,
        borderRadius: BorderRadius.circular(12),
      ),
      child: ListTile(
        leading: Icon(icon, color: AppColors.primary),
        title: Text(
          title,
          style: const TextStyle(
            fontSize: 16,
            fontWeight: FontWeight.w600,
            color: AppColors.textLight,
          ),
        ),
        subtitle: Text(
          subtitle,
          style: TextStyle(
            fontSize: 14,
            color: AppColors.textLight.withOpacity(0.6),
          ),
        ),
        trailing: Icon(
          Icons.chevron_right,
          color: AppColors.textLight.withOpacity(0.4),
        ),
        onTap: onTap,
      ),
    );
  }

  void _showLanguageDialog() {
    showDialog(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('Select Language'),
        content: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            _buildLanguageOption('English'),
            _buildLanguageOption('العربية'),
            _buildLanguageOption('Français'),
            _buildLanguageOption('اردو'),
            _buildLanguageOption('Türkçe'),
          ],
        ),
      ),
    );
  }

  Widget _buildLanguageOption(String language) {
    final isSelected = _selectedLanguage == language;
    return ListTile(
      title: Text(language),
      trailing: isSelected ? Icon(Icons.check, color: AppColors.primary) : null,
      onTap: () {
        setState(() => _selectedLanguage = language);
        Navigator.pop(context);
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Language changed to $language')),
        );
      },
    );
  }

  void _showCalculationMethodDialog() {
    showDialog(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('Calculation Method'),
        content: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            _buildMethodOption('Muslim World League'),
            _buildMethodOption('Islamic Society of North America'),
            _buildMethodOption('Egyptian General Authority'),
            _buildMethodOption('Umm al-Qura University, Makkah'),
            _buildMethodOption('University of Islamic Sciences, Karachi'),
          ],
        ),
      ),
    );
  }

  Widget _buildMethodOption(String method) {
    return ListTile(
      title: Text(method, style: const TextStyle(fontSize: 14)),
      onTap: () {
        Navigator.pop(context);
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Method: $method')),
        );
      },
    );
  }

  void _showResetConfirmation() {
    showDialog(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('Reset Settings'),
        content: const Text(
          'Are you sure you want to reset all settings to default? This action cannot be undone.',
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context),
            child: const Text('Cancel'),
          ),
          TextButton(
            onPressed: () {
              Navigator.pop(context);
              setState(() {
                _notificationsEnabled = true;
                _prayerReminders = true;
                _locationServices = true;
                _offlineMode = false;
                _fontSize = 16.0;
                _selectedLanguage = 'English';
              });
              ref.read(themeModeProvider.notifier).state = ThemeMode.system;
              ScaffoldMessenger.of(context).showSnackBar(
                const SnackBar(content: Text('Settings reset to default')),
              );
            },
            child: const Text('Reset', style: TextStyle(color: AppColors.error)),
          ),
        ],
      ),
    );
  }
}
