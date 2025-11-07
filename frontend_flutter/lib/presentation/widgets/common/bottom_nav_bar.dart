import 'package:flutter/material.dart';
import '../../../core/theme/app_colors.dart';

class CustomBottomNavBar extends StatelessWidget {
  final int currentIndex;
  final ValueChanged<int> onTap;

  const CustomBottomNavBar({
    super.key,
    required this.currentIndex,
    required this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final isDark = theme.brightness == Brightness.dark;

    return Container(
      decoration: BoxDecoration(
        color: isDark
            ? AppColors.backgroundDark.withOpacity(0.8)
            : AppColors.backgroundLight.withOpacity(0.8),
        border: Border(
          top: BorderSide(
            color: Colors.white.withOpacity(0.1),
            width: 1,
          ),
        ),
      ),
      child: SafeArea(
        child: BottomNavigationBar(
          currentIndex: currentIndex,
          onTap: onTap,
          type: BottomNavigationBarType.fixed,
          backgroundColor: Colors.transparent,
          elevation: 0,
          selectedItemColor: AppColors.primary,
          unselectedItemColor: Colors.white.withOpacity(0.5),
          selectedFontSize: 12,
          unselectedFontSize: 12,
          selectedLabelStyle: const TextStyle(
            fontWeight: FontWeight.w500,
            fontFamily: 'Inter',
          ),
          unselectedLabelStyle: const TextStyle(
            fontWeight: FontWeight.w400,
            fontFamily: 'Inter',
          ),
          items: const [
            BottomNavigationBarItem(
              icon: Icon(Icons.mosque),
              label: 'Umrah',
            ),
            BottomNavigationBarItem(
              icon: Icon(Icons.explore),
              label: 'Qibla',
            ),
            BottomNavigationBarItem(
              icon: Icon(Icons.menu_book),
              label: 'Qur\'an',
            ),
            BottomNavigationBarItem(
              icon: Icon(Icons.access_time),
              label: 'Salat',
            ),
          ],
        ),
      ),
    );
  }
}
