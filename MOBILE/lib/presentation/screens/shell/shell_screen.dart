import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:easy_localization/easy_localization.dart';
import '../../../core/constants/app_constants.dart';
import '../../providers/auth_state_provider.dart';
import '../../widgets/settings_sheet.dart';

class ShellScreen extends ConsumerWidget {
  final StatefulNavigationShell navigationShell;

  const ShellScreen({super.key, required this.navigationShell});

  void _onTap(int index) {
    navigationShell.goBranch(
      index,
      initialLocation: index == navigationShell.currentIndex,
    );
  }

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final currentUser = ref.watch(currentUserProvider);
    final hasAttendance =
        currentUser?.resources.contains('MOBILE_MENU_ATTENDANCE') ?? false;

    return Scaffold(
      appBar: AppBar(
        title: Text(
          currentUser?.name ?? 'VanStock',
          maxLines: 1,
          overflow: TextOverflow.ellipsis,
        ),
        actions: [
          IconButton(
            icon: const Icon(Icons.settings),
            tooltip: 'settings.title'.tr(),
            onPressed: () {
              showSettingsSheet(context, ref);
            },
          ),
          Padding(
            padding: const EdgeInsets.only(right: 12, left: 4),
            child: _UserAvatar(
              name: currentUser?.name,
              photoUrl: currentUser?.photoUrl,
            ),
          ),
        ],
      ),
      body: Padding(
        padding: const EdgeInsets.only(bottom: 8.0),
        child: navigationShell,
      ),
      bottomNavigationBar: BottomNavigationBar(
        type: BottomNavigationBarType.fixed,
        currentIndex: hasAttendance
            ? navigationShell.currentIndex
            : navigationShell.currentIndex.clamp(0, 2) as int,
        onTap: _onTap,
        items: [
          BottomNavigationBarItem(
            icon: const Icon(Icons.dashboard_outlined),
            activeIcon: const Icon(Icons.dashboard),
            label: 'nav.dashboard'.tr(),
          ),
          BottomNavigationBarItem(
            icon: const Icon(Icons.assignment_outlined),
            activeIcon: const Icon(Icons.assignment),
            label: 'nav.jobs'.tr(),
          ),
          BottomNavigationBarItem(
            icon: const Icon(Icons.inventory_2_outlined),
            activeIcon: const Icon(Icons.inventory_2),
            label: 'nav.inventory'.tr(),
          ),
          if (hasAttendance)
            BottomNavigationBarItem(
              icon: const Icon(Icons.people_outlined),
              activeIcon: const Icon(Icons.people),
              label: 'nav.hr'.tr(),
            ),
        ],
      ),
    );
  }
}

class _UserAvatar extends StatelessWidget {
  final String? name;
  final String? photoUrl;
  const _UserAvatar({this.name, this.photoUrl});

  @override
  Widget build(BuildContext context) {
    final initials = (name != null && name!.trim().isNotEmpty)
        ? name!.trim()[0].toUpperCase()
        : '?';

    ImageProvider? image;
    if (photoUrl != null && photoUrl!.isNotEmpty) {
      final url = photoUrl!.startsWith('http')
          ? photoUrl!
          : AppConstants.baseUrl.replaceFirst(RegExp(r'/api/?$'), '') +
                photoUrl!;
      image = NetworkImage(url);
    }

    final fg =
        Theme.of(context).appBarTheme.foregroundColor ??
        Theme.of(context).colorScheme.onSurface;
    return CircleAvatar(
      radius: 16,
      backgroundColor: fg.withOpacity(0.15),
      backgroundImage: image,
      child: image == null
          ? Text(
              initials,
              style: TextStyle(
                color: fg,
                fontWeight: FontWeight.bold,
                fontSize: 14,
              ),
            )
          : null,
    );
  }
}
