import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../../core/theme/app_colors.dart';
import '../../widgets/common/custom_button.dart';
import '../../widgets/common/custom_text_field.dart';

/// Security settings screen with password and 2FA management
class SecurityScreen extends ConsumerStatefulWidget {
  const SecurityScreen({super.key});

  @override
  ConsumerState<SecurityScreen> createState() => _SecurityScreenState();
}

class _SecurityScreenState extends ConsumerState<SecurityScreen> {
  bool _twoFactorEnabled = false;
  bool _biometricEnabled = false;
  bool _loginNotifications = true;

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        leading: IconButton(
          icon: const Icon(Icons.arrow_back),
          onPressed: () => context.go('/profile'),
        ),
        title: const Text('Security'),
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
        padding: const EdgeInsets.all(24),
        children: [
          // Password Section
          _buildSectionHeader('Password', Icons.lock_outline),
          const SizedBox(height: 16),
          _buildPasswordCard(),

          const SizedBox(height: 32),

          // Two-Factor Authentication
          _buildSectionHeader('Two-Factor Authentication', Icons.security),
          const SizedBox(height: 16),
          _build2FACard(),

          const SizedBox(height: 32),

          // Biometric Authentication
          _buildSectionHeader('Biometric Authentication', Icons.fingerprint),
          const SizedBox(height: 16),
          _buildBiometricCard(),

          const SizedBox(height: 32),

          // Login Activity
          _buildSectionHeader('Login Activity', Icons.history),
          const SizedBox(height: 16),
          _buildLoginActivityCard(),

          const SizedBox(height: 32),

          // Notifications
          _buildSectionHeader('Security Notifications', Icons.notifications_outlined),
          const SizedBox(height: 16),
          _buildNotificationsCard(),

          const SizedBox(height: 32),

          // Sessions
          _buildSectionHeader('Active Sessions', Icons.devices),
          const SizedBox(height: 16),
          _buildSessionsCard(),
        ],
      ),
    );
  }

  Widget _buildSectionHeader(String title, IconData icon) {
    return Row(
      children: [
        Icon(icon, color: AppColors.primary, size: 24),
        const SizedBox(width: 12),
        Text(
          title,
          style: const TextStyle(
            fontSize: 18,
            fontWeight: FontWeight.w700,
            color: AppColors.textLight,
          ),
        ),
      ],
    );
  }

  Widget _buildPasswordCard() {
    return Container(
      padding: const EdgeInsets.all(20),
      decoration: BoxDecoration(
        color: AppColors.subtleLight,
        borderRadius: BorderRadius.circular(12),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    const Text(
                      'Change Password',
                      style: TextStyle(
                        fontSize: 16,
                        fontWeight: FontWeight.w600,
                        color: AppColors.textLight,
                      ),
                    ),
                    const SizedBox(height: 4),
                    Text(
                      'Last changed 3 months ago',
                      style: TextStyle(
                        fontSize: 14,
                        color: AppColors.textLight.withOpacity(0.6),
                      ),
                    ),
                  ],
                ),
              ),
              CustomButton(
                text: 'Change',
                onPressed: _showChangePasswordDialog,
                variant: ButtonVariant.outline,
              ),
            ],
          ),
        ],
      ),
    );
  }

  Widget _build2FACard() {
    return Container(
      padding: const EdgeInsets.all(20),
      decoration: BoxDecoration(
        color: AppColors.subtleLight,
        borderRadius: BorderRadius.circular(12),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    const Text(
                      'Two-Factor Authentication',
                      style: TextStyle(
                        fontSize: 16,
                        fontWeight: FontWeight.w600,
                        color: AppColors.textLight,
                      ),
                    ),
                    const SizedBox(height: 4),
                    Text(
                      _twoFactorEnabled
                          ? 'Extra layer of security enabled'
                          : 'Add extra security to your account',
                      style: TextStyle(
                        fontSize: 14,
                        color: AppColors.textLight.withOpacity(0.6),
                      ),
                    ),
                  ],
                ),
              ),
              Switch(
                value: _twoFactorEnabled,
                onChanged: (value) {
                  if (value) {
                    _showEnable2FADialog();
                  } else {
                    setState(() => _twoFactorEnabled = false);
                  }
                },
                activeColor: AppColors.primary,
              ),
            ],
          ),
          if (_twoFactorEnabled) ...[
            const Divider(height: 32),
            CustomButton(
              text: 'View Recovery Codes',
              icon: Icons.vpn_key,
              onPressed: () {
                ScaffoldMessenger.of(context).showSnackBar(
                  const SnackBar(content: Text('Recovery codes feature coming soon')),
                );
              },
              variant: ButtonVariant.ghost,
              fullWidth: true,
            ),
          ],
        ],
      ),
    );
  }

  Widget _buildBiometricCard() {
    return Container(
      padding: const EdgeInsets.all(20),
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
                const Text(
                  'Fingerprint / Face ID',
                  style: TextStyle(
                    fontSize: 16,
                    fontWeight: FontWeight.w600,
                    color: AppColors.textLight,
                  ),
                ),
                const SizedBox(height: 4),
                Text(
                  'Use biometrics to unlock the app',
                  style: TextStyle(
                    fontSize: 14,
                    color: AppColors.textLight.withOpacity(0.6),
                  ),
                ),
              ],
            ),
          ),
          Switch(
            value: _biometricEnabled,
            onChanged: (value) {
              setState(() => _biometricEnabled = value);
              ScaffoldMessenger.of(context).showSnackBar(
                SnackBar(
                  content: Text(
                    value
                        ? 'Biometric authentication enabled'
                        : 'Biometric authentication disabled',
                  ),
                ),
              );
            },
            activeColor: AppColors.primary,
          ),
        ],
      ),
    );
  }

  Widget _buildLoginActivityCard() {
    return Container(
      padding: const EdgeInsets.all(20),
      decoration: BoxDecoration(
        color: AppColors.subtleLight,
        borderRadius: BorderRadius.circular(12),
      ),
      child: Column(
        children: [
          _buildActivityItem(
            'Current Session',
            'Chrome on Windows',
            'Active now',
            true,
          ),
          const Divider(height: 24),
          _buildActivityItem(
            'Mobile App',
            'iPhone 13',
            '2 hours ago',
            false,
          ),
          const Divider(height: 24),
          _buildActivityItem(
            'Web Browser',
            'Safari on MacBook',
            'Yesterday',
            false,
          ),
        ],
      ),
    );
  }

  Widget _buildActivityItem(String device, String platform, String time, bool isCurrent) {
    return Row(
      children: [
        Container(
          padding: const EdgeInsets.all(10),
          decoration: BoxDecoration(
            color: isCurrent
                ? AppColors.primary.withOpacity(0.1)
                : Colors.grey.withOpacity(0.1),
            borderRadius: BorderRadius.circular(8),
          ),
          child: Icon(
            isCurrent ? Icons.phone_android : Icons.devices,
            color: isCurrent ? AppColors.primary : Colors.grey,
            size: 20,
          ),
        ),
        const SizedBox(width: 12),
        Expanded(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                device,
                style: const TextStyle(
                  fontSize: 14,
                  fontWeight: FontWeight.w600,
                  color: AppColors.textLight,
                ),
              ),
              Text(
                '$platform • $time',
                style: TextStyle(
                  fontSize: 12,
                  color: AppColors.textLight.withOpacity(0.6),
                ),
              ),
            ],
          ),
        ),
        if (isCurrent)
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
            decoration: BoxDecoration(
              color: AppColors.primary.withOpacity(0.2),
              borderRadius: BorderRadius.circular(12),
            ),
            child: const Text(
              'Current',
              style: TextStyle(
                fontSize: 11,
                fontWeight: FontWeight.w600,
                color: AppColors.primary,
              ),
            ),
          ),
      ],
    );
  }

  Widget _buildNotificationsCard() {
    return Container(
      padding: const EdgeInsets.all(20),
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
                const Text(
                  'Login Notifications',
                  style: TextStyle(
                    fontSize: 16,
                    fontWeight: FontWeight.w600,
                    color: AppColors.textLight,
                  ),
                ),
                const SizedBox(height: 4),
                Text(
                  'Get notified of new sign-ins',
                  style: TextStyle(
                    fontSize: 14,
                    color: AppColors.textLight.withOpacity(0.6),
                  ),
                ),
              ],
            ),
          ),
          Switch(
            value: _loginNotifications,
            onChanged: (value) => setState(() => _loginNotifications = value),
            activeColor: AppColors.primary,
          ),
        ],
      ),
    );
  }

  Widget _buildSessionsCard() {
    return Container(
      padding: const EdgeInsets.all(20),
      decoration: BoxDecoration(
        color: AppColors.subtleLight,
        borderRadius: BorderRadius.circular(12),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            'Manage your active sessions across all devices',
            style: TextStyle(
              fontSize: 14,
              color: AppColors.textLight.withOpacity(0.7),
            ),
          ),
          const SizedBox(height: 16),
          CustomButton(
            text: 'Sign Out All Devices',
            icon: Icons.logout,
            onPressed: _showSignOutAllDialog,
            variant: ButtonVariant.outline,
            fullWidth: true,
          ),
        ],
      ),
    );
  }

  void _showChangePasswordDialog() {
    final currentPasswordController = TextEditingController();
    final newPasswordController = TextEditingController();
    final confirmPasswordController = TextEditingController();
    final formKey = GlobalKey<FormState>();

    showDialog(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('Change Password'),
        content: Form(
          key: formKey,
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              CustomTextField(
                controller: currentPasswordController,
                placeholder: 'Current Password',
                obscureText: true,
                validator: (value) {
                  if (value == null || value.isEmpty) {
                    return 'Please enter current password';
                  }
                  return null;
                },
              ),
              const SizedBox(height: 16),
              CustomTextField(
                controller: newPasswordController,
                placeholder: 'New Password',
                obscureText: true,
                validator: (value) {
                  if (value == null || value.length < 8) {
                    return 'Password must be at least 8 characters';
                  }
                  return null;
                },
              ),
              const SizedBox(height: 16),
              CustomTextField(
                controller: confirmPasswordController,
                placeholder: 'Confirm New Password',
                obscureText: true,
                validator: (value) {
                  if (value != newPasswordController.text) {
                    return 'Passwords do not match';
                  }
                  return null;
                },
              ),
            ],
          ),
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context),
            child: const Text('Cancel'),
          ),
          ElevatedButton(
            onPressed: () {
              if (formKey.currentState?.validate() ?? false) {
                Navigator.pop(context);
                ScaffoldMessenger.of(context).showSnackBar(
                  const SnackBar(
                    content: Text('Password changed successfully'),
                    backgroundColor: AppColors.success,
                  ),
                );
              }
            },
            child: const Text('Change Password'),
          ),
        ],
      ),
    );
  }

  void _showEnable2FADialog() {
    showDialog(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('Enable 2FA'),
        content: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Icon(Icons.security, size: 64, color: AppColors.primary),
            const SizedBox(height: 16),
            const Text(
              'Two-factor authentication adds an extra layer of security to your account.',
              textAlign: TextAlign.center,
            ),
            const SizedBox(height: 16),
            const Text(
              'You\'ll need to enter a code from your authenticator app when signing in.',
              style: TextStyle(fontSize: 14),
              textAlign: TextAlign.center,
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
              setState(() => _twoFactorEnabled = true);
              Navigator.pop(context);
              ScaffoldMessenger.of(context).showSnackBar(
                const SnackBar(
                  content: Text('2FA enabled successfully'),
                  backgroundColor: AppColors.success,
                ),
              );
            },
            child: const Text('Enable'),
          ),
        ],
      ),
    );
  }

  void _showSignOutAllDialog() {
    showDialog(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('Sign Out All Devices?'),
        content: const Text(
          'This will sign you out from all devices except this one. You\'ll need to sign in again on those devices.',
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context),
            child: const Text('Cancel'),
          ),
          TextButton(
            onPressed: () {
              Navigator.pop(context);
              ScaffoldMessenger.of(context).showSnackBar(
                const SnackBar(
                  content: Text('Signed out from all other devices'),
                ),
              );
            },
            child: const Text(
              'Sign Out All',
              style: TextStyle(color: AppColors.error),
            ),
          ),
        ],
      ),
    );
  }
}
