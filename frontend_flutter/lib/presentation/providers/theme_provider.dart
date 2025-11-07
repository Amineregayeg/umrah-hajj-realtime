import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

// Theme mode provider
final themeModeProvider = StateProvider<ThemeMode>((ref) {
  // Default to system theme
  return ThemeMode.system;
});

// Helper provider to get current brightness
final currentBrightnessProvider = Provider<Brightness>((ref) {
  final themeMode = ref.watch(themeModeProvider);

  // This is a simplified version - in a real app, you'd get the
  // system brightness from PlatformDispatcher or MediaQuery
  return themeMode == ThemeMode.dark
      ? Brightness.dark
      : themeMode == ThemeMode.light
          ? Brightness.light
          : Brightness.light; // Default to light for system
});
