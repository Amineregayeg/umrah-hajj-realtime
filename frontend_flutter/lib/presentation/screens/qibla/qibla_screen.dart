import 'dart:math' as math;

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/theme/app_colors.dart';
import '../../widgets/common/custom_button.dart';

/// Qibla screen showing direction to Kaaba with compass
/// Based on HTML template Qibla.txt
class QiblaScreen extends ConsumerStatefulWidget {
  const QiblaScreen({super.key});

  @override
  ConsumerState<QiblaScreen> createState() => _QiblaScreenState();
}

class _QiblaScreenState extends ConsumerState<QiblaScreen>
    with SingleTickerProviderStateMixin {
  late AnimationController _pulseController;
  double _qiblaAngle = 270.0; // Example angle from HTML

  @override
  void initState() {
    super.initState();
    _pulseController = AnimationController(
      vsync: this,
      duration: const Duration(seconds: 2),
    )..repeat();

    // TODO: Initialize compass sensor and calculate Qibla
    _calculateQiblaDirection();
  }

  @override
  void dispose() {
    _pulseController.dispose();
    super.dispose();
  }

  Future<void> _calculateQiblaDirection() async {
    // TODO: Get user location and calculate Qibla
    // Using backend API: GET /content/qibla?lat={lat}&lng={lng}
    // For now, using placeholder
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        leading: IconButton(
          icon: const Icon(Icons.arrow_back),
          onPressed: () => Navigator.of(context).pop(),
        ),
        title: const Text('Qibla'),
        centerTitle: true,
      ),
      body: SafeArea(
        child: Padding(
          padding: const EdgeInsets.all(24.0),
          child: Column(
            children: [
              const Spacer(flex: 1),

              // Compass display
              _buildCompass(),

              const Spacer(flex: 1),

              // Accuracy indicator
              _buildAccuracyIndicator(),

              const SizedBox(height: 32),

              // Action buttons
              _buildActionButtons(context),

              const SizedBox(height: 24),

              // Warning card (when accuracy is low)
              _buildWarningCard(),

              const SizedBox(height: 24),
            ],
          ),
        ),
      ),
    );
  }

  /// Compass display with Kaaba indicator
  Widget _buildCompass() {
    return SizedBox(
      width: 320,
      height: 320,
      child: Stack(
        alignment: Alignment.center,
        children: [
          // Concentric circles for depth
          for (int i = 3; i > 0; i--)
            Container(
              width: 320.0 * (i / 3),
              height: 320.0 * (i / 3),
              decoration: BoxDecoration(
                shape: BoxShape.circle,
                border: Border.all(
                  color: AppColors.white.withOpacity(0.1 * i),
                  width: 1,
                ),
              ),
            ),

          // North indicator at top
          Positioned(
            top: 20,
            child: Text(
              'N',
              style: TextStyle(
                color: AppColors.white,
                fontSize: 24,
                fontWeight: FontWeight.w700,
              ),
            ),
          ),

          // Kaaba icon marker (rotated based on direction)
          Transform.rotate(
            angle: _qiblaAngle * math.pi / 180,
            child: Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                Container(
                  width: 60,
                  height: 60,
                  decoration: BoxDecoration(
                    color: AppColors.primary,
                    shape: BoxShape.circle,
                  ),
                  child: Icon(
                    Icons.mosque,
                    color: AppColors.white,
                    size: 32,
                  ),
                ),
                const SizedBox(height: 8),
                Container(
                  width: 3,
                  height: 40,
                  color: AppColors.primary,
                ),
              ],
            ),
          ),

          // Center angle display
          Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              Text(
                '${_qiblaAngle.toInt()}°',
                style: TextStyle(
                  color: AppColors.white,
                  fontSize: 64,
                  fontWeight: FontWeight.w700,
                  height: 1,
                ),
              ),
              const SizedBox(height: 4),
              Text(
                'Towards Kaaba',
                style: TextStyle(
                  color: AppColors.white.withOpacity(0.7),
                  fontSize: 14,
                ),
              ),
            ],
          ),
        ],
      ),
    );
  }

  /// Accuracy indicator
  Widget _buildAccuracyIndicator() {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
      decoration: BoxDecoration(
        color: AppColors.primary.withOpacity(0.2),
        borderRadius: BorderRadius.circular(24),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          // Pulsing green dot
          FadeTransition(
            opacity: _pulseController,
            child: Container(
              width: 12,
              height: 12,
              decoration: BoxDecoration(
                color: AppColors.primary,
                shape: BoxShape.circle,
              ),
            ),
          ),
          const SizedBox(width: 12),
          Text(
            'Accuracy: High',
            style: TextStyle(
              color: AppColors.primary,
              fontSize: 14,
              fontWeight: FontWeight.w600,
            ),
          ),
        ],
      ),
    );
  }

  /// Action buttons (AR View and Recalibrate)
  Widget _buildActionButtons(BuildContext context) {
    return Column(
      children: [
        // AR View button
        CustomButton(
          text: 'AR View',
          icon: Icons.view_in_ar,
          onPressed: () {
            ScaffoldMessenger.of(context).showSnackBar(
              const SnackBar(content: Text('AR View coming soon')),
            );
          },
          fullWidth: true,
        ),

        const SizedBox(height: 16),

        // Recalibrate button
        CustomButton(
          text: 'Recalibrate',
          variant: ButtonVariant.outline,
          onPressed: () {
            setState(() {
              // TODO: Recalibrate compass
            });
            ScaffoldMessenger.of(context).showSnackBar(
              const SnackBar(content: Text('Compass recalibrated')),
            );
          },
          fullWidth: true,
        ),
      ],
    );
  }

  /// Warning card for low sensor accuracy
  Widget _buildWarningCard() {
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: Colors.orange.withOpacity(0.2),
        borderRadius: BorderRadius.circular(12),
      ),
      child: Row(
        children: [
          Icon(
            Icons.warning_amber_rounded,
            color: Colors.orange[700],
            size: 24,
          ),
          const SizedBox(width: 12),
          Expanded(
            child: Text(
              'For best results, calibrate your compass by moving your device in a figure-8 pattern',
              style: TextStyle(
                color: Colors.orange[900],
                fontSize: 13,
              ),
            ),
          ),
        ],
      ),
    );
  }
}
