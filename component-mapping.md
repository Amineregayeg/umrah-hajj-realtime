# Phase C: Component Mapping Guide (HTML to Flutter)

**Purpose:** Concrete conversion rules with code examples for migrating HTML/CSS/JS templates to Flutter widgets

---

## Table of Contents
1. [Navigation / Header](#1-navigation--header)
2. [Bottom Navigation Bar](#2-bottom-navigation-bar)
3. [Hero / Banner / Carousel](#3-hero--banner--carousel)
4. [Forms & Input Fields](#4-forms--input-fields)
5. [Lists & Repeated Items](#5-lists--repeated-items)
6. [Buttons & CTAs](#6-buttons--ctas)
7. [Cards & Containers](#7-cards--containers)
8. [Styling (CSS → Flutter)](#8-styling-css--flutter)
9. [Client-Side Routing](#9-client-side-routing)
10. [JavaScript Interactions](#10-javascript-interactions)
11. [Static Assets](#11-static-assets)
12. [Dark Mode Toggle](#12-dark-mode-toggle)

---

## 1. Navigation / Header

### HTML (Before)
```html
<header class="p-4 flex items-center justify-between z-10">
  <div class="bg-black/20 backdrop-blur-lg rounded-full flex items-center px-4 py-2">
    <svg class="w-5 h-5 text-white/80" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path d="M15 10.5a3 3 0 11-6 0 3 3 0 016 0z"/>
    </svg>
    <span class="ml-2 text-sm font-medium text-white">Masjid al-Haram</span>
  </div>
  <div class="flex items-center gap-2">
    <button class="w-10 h-10 bg-black/20 backdrop-blur-lg rounded-full">
      <svg class="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z"/>
      </svg>
    </button>
    <button class="w-10 h-10 bg-black/20 backdrop-blur-lg rounded-full">
      <svg class="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path d="M12 6.75a.75.75 0 110-1.5.75.75 0 010 1.5z"/>
      </svg>
    </button>
  </div>
</header>
```

### Flutter (After)
```dart
// lib/presentation/widgets/common/custom_app_bar.dart
class CustomAppBar extends StatelessWidget implements PreferredSizeWidget {
  final String? locationText;
  final VoidCallback? onSearchPressed;
  final VoidCallback? onMenuPressed;

  const CustomAppBar({
    Key? key,
    this.locationText,
    this.onSearchPressed,
    this.onMenuPressed,
  }) : super(key: key);

  @override
  Widget build(BuildContext context) {
    return AppBar(
      backgroundColor: Colors.transparent,
      elevation: 0,
      leading: locationText != null
          ? Container(
              margin: const EdgeInsets.all(8),
              padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
              decoration: BoxDecoration(
                color: Colors.black.withOpacity(0.2),
                borderRadius: BorderRadius.circular(24),
                // Backdrop blur not natively supported, use BlurContainer widget
              ),
              child: Row(
                mainAxisSize: MainAxisSize.min,
                children: [
                  Icon(
                    Icons.location_on_outlined,
                    size: 20,
                    color: Colors.white.withOpacity(0.8),
                  ),
                  const SizedBox(width: 8),
                  Text(
                    locationText!,
                    style: const TextStyle(
                      fontSize: 14,
                      fontWeight: FontWeight.w500,
                      color: Colors.white,
                    ),
                  ),
                ],
              ),
            )
          : null,
      actions: [
        if (onSearchPressed != null)
          IconButton(
            onPressed: onSearchPressed,
            icon: const Icon(Icons.search, color: Colors.white),
            style: IconButton.styleFrom(
              backgroundColor: Colors.black.withOpacity(0.2),
              shape: const CircleBorder(),
            ),
          ),
        if (onMenuPressed != null)
          IconButton(
            onPressed: onMenuPressed,
            icon: const Icon(Icons.more_vert, color: Colors.white),
            style: IconButton.styleFrom(
              backgroundColor: Colors.black.withOpacity(0.2),
              shape: const CircleBorder(),
            ),
          ),
        const SizedBox(width: 8),
      ],
    );
  }

  @override
  Size get preferredSize => const Size.fromHeight(kToolbarHeight);
}

// Usage:
Scaffold(
  appBar: CustomAppBar(
    locationText: 'Masjid al-Haram',
    onSearchPressed: () {},
    onMenuPressed: () {},
  ),
  body: ...,
)
```

---

## 2. Bottom Navigation Bar

### HTML (Before)
```html
<div class="border-t border-white/10 bg-background-light/80 dark:bg-background-dark/80 backdrop-blur-sm sticky bottom-0 pb-safe">
  <div class="mx-auto flex max-w-md items-center justify-around px-4 py-2">
    <a class="flex flex-col items-center gap-1 p-2 text-primary" href="#">
      <svg fill="currentColor" height="24" viewBox="0 0 256 256" width="24">...</svg>
      <span class="text-xs font-medium">Umrah</span>
    </a>
    <a class="flex flex-col items-center gap-1 p-2 text-white/50 hover:text-primary" href="#">
      <svg fill="currentColor" height="24" viewBox="0 0 256 256" width="24">...</svg>
      <span class="text-xs font-medium">Qibla</span>
    </a>
    <a class="flex flex-col items-center gap-1 p-2 text-white/50 hover:text-primary" href="#">
      <svg fill="currentColor" height="24" viewBox="0 0 256 256" width="24">...</svg>
      <span class="text-xs font-medium">Qur'an</span>
    </a>
    <a class="flex flex-col items-center gap-1 p-2 text-white/50 hover:text-primary" href="#">
      <svg fill="currentColor" height="24" viewBox="0 0 256 256" width="24">...</svg>
      <span class="text-xs font-medium">Salat</span>
    </a>
  </div>
</div>
```

### Flutter (After)
```dart
// lib/presentation/widgets/common/bottom_nav_bar.dart
class CustomBottomNavBar extends StatelessWidget {
  final int currentIndex;
  final ValueChanged<int> onTap;

  const CustomBottomNavBar({
    Key? key,
    required this.currentIndex,
    required this.onTap,
  }) : super(key: key);

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
          selectedLabelStyle: const TextStyle(fontWeight: FontWeight.w500),
          items: const [
            BottomNavigationBarItem(
              icon: Icon(Icons.mosque),  // Replace with custom icon if needed
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

// Usage with GoRouter ShellRoute:
class HomeShell extends StatelessWidget {
  final Widget child;

  const HomeShell({required this.child});

  @override
  Widget build(BuildContext context) {
    final currentRoute = GoRouterState.of(context).uri.path;
    final currentIndex = _getIndexFromRoute(currentRoute);

    return Scaffold(
      body: child,
      bottomNavigationBar: CustomBottomNavBar(
        currentIndex: currentIndex,
        onTap: (index) {
          final routes = ['/home', '/qibla', '/quran', '/salat'];
          context.go(routes[index]);
        },
      ),
    );
  }

  int _getIndexFromRoute(String route) {
    if (route.startsWith('/qibla')) return 1;
    if (route.startsWith('/quran')) return 2;
    if (route.startsWith('/salat')) return 3;
    return 0; // home
  }
}
```

---

## 3. Hero / Banner / Carousel

### HTML (Before)
```html
<div class="relative flex-grow">
  <div class="absolute inset-0 h-full w-full bg-cover bg-center" style='background-image: url("https://...bg-image.jpg");'>
    <div class="absolute inset-0 bg-black/30 backdrop-blur-sm"></div>
  </div>
  <div class="relative z-10 flex h-full flex-col items-center justify-center p-4 text-center">
    <h1 class="text-3xl font-bold text-white">Umrah Guide</h1>
    <p class="mt-2 text-white/80">Your companion for the holy journey</p>
  </div>
</div>
```

### Flutter (After)
```dart
// lib/presentation/widgets/shared/gradient_background.dart
class HeroSection extends StatelessWidget {
  final String title;
  final String subtitle;
  final String? backgroundImageUrl;
  final Widget? child;

  const HeroSection({
    Key? key,
    required this.title,
    required this.subtitle,
    this.backgroundImageUrl,
    this.child,
  }) : super(key: key);

  @override
  Widget build(BuildContext context) {
    return Stack(
      children: [
        // Background image
        Positioned.fill(
          child: backgroundImageUrl != null
              ? CachedNetworkImage(
                  imageUrl: backgroundImageUrl!,
                  fit: BoxFit.cover,
                  placeholder: (context, url) => const ColoredBox(
                    color: AppColors.backgroundDark,
                  ),
                )
              : const ColoredBox(color: AppColors.backgroundDark),
        ),

        // Dark overlay with blur (use BackdropFilter for blur)
        Positioned.fill(
          child: BackdropFilter(
            filter: ui.ImageFilter.blur(sigmaX: 4, sigmaY: 4),
            child: Container(
              color: Colors.black.withOpacity(0.3),
            ),
          ),
        ),

        // Content
        Center(
          child: Padding(
            padding: const EdgeInsets.all(16),
            child: Column(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                Text(
                  title,
                  style: const TextStyle(
                    fontSize: 32,
                    fontWeight: FontWeight.bold,
                    color: Colors.white,
                  ),
                  textAlign: TextAlign.center,
                ),
                const SizedBox(height: 8),
                Text(
                  subtitle,
                  style: TextStyle(
                    fontSize: 16,
                    color: Colors.white.withOpacity(0.8),
                  ),
                  textAlign: TextAlign.center,
                ),
                if (child != null) ...[
                  const SizedBox(height: 24),
                  child!,
                ],
              ],
            ),
          ),
        ),
      ],
    );
  }
}

// For carousel/slides, use PageView:
class OnboardingCarousel extends StatefulWidget {
  @override
  State<OnboardingCarousel> createState() => _OnboardingCarouselState();
}

class _OnboardingCarouselState extends State<OnboardingCarousel> {
  final PageController _controller = PageController();
  int _currentPage = 0;

  @override
  Widget build(BuildContext context) {
    return Column(
      children: [
        Expanded(
          child: PageView(
            controller: _controller,
            onPageChanged: (index) => setState(() => _currentPage = index),
            children: [
              HeroSection(
                title: 'Welcome to Umrah Guide',
                subtitle: 'Your spiritual companion',
                backgroundImageUrl: 'https://...',
              ),
              HeroSection(
                title: 'Step-by-step Guidance',
                subtitle: 'Never miss a step',
                backgroundImageUrl: 'https://...',
              ),
            ],
          ),
        ),
        // Page indicators
        Row(
          mainAxisAlignment: MainAxisAlignment.center,
          children: List.generate(2, (index) {
            return Container(
              margin: const EdgeInsets.symmetric(horizontal: 4),
              width: _currentPage == index ? 24 : 8,
              height: 8,
              decoration: BoxDecoration(
                color: _currentPage == index
                    ? AppColors.primary
                    : Colors.white.withOpacity(0.3),
                borderRadius: BorderRadius.circular(4),
              ),
            );
          }),
        ),
        const SizedBox(height: 16),
      ],
    );
  }
}
```

---

## 4. Forms & Input Fields

### HTML (Before)
```html
<div class="space-y-4">
  <div class="grid grid-cols-2 gap-4">
    <input class="w-full rounded-lg border-0 bg-subtle-light p-4 placeholder-placeholder-light focus:ring-2 focus:ring-primary dark:bg-subtle-dark dark:placeholder-placeholder-dark" placeholder="First Name" type="text"/>
    <input class="w-full rounded-lg border-0 bg-subtle-light p-4 placeholder-placeholder-light focus:ring-2 focus:ring-primary dark:bg-subtle-dark dark:placeholder-placeholder-dark" placeholder="Last Name" type="text"/>
  </div>
  <select class="form-select w-full rounded-lg border-0 bg-subtle-light p-4 text-text-light focus:ring-2 focus:ring-primary dark:bg-subtle-dark dark:text-text-dark">
    <option>Country</option>
    <option>Saudi Arabia</option>
    <option>United Kingdom</option>
  </select>
</div>
```

### Flutter (After)
```dart
// lib/presentation/widgets/common/custom_text_field.dart
class CustomTextField extends StatelessWidget {
  final String? label;
  final String placeholder;
  final TextEditingController? controller;
  final String? Function(String?)? validator;
  final TextInputType? keyboardType;
  final bool obscureText;

  const CustomTextField({
    Key? key,
    this.label,
    required this.placeholder,
    this.controller,
    this.validator,
    this.keyboardType,
    this.obscureText = false,
  }) : super(key: key);

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final isDark = theme.brightness == Brightness.dark;

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        if (label != null) ...[
          Text(
            label!,
            style: TextStyle(
              fontSize: 14,
              fontWeight: FontWeight.w500,
              color: isDark
                  ? AppColors.textDark.withOpacity(0.8)
                  : AppColors.textLight.withOpacity(0.8),
            ),
          ),
          const SizedBox(height: 8),
        ],
        TextFormField(
          controller: controller,
          validator: validator,
          keyboardType: keyboardType,
          obscureText: obscureText,
          style: TextStyle(
            color: isDark ? AppColors.textDark : AppColors.textLight,
          ),
          decoration: InputDecoration(
            hintText: placeholder,
            hintStyle: TextStyle(
              color: isDark
                  ? AppColors.placeholderDark
                  : AppColors.placeholderLight,
            ),
            filled: true,
            fillColor: isDark ? AppColors.subtleDark : AppColors.subtleLight,
            border: OutlineInputBorder(
              borderRadius: BorderRadius.circular(12),
              borderSide: BorderSide.none,
            ),
            focusedBorder: OutlineInputBorder(
              borderRadius: BorderRadius.circular(12),
              borderSide: const BorderSide(
                color: AppColors.primary,
                width: 2,
              ),
            ),
            contentPadding: const EdgeInsets.all(16),
          ),
        ),
      ],
    );
  }
}

// Dropdown equivalent:
class CustomDropdown<T> extends StatelessWidget {
  final String? label;
  final String placeholder;
  final T? value;
  final List<DropdownMenuItem<T>> items;
  final ValueChanged<T?>? onChanged;

  const CustomDropdown({
    Key? key,
    this.label,
    required this.placeholder,
    this.value,
    required this.items,
    this.onChanged,
  }) : super(key: key);

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final isDark = theme.brightness == Brightness.dark;

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        if (label != null) ...[
          Text(label!, style: ...),
          const SizedBox(height: 8),
        ],
        DropdownButtonFormField<T>(
          value: value,
          items: items,
          onChanged: onChanged,
          decoration: InputDecoration(
            hintText: placeholder,
            filled: true,
            fillColor: isDark ? AppColors.subtleDark : AppColors.subtleLight,
            border: OutlineInputBorder(
              borderRadius: BorderRadius.circular(12),
              borderSide: BorderSide.none,
            ),
          ),
          icon: const Icon(Icons.keyboard_arrow_down),
        ),
      ],
    );
  }
}

// Full Form example:
// lib/presentation/screens/profile/widgets/profile_form.dart
class ProfileForm extends ConsumerStatefulWidget {
  @override
  ConsumerState<ProfileForm> createState() => _ProfileFormState();
}

class _ProfileFormState extends ConsumerState<ProfileForm> {
  final _formKey = GlobalKey<FormState>();
  final _firstNameController = TextEditingController();
  final _lastNameController = TextEditingController();
  String? _selectedCountry;

  @override
  Widget build(BuildContext context) {
    return Form(
      key: _formKey,
      child: Column(
        children: [
          Row(
            children: [
              Expanded(
                child: CustomTextField(
                  placeholder: 'First Name',
                  controller: _firstNameController,
                  validator: (value) {
                    if (value == null || value.isEmpty) {
                      return 'Required';
                    }
                    return null;
                  },
                ),
              ),
              const SizedBox(width: 16),
              Expanded(
                child: CustomTextField(
                  placeholder: 'Last Name',
                  controller: _lastNameController,
                  validator: (value) {
                    if (value == null || value.isEmpty) {
                      return 'Required';
                    }
                    return null;
                  },
                ),
              ),
            ],
          ),
          const SizedBox(height: 16),
          CustomDropdown<String>(
            placeholder: 'Country',
            value: _selectedCountry,
            items: const [
              DropdownMenuItem(value: 'SA', child: Text('Saudi Arabia')),
              DropdownMenuItem(value: 'UK', child: Text('United Kingdom')),
              DropdownMenuItem(value: 'ID', child: Text('Indonesia')),
            ],
            onChanged: (value) => setState(() => _selectedCountry = value),
          ),
          const SizedBox(height: 24),
          ElevatedButton(
            onPressed: _submitForm,
            child: const Text('Submit'),
          ),
        ],
      ),
    );
  }

  void _submitForm() {
    if (_formKey.currentState!.validate()) {
      // Submit form
      ref.read(profileNotifierProvider.notifier).updateProfile(
            firstName: _firstNameController.text,
            lastName: _lastNameController.text,
            country: _selectedCountry,
          );
    }
  }

  @override
  void dispose() {
    _firstNameController.dispose();
    _lastNameController.dispose();
    super.dispose();
  }
}
```

---

## 5. Lists & Repeated Items

### HTML (Before)
```html
<div class="space-y-2">
  <div class="bg-subtle-light dark:bg-subtle-dark rounded-lg p-4">
    <h3 class="font-bold text-lg">Al-Fatihah</h3>
    <p class="text-sm text-text-light/70 dark:text-text-dark/70">7 verses</p>
  </div>
  <div class="bg-subtle-light dark:bg-subtle-dark rounded-lg p-4">
    <h3 class="font-bold text-lg">Al-Baqarah</h3>
    <p class="text-sm text-text-light/70 dark:text-text-dark/70">286 verses</p>
  </div>
  <!-- ... more items ... -->
</div>
```

### Flutter (After)
```dart
// lib/presentation/screens/quran/widgets/surah_card.dart
class SurahCard extends StatelessWidget {
  final QuranSurah surah;
  final VoidCallback onTap;

  const SurahCard({
    Key? key,
    required this.surah,
    required this.onTap,
  }) : super(key: key);

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final isDark = theme.brightness == Brightness.dark;

    return Card(
      color: isDark ? AppColors.subtleDark : AppColors.subtleLight,
      elevation: 0,
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(12),
      ),
      child: InkWell(
        onTap: onTap,
        borderRadius: BorderRadius.circular(12),
        child: Padding(
          padding: const EdgeInsets.all(16),
          child: Row(
            children: [
              // Surah number badge
              Container(
                width: 40,
                height: 40,
                decoration: BoxDecoration(
                  color: AppColors.primary.withOpacity(0.1),
                  borderRadius: BorderRadius.circular(8),
                ),
                child: Center(
                  child: Text(
                    '${surah.id}',
                    style: const TextStyle(
                      fontWeight: FontWeight.bold,
                      color: AppColors.primary,
                    ),
                  ),
                ),
              ),
              const SizedBox(width: 16),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      surah.name,
                      style: const TextStyle(
                        fontSize: 18,
                        fontWeight: FontWeight.bold,
                      ),
                    ),
                    const SizedBox(height: 4),
                    Text(
                      '${surah.ayahCount} verses',
                      style: TextStyle(
                        fontSize: 14,
                        color: isDark
                            ? AppColors.textDark.withOpacity(0.7)
                            : AppColors.textLight.withOpacity(0.7),
                      ),
                    ),
                  ],
                ),
              ),
              Icon(
                Icons.chevron_right,
                color: isDark ? AppColors.textDark.withOpacity(0.5) : AppColors.textLight.withOpacity(0.5),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

// ListView implementation:
// lib/presentation/screens/quran/surah_list_screen.dart
class SurahListScreen extends ConsumerWidget {
  const SurahListScreen({Key? key}) : super(key: key);

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final surahsAsync = ref.watch(surahsProvider);

    return Scaffold(
      appBar: AppBar(title: const Text('Quran')),
      body: surahsAsync.when(
        data: (surahs) => ListView.separated(
          padding: const EdgeInsets.all(16),
          itemCount: surahs.length,
          separatorBuilder: (context, index) => const SizedBox(height: 8),
          itemBuilder: (context, index) {
            final surah = surahs[index];
            return SurahCard(
              surah: surah,
              onTap: () => context.push('/quran/surah/${surah.id}'),
            );
          },
        ),
        loading: () => const Center(child: CircularProgressIndicator()),
        error: (error, stack) => CustomErrorWidget(
          message: error.toString(),
          onRetry: () => ref.invalidate(surahsProvider),
        ),
      ),
    );
  }
}

// For infinite scroll / lazy loading:
class InfiniteSurahList extends StatefulWidget {
  @override
  State<InfiniteSurahList> createState() => _InfiniteSurahListState();
}

class _InfiniteSurahListState extends State<InfiniteSurahList> {
  final _scrollController = ScrollController();
  int _currentPage = 0;

  @override
  void initState() {
    super.initState();
    _scrollController.addListener(_onScroll);
  }

  void _onScroll() {
    if (_scrollController.position.pixels >= _scrollController.position.maxScrollExtent - 200) {
      // Load more when 200px from bottom
      setState(() => _currentPage++);
    }
  }

  @override
  Widget build(BuildContext context) {
    return ListView.builder(
      controller: _scrollController,
      itemCount: ...,
      itemBuilder: (context, index) => ...,
    );
  }

  @override
  void dispose() {
    _scrollController.dispose();
    super.dispose();
  }
}
```

---

## 6. Buttons & CTAs

### HTML (Before)
```html
<button class="w-full bg-primary text-white font-bold py-4 rounded-lg text-lg hover:bg-primary/90 transition-all duration-200">
  Start Umrah
</button>

<button class="w-full bg-primary/20 text-white font-medium py-4 rounded-lg hover:bg-primary/30 transition-all duration-200" disabled="">
  Start Simulation <span class="text-xs opacity-70">(Coming Soon)</span>
</button>
```

### Flutter (After)
```dart
// lib/presentation/widgets/common/custom_button.dart
enum ButtonVariant { primary, secondary, outline, ghost }

class CustomButton extends StatelessWidget {
  final String text;
  final VoidCallback? onPressed;
  final ButtonVariant variant;
  final bool isLoading;
  final IconData? icon;
  final bool fullWidth;

  const CustomButton({
    Key? key,
    required this.text,
    this.onPressed,
    this.variant = ButtonVariant.primary,
    this.isLoading = false,
    this.icon,
    this.fullWidth = false,
  }) : super(key: key);

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);

    final buttonStyle = switch (variant) {
      ButtonVariant.primary => ElevatedButton.styleFrom(
          backgroundColor: AppColors.primary,
          foregroundColor: Colors.white,
          disabledBackgroundColor: AppColors.primary.withOpacity(0.5),
          disabledForegroundColor: Colors.white.withOpacity(0.5),
          padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 16),
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(12),
          ),
        ),
      ButtonVariant.secondary => ElevatedButton.styleFrom(
          backgroundColor: AppColors.primary.withOpacity(0.2),
          foregroundColor: Colors.white,
          disabledBackgroundColor: AppColors.primary.withOpacity(0.1),
          padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 16),
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(12),
          ),
        ),
      ButtonVariant.outline => OutlinedButton.styleFrom(
          foregroundColor: AppColors.primary,
          side: const BorderSide(color: AppColors.primary, width: 2),
          padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 16),
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(12),
          ),
        ),
      ButtonVariant.ghost => TextButton.styleFrom(
          foregroundColor: AppColors.primary,
          padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 16),
        ),
    };

    Widget child = isLoading
        ? const SizedBox(
            height: 20,
            width: 20,
            child: CircularProgressIndicator(
              strokeWidth: 2,
              valueColor: AlwaysStoppedAnimation<Color>(Colors.white),
            ),
          )
        : Row(
            mainAxisSize: MainAxisSize.min,
            children: [
              if (icon != null) ...[
                Icon(icon, size: 20),
                const SizedBox(width: 8),
              ],
              Text(
                text,
                style: const TextStyle(
                  fontSize: 16,
                  fontWeight: FontWeight.w700,
                ),
              ),
            ],
          );

    final button = variant == ButtonVariant.outline
        ? OutlinedButton(
            onPressed: isLoading ? null : onPressed,
            style: buttonStyle,
            child: child,
          )
        : variant == ButtonVariant.ghost
            ? TextButton(
                onPressed: isLoading ? null : onPressed,
                style: buttonStyle,
                child: child,
              )
            : ElevatedButton(
                onPressed: isLoading ? null : onPressed,
                style: buttonStyle,
                child: child,
              );

    return fullWidth
        ? SizedBox(width: double.infinity, child: button)
        : button;
  }
}

// Usage:
CustomButton(
  text: 'Start Umrah',
  onPressed: () => context.push('/guidance'),
  fullWidth: true,
)

CustomButton(
  text: 'Start Simulation',
  onPressed: null,  // Disabled
  variant: ButtonVariant.secondary,
  fullWidth: true,
)

CustomButton(
  text: 'AR View',
  icon: Icons.view_in_ar,
  onPressed: () {},
  variant: ButtonVariant.primary,
)
```

---

## 7. Cards & Containers

### HTML (Before)
```html
<div class="bg-background-light/10 dark:bg-background-dark/30 backdrop-blur-xl rounded-xl p-6 shadow-2xl">
  <h1 class="text-3xl font-bold text-white text-center">Your Guide to Umrah</h1>
  <p class="text-white/80 text-center mt-2 mb-6">Experience a guided and spiritually fulfilling pilgrimage.</p>
  <div class="flex flex-col gap-4">
    <!-- Buttons -->
  </div>
</div>
```

### Flutter (After)
```dart
// lib/presentation/widgets/shared/blur_container.dart
class BlurContainer extends StatelessWidget {
  final Widget child;
  final BorderRadius? borderRadius;
  final EdgeInsets padding;
  final double blurSigma;

  const BlurContainer({
    Key? key,
    required this.child,
    this.borderRadius,
    this.padding = const EdgeInsets.all(24),
    this.blurSigma = 10,
  }) : super(key: key);

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;

    return ClipRRect(
      borderRadius: borderRadius ?? BorderRadius.circular(16),
      child: BackdropFilter(
        filter: ui.ImageFilter.blur(sigmaX: blurSigma, sigmaY: blurSigma),
        child: Container(
          padding: padding,
          decoration: BoxDecoration(
            color: isDark
                ? AppColors.backgroundDark.withOpacity(0.3)
                : AppColors.backgroundLight.withOpacity(0.1),
            borderRadius: borderRadius ?? BorderRadius.circular(16),
            boxShadow: [
              BoxShadow(
                color: Colors.black.withOpacity(0.2),
                blurRadius: 20,
                offset: const Offset(0, 10),
              ),
            ],
          ),
          child: child,
        ),
      ),
    );
  }
}

// Usage:
BlurContainer(
  child: Column(
    children: [
      const Text(
        'Your Guide to Umrah',
        style: TextStyle(
          fontSize: 28,
          fontWeight: FontWeight.bold,
          color: Colors.white,
        ),
        textAlign: TextAlign.center,
      ),
      const SizedBox(height: 8),
      Text(
        'Experience a guided and spiritually fulfilling pilgrimage.',
        style: TextStyle(
          fontSize: 16,
          color: Colors.white.withOpacity(0.8),
        ),
        textAlign: TextAlign.center,
      ),
      const SizedBox(height: 24),
      CustomButton(
        text: 'Start Umrah',
        onPressed: () {},
        fullWidth: true,
      ),
      const SizedBox(height: 16),
      CustomButton(
        text: 'Start Simulation (Coming Soon)',
        onPressed: null,
        variant: ButtonVariant.secondary,
        fullWidth: true,
      ),
    ],
  ),
)
```

---

## 8. Styling (CSS → Flutter)

### CSS Variables → ThemeData
| CSS Property | Flutter Equivalent | Example |
|--------------|-------------------|---------|
| `color: #169c4c` | `color: Color(0xFF169C4C)` | AppColors.primary |
| `font-size: 18px` | `fontSize: 18` | TextStyle(fontSize: 18) |
| `font-weight: 700` | `fontWeight: FontWeight.w700` | TextStyle(fontWeight: FontWeight.bold) |
| `padding: 16px` | `padding: EdgeInsets.all(16)` | - |
| `padding: 16px 24px` | `padding: EdgeInsets.symmetric(vertical: 16, horizontal: 24)` | - |
| `margin: 8px` | `margin: EdgeInsets.all(8)` | - |
| `border-radius: 12px` | `borderRadius: BorderRadius.circular(12)` | - |
| `background: #f6f8f7` | `color: Color(0xFFF6F8F7)` | AppColors.backgroundLight |
| `opacity: 0.8` | `color: Colors.white.withOpacity(0.8)` | - |
| `box-shadow: ...` | `boxShadow: [BoxShadow(...)]` | - |
| `gap: 16px` | `SizedBox(height: 16)` or `SizedBox(width: 16)` | Between widgets |

### Spacing (Tailwind → Flutter)
| Tailwind Class | Flutter Equivalent |
|----------------|-------------------|
| `space-y-4` | `Column(children: [...], mainAxisAlignment: MainAxisAlignment.spaceBetween)` + SizedBox(height: 16) |
| `gap-4` | `SizedBox(height: 16)` between children |
| `p-4` | `padding: EdgeInsets.all(16)` |
| `px-6` | `padding: EdgeInsets.symmetric(horizontal: 24)` |
| `mt-2` | `SizedBox(height: 8)` before widget |
| `w-full` | `width: double.infinity` or `Expanded(child: ...)` |

### Flexbox → Flutter Layout
| CSS | Flutter |
|-----|---------|
| `display: flex; flex-direction: row` | `Row(children: [...])` |
| `display: flex; flex-direction: column` | `Column(children: [...])` |
| `justify-content: center` | `mainAxisAlignment: MainAxisAlignment.center` |
| `align-items: center` | `crossAxisAlignment: CrossAxisAlignment.center` |
| `justify-content: space-between` | `mainAxisAlignment: MainAxisAlignment.spaceBetween` |
| `flex: 1` | `Expanded(child: ...)` or `Flexible(child: ...)` |

---

## 9. Client-Side Routing

### HTML / JS (Before)
```html
<a href="/qibla">Qibla</a>

<script>
  // SPA routing
  window.location.href = '/quran/surah/1';
</script>
```

### Flutter / GoRouter (After)
```dart
// Route definition (see migration-plan.md for full router)
GoRoute(
  path: '/quran',
  builder: (context, state) => const QuranScreen(),
  routes: [
    GoRoute(
      path: 'surah/:id',
      builder: (context, state) {
        final id = int.parse(state.pathParameters['id']!);
        return SurahDetailScreen(surahId: id);
      },
    ),
  ],
),

// Navigation:
// Push route
context.push('/qibla');

// Push with parameters
context.push('/quran/surah/1');

// Replace current route
context.go('/home');

// Pop route
context.pop();

// Named parameters
context.pushNamed(
  'surahDetail',
  pathParameters: {'id': '1'},
  queryParameters: {'lang': 'ar'},
);

// Passing data:
context.push('/quran/surah/1', extra: {'data': surahObject});
```

---

## 10. JavaScript Interactions

### Modals / Dialogs
**HTML/JS:**
```html
<button onclick="showModal()">Delete</button>

<script>
  function showModal() {
    if (confirm('Are you sure?')) {
      deleteItem();
    }
  }
</script>
```

**Flutter:**
```dart
ElevatedButton(
  onPressed: () async {
    final confirmed = await showDialog<bool>(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('Confirm'),
        content: const Text('Are you sure?'),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context, false),
            child: const Text('Cancel'),
          ),
          TextButton(
            onPressed: () => Navigator.pop(context, true),
            child: const Text('Delete'),
          ),
        ],
      ),
    );

    if (confirmed == true) {
      deleteItem();
    }
  },
  child: const Text('Delete'),
)
```

### Tabs
**HTML:**
```html
<div class="tabs">
  <button class="active" onclick="showTab('tab1')">Tab 1</button>
  <button onclick="showTab('tab2')">Tab 2</button>
</div>
```

**Flutter:**
```dart
DefaultTabController(
  length: 2,
  child: Scaffold(
    appBar: AppBar(
      bottom: const TabBar(
        tabs: [
          Tab(text: 'Tab 1'),
          Tab(text: 'Tab 2'),
        ],
      ),
    ),
    body: const TabBarView(
      children: [
        Tab1Content(),
        Tab2Content(),
      ],
    ),
  ),
)
```

### Infinite Scroll (Lazy Load)
**HTML/JS:**
```javascript
window.addEventListener('scroll', () => {
  if (window.innerHeight + window.scrollY >= document.body.offsetHeight - 100) {
    loadMore();
  }
});
```

**Flutter:**
```dart
// See Section 5 (Lists) - InfiniteSurahList example
```

---

## 11. Static Assets

### HTML (Before)
```html
<img src="https://lh3.googleusercontent.com/.../kaaba.png" alt="Kaaba"/>
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;700&display=swap" rel="stylesheet"/>
```

### Flutter (After)
```dart
// Remote images (with caching):
CachedNetworkImage(
  imageUrl: 'https://lh3.googleusercontent.com/.../kaaba.png',
  placeholder: (context, url) => const CircularProgressIndicator(),
  errorWidget: (context, url, error) => const Icon(Icons.error),
)

// Local assets (in pubspec.yaml):
// assets:
//   - assets/images/kaaba.png

Image.asset(
  'assets/images/kaaba.png',
  width: 100,
  height: 100,
  fit: BoxFit.cover,
)

// Fonts (in pubspec.yaml):
// fonts:
//   - family: Inter
//     fonts:
//       - asset: assets/fonts/Inter/Inter-Regular.ttf
//       - asset: assets/fonts/Inter/Inter-Bold.ttf
//         weight: 700

// Usage via ThemeData (see migration-plan.md)
```

---

## 12. Dark Mode Toggle

### HTML/JS (Before)
```html
<button onclick="toggleDarkMode()">Toggle Dark Mode</button>

<script>
  function toggleDarkMode() {
    document.documentElement.classList.toggle('dark');
  }
</script>
```

### Flutter (After)
```dart
// lib/presentation/providers/theme_provider.dart
final themeModeProvider = StateProvider<ThemeMode>((ref) => ThemeMode.system);

// main.dart
class MyApp extends ConsumerWidget {
  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final themeMode = ref.watch(themeModeProvider);

    return MaterialApp.router(
      title: 'Umrah Guide',
      theme: AppTheme.lightTheme,
      darkTheme: AppTheme.darkTheme,
      themeMode: themeMode,
      routerConfig: ref.watch(routerProvider),
    );
  }
}

// Toggle button widget:
class ThemeToggle extends ConsumerWidget {
  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final themeMode = ref.watch(themeModeProvider);
    final isDark = themeMode == ThemeMode.dark ||
        (themeMode == ThemeMode.system &&
         MediaQuery.of(context).platformBrightness == Brightness.dark);

    return IconButton(
      onPressed: () {
        ref.read(themeModeProvider.notifier).state =
            isDark ? ThemeMode.light : ThemeMode.dark;
      },
      icon: Icon(isDark ? Icons.light_mode : Icons.dark_mode),
    );
  }
}
```

---

## Summary

This mapping guide provides concrete examples for converting all major HTML/CSS/JS patterns to Flutter widgets. Key takeaways:

1. **Structure:** HTML divs → Flutter Widgets (Container, Column, Row)
2. **Styling:** Tailwind classes → ThemeData + inline styles
3. **Navigation:** Anchor tags → GoRouter context methods
4. **Forms:** HTML inputs → TextFormField with validators
5. **Lists:** HTML repeated divs → ListView.builder
6. **Interactions:** JS event handlers → onPressed, onTap callbacks
7. **State:** JS variables → Riverpod providers
8. **Assets:** CDN URLs → CachedNetworkImage or local assets

**Next Phase:** Implement these patterns in the actual Flutter project (Phase D).

---

**End of Component Mapping Guide**
