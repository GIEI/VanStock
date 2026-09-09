import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:easy_localization/easy_localization.dart';
import 'package:cached_network_image/cached_network_image.dart';
import '../../../data/models/inventory_models.dart';
import '../../../core/errors/result.dart';
import '../../providers/inventory_providers.dart';

/// Thumbnail loader for inventory cards. Uses the backend's lazy /uploads/thumb
/// endpoint and an in-memory + disk cache via CachedNetworkImage.
Widget _productThumb(Product product, {required double height, BoxFit fit = BoxFit.cover}) {
  final url = product.thumbPhotoUrl;
  if (url == null) {
    return Center(
      child: Icon(Icons.image_outlined, color: Colors.grey.shade400, size: 32),
    );
  }
  return CachedNetworkImage(
    imageUrl: url,
    fit: fit,
    fadeInDuration: const Duration(milliseconds: 150),
    memCacheHeight: 300,
    placeholder: (context, _) => const Center(
      child: SizedBox(width: 18, height: 18, child: CircularProgressIndicator(strokeWidth: 2)),
    ),
    errorWidget: (context, _, __) => Center(
      child: Icon(Icons.image_not_supported, color: Colors.grey.shade400, size: 32),
    ),
  );
}

enum ViewType { list, grid }

class InventoryScreen extends ConsumerStatefulWidget {
  const InventoryScreen({super.key});

  @override
  ConsumerState<InventoryScreen> createState() => _InventoryScreenState();
}

class _InventoryScreenState extends ConsumerState<InventoryScreen> {
  String searchQuery = '';
  String selectedCategory = 'All';
  int? selectedLocationId;
  bool lowStockOnly = false;
  ViewType viewType = ViewType.list;

  @override
  Widget build(BuildContext context) {
    final productsAsync = ref.watch(productsListProvider((
      lowStock: lowStockOnly,
      locationId: selectedLocationId,
    )));
    final categoriesAsync = ref.watch(categoriesProvider);
    final locationsAsync = ref.watch(locationsProvider);

    return Scaffold(
      appBar: AppBar(
        title: Text('products.title'.tr()),
        actions: [
          IconButton(
            icon: Icon(lowStockOnly ? Icons.warning : Icons.warning_outlined),
            onPressed: () => setState(() => lowStockOnly = !lowStockOnly),
            tooltip: 'products.filter_low_stock_tooltip'.tr(),
          ),
          IconButton(
            icon: Icon(viewType == ViewType.grid ? Icons.list : Icons.grid_3x3),
            onPressed: () => setState(() =>
                viewType = viewType == ViewType.list ? ViewType.grid : ViewType.list),
            tooltip: 'products.toggle_view_tooltip'.tr(),
          ),
          IconButton(
            icon: const Icon(Icons.refresh),
            onPressed: () {
              ref.invalidate(productsListProvider);
              ref.invalidate(categoriesProvider);
            },
          ),
        ],
      ),
      floatingActionButton: FloatingActionButton.extended(
        onPressed: () async {
          final confirmed = await showModalBottomSheet<bool>(
            context: context,
            isScrollControlled: true,
            builder: (_) => _CreateMovementSheet(
              onSaved: () {
                ref.invalidate(productsListProvider);
              },
            ),
          );
          if (confirmed == true && context.mounted) {
            ref.invalidate(productsListProvider);
          }
        },
        icon: const Icon(Icons.swap_horiz),
        label: Text('movements.new_movement'.tr()),
      ),
      body: Column(
        children: [
          Padding(
            padding: const EdgeInsets.all(16),
            child: TextField(
              decoration: InputDecoration(
                hintText: 'products.search_hint'.tr(),
                prefixIcon: const Icon(Icons.search),
                border: OutlineInputBorder(
                  borderRadius: BorderRadius.circular(12),
                ),
                contentPadding: const EdgeInsets.symmetric(horizontal: 16),
              ),
              onChanged: (value) => setState(() => searchQuery = value),
            ),
          ),
          categoriesAsync.when(
            loading: () => const SizedBox(height: 50),
            error: (error, _) => Padding(
              padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
              child: Text(
                'products.error_loading_categories'.tr(namedArgs: {'error': error.toString()}),
                style: const TextStyle(color: Colors.red, fontSize: 12),
              ),
            ),
            data: (categories) => SingleChildScrollView(
              scrollDirection: Axis.horizontal,
              padding: const EdgeInsets.only(left: 16, right: 16, bottom: 16),
              child: Row(
                children: categories
                    .map((category) => Padding(
                          padding: const EdgeInsets.only(right: 12),
                          child: FilterChip(
                            label: Text(category == 'All' ? 'common.all'.tr() : category),
                            selected: selectedCategory == category,
                            onSelected: (selected) =>
                                setState(() => selectedCategory = category),
                          ),
                        ))
                    .toList(),
              ),
            ),
          ),
          locationsAsync.when(
            loading: () => const SizedBox(height: 50),
            error: (error, _) => Padding(
              padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
              child: Text(
                'products.error_loading_locations'.tr(namedArgs: {'error': error.toString()}),
                style: const TextStyle(color: Colors.red, fontSize: 12),
              ),
            ),
            data: (locations) {
              return SingleChildScrollView(
                scrollDirection: Axis.horizontal,
                padding: const EdgeInsets.only(left: 16, right: 16, bottom: 16),
                child: Row(
                  children: [
                    Padding(
                      padding: const EdgeInsets.only(right: 12),
                      child: FilterChip(
                        label: Text('common.all'.tr()),
                        selected: selectedLocationId == null,
                        onSelected: (_) => setState(() => selectedLocationId = null),
                      ),
                    ),
                    ...locations.map((location) => Padding(
                          padding: const EdgeInsets.only(right: 12),
                          child: FilterChip(
                            label: Text(location.name),
                            selected: selectedLocationId == location.id,
                            onSelected: (_) => setState(() => selectedLocationId = location.id),
                          ),
                        )),
                  ],
                ),
              );
            },
          ),
          Expanded(
            child: productsAsync.when(
              loading: () => const Center(child: CircularProgressIndicator()),
              error: (error, stack) => Center(
                child: Column(
                  mainAxisAlignment: MainAxisAlignment.center,
                  children: [
                    Icon(
                      Icons.error_outline,
                      size: 64,
                      color: Colors.red.shade400,
                    ),
                    const SizedBox(height: 16),
                    Text(
                      'products.failed_load'.tr(),
                      style: Theme.of(context).textTheme.titleMedium,
                    ),
                    const SizedBox(height: 24),
                    ElevatedButton(
                      onPressed: () =>
                          ref.invalidate(productsListProvider),
                      child: Text('common.retry'.tr()),
                    ),
                  ],
                ),
              ),
              data: (response) {
                var products = response.data;

                if (searchQuery.isNotEmpty) {
                  products = products
                      .where((p) =>
                          p.name.toLowerCase().contains(searchQuery.toLowerCase()))
                      .toList();
                }

                if (selectedCategory != 'All') {
                  products = products
                      .where((p) => p.category?.toLowerCase() == selectedCategory.toLowerCase())
                      .toList();
                }



                if (products.isEmpty) {
                  return Center(
                    child: Column(
                      mainAxisAlignment: MainAxisAlignment.center,
                      children: [
                        Icon(
                          Icons.inventory_2_outlined,
                          size: 64,
                          color: Colors.grey.shade400,
                        ),
                        const SizedBox(height: 16),
                        Text(
                          'products.no_products'.tr(),
                          style: Theme.of(context).textTheme.titleMedium,
                        ),
                      ],
                    ),
                  );
                }

                if (viewType == ViewType.grid) {
                  return GridView.builder(
                    padding: const EdgeInsets.all(8),
                    gridDelegate:
                        const SliverGridDelegateWithFixedCrossAxisCount(
                      crossAxisCount: 2,
                      childAspectRatio: 0.65,
                      crossAxisSpacing: 8,
                      mainAxisSpacing: 8,
                    ),
                    itemCount: products.length,
                    itemBuilder: (context, index) {
                      final product = products[index];
                      return _ProductGridCard(
                        product: product,
                        onTap: () =>
                            context.push('/inventory/${product.id}'),
                      );
                    },
                  );
                }

                return ListView.builder(
                  padding: const EdgeInsets.all(8),
                  itemCount: products.length,
                  itemBuilder: (context, index) {
                    final product = products[index];
                    return _ProductCard(
                      product: product,
                      showLocation: selectedLocationId != null,
                      onTap: () =>
                          context.push('/inventory/${product.id}'),
                    );
                  },
                );
              },
            ),
          ),
        ],
      ),
    );
  }
}

class _ProductCard extends StatelessWidget {
  final Product product;
  final bool showLocation;
  final VoidCallback? onTap;

  const _ProductCard({required this.product, this.showLocation = false, this.onTap});

  @override
  Widget build(BuildContext context) {
    return InkWell(
      onTap: onTap,
      child: Card(
        margin: const EdgeInsets.symmetric(vertical: 6, horizontal: 8),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Padding(
              padding: const EdgeInsets.all(12),
              child: Text(
                product.name,
                style: Theme.of(context).textTheme.titleSmall?.copyWith(
                  fontWeight: FontWeight.bold,
                ),
                maxLines: 1,
                overflow: TextOverflow.ellipsis,
              ),
            ),
            Container(
              width: double.infinity,
              height: 120,
              color: Colors.grey.shade100,
              child: _productThumb(product, height: 120),
            ),
            Padding(
              padding: const EdgeInsets.all(12),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  if (product.locationName != null && showLocation)
                    Row(
                      children: [
                        Icon(
                          Icons.location_on,
                          size: 14,
                          color: Colors.grey.shade600,
                        ),
                        const SizedBox(width: 4),
                        Expanded(
                          child: Text(
                            product.locationName!,
                            style: Theme.of(context).textTheme.bodySmall?.copyWith(
                              color: Colors.grey.shade600,
                            ),
                            maxLines: 1,
                            overflow: TextOverflow.ellipsis,
                          ),
                        ),
                      ],
                    ),
                  const SizedBox(height: 6),
                  Text(
                    '${product.quantity.toStringAsFixed(1)} ${product.unit ?? 'common.unit_default'.tr()}',
                    style: Theme.of(context).textTheme.bodySmall?.copyWith(
                      color: Colors.green,
                      fontWeight: FontWeight.w500,
                    ),
                  ),
                  if (product.sku != null && product.sku!.isNotEmpty) ...[
                    const SizedBox(height: 4),
                    Text(
                      'SKU: ${product.sku}',
                      style: Theme.of(context).textTheme.bodySmall?.copyWith(
                        color: Colors.grey.shade600,
                        fontSize: 11,
                      ),
                    ),
                  ],
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }
}

// ── Create Movement Sheet ────────────────────────────────────────────────────

class _CreateMovementSheet extends ConsumerStatefulWidget {
  final VoidCallback onSaved;

  const _CreateMovementSheet({required this.onSaved});

  @override
  ConsumerState<_CreateMovementSheet> createState() => _CreateMovementSheetState();
}

class _CreateMovementSheetState extends ConsumerState<_CreateMovementSheet> {
  String _movementType = 'scarico';
  Product? _selectedProduct;
  Location? _fromLocation;
  Location? _toLocation;
  final _quantityController = TextEditingController();
  bool _saving = false;

  @override
  void dispose() {
    _quantityController.dispose();
    super.dispose();
  }

  bool get _needsFrom => _movementType == 'scarico' || _movementType == 'trasferimento';
  bool get _needsTo => _movementType == 'carico' || _movementType == 'trasferimento';

  bool get _canSave {
    if (_selectedProduct == null || _saving) return false;
    final qty = double.tryParse(_quantityController.text);
    if (qty == null || qty <= 0) return false;
    if (_needsFrom && _fromLocation == null) return false;
    if (_needsTo && _toLocation == null) return false;
    return true;
  }

  Future<void> _save() async {
    if (!_canSave) return;
    setState(() => _saving = true);
    try {
      final dto = CreateMovementDto(
        productId: _selectedProduct!.id,
        type: _movementType,
        quantity: double.parse(_quantityController.text),
        fromLocationId: _needsFrom ? _fromLocation!.id : null,
        toLocationId: _needsTo ? _toLocation!.id : null,
        notes: null,
        jobId: null,
        createdBy: null,
        purchasePrice: null,
      );
      final result = await ref.read(inventoryRepositoryProvider).createMovement(dto);
      if (!mounted) return;
      switch (result) {
        case Success<Movement>():
          widget.onSaved();
          Navigator.pop(context, true);
        case Failure<Movement>(:final failure):
          ScaffoldMessenger.of(context).showSnackBar(
            SnackBar(content: Text('${'common.error'.tr()}: $failure')),
          );
      }
    } finally {
      if (mounted) setState(() => _saving = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final locationsAsync = ref.watch(locationsProvider);
    final productsAsync = ref.watch(productsListProvider((lowStock: false, locationId: null)));
    final allProducts = productsAsync.maybeWhen(data: (r) => r.data, orElse: () => <Product>[]);
    final locations = locationsAsync.maybeWhen(data: (l) => l, orElse: () => <Location>[]);

    return Padding(
      padding: EdgeInsets.only(
        left: 16,
        right: 16,
        top: 16,
        bottom: MediaQuery.of(context).viewInsets.bottom + 16,
      ),
      child: SingleChildScrollView(
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                Expanded(
                  child: Text(
                    'movements.new_movement'.tr(),
                    style: const TextStyle(fontSize: 18, fontWeight: FontWeight.bold),
                  ),
                ),
                IconButton(
                  onPressed: () => Navigator.pop(context),
                  icon: const Icon(Icons.close),
                ),
              ],
            ),
            const SizedBox(height: 16),
            SegmentedButton<String>(
              segments: [
                ButtonSegment(value: 'carico', label: Text('movements.type_carico'.tr()), icon: const Icon(Icons.add_circle_outline, size: 18)),
                ButtonSegment(value: 'scarico', label: Text('movements.type_scarico'.tr()), icon: const Icon(Icons.remove_circle_outline, size: 18)),
                ButtonSegment(value: 'trasferimento', label: Text('movements.type_trasferimento'.tr()), icon: const Icon(Icons.swap_horiz, size: 18)),
              ],
              selected: {_movementType},
              onSelectionChanged: (s) => setState(() {
                _movementType = s.first;
                _fromLocation = null;
                _toLocation = null;
              }),
            ),
            const SizedBox(height: 20),
            Text('movements.product_label'.tr(), style: const TextStyle(fontWeight: FontWeight.w600, fontSize: 13)),
            const SizedBox(height: 8),
            Autocomplete<Product>(
              displayStringForOption: (p) => p.name,
              optionsBuilder: (textEditingValue) {
                if (textEditingValue.text.isEmpty) return allProducts.take(20);
                return allProducts.where((p) =>
                    p.name.toLowerCase().contains(textEditingValue.text.toLowerCase()));
              },
              onSelected: (p) => setState(() => _selectedProduct = p),
              fieldViewBuilder: (context, controller, focusNode, onSubmit) => TextField(
                controller: controller,
                focusNode: focusNode,
                decoration: InputDecoration(
                  hintText: 'movements.product_hint'.tr(),
                  border: OutlineInputBorder(borderRadius: BorderRadius.circular(8)),
                  prefixIcon: const Icon(Icons.inventory_2_outlined),
                  contentPadding: const EdgeInsets.symmetric(horizontal: 12, vertical: 14),
                ),
              ),
            ),
            const SizedBox(height: 16),
            Text('movements.quantity_label'.tr(), style: const TextStyle(fontWeight: FontWeight.w600, fontSize: 13)),
            const SizedBox(height: 8),
            TextField(
              controller: _quantityController,
              keyboardType: const TextInputType.numberWithOptions(decimal: true),
              onChanged: (_) => setState(() {}),
              decoration: InputDecoration(
                hintText: '0',
                border: OutlineInputBorder(borderRadius: BorderRadius.circular(8)),
                prefixIcon: const Icon(Icons.numbers),
                suffixText: _selectedProduct?.unit ?? '',
                contentPadding: const EdgeInsets.symmetric(horizontal: 12, vertical: 14),
              ),
            ),
            const SizedBox(height: 16),
            if (_needsFrom) ...[
              Text('movements.from_location_label'.tr(), style: const TextStyle(fontWeight: FontWeight.w600, fontSize: 13)),
              const SizedBox(height: 8),
              DropdownButtonFormField<Location>(
                value: _fromLocation,
                decoration: InputDecoration(
                  border: OutlineInputBorder(borderRadius: BorderRadius.circular(8)),
                  contentPadding: const EdgeInsets.symmetric(horizontal: 12, vertical: 14),
                ),
                hint: Text('movements.location_hint'.tr()),
                items: locations.map((l) => DropdownMenuItem(value: l, child: Text(l.name))).toList(),
                onChanged: (l) => setState(() => _fromLocation = l),
              ),
              const SizedBox(height: 16),
            ],
            if (_needsTo) ...[
              Text('movements.to_location_label'.tr(), style: const TextStyle(fontWeight: FontWeight.w600, fontSize: 13)),
              const SizedBox(height: 8),
              DropdownButtonFormField<Location>(
                value: _toLocation,
                decoration: InputDecoration(
                  border: OutlineInputBorder(borderRadius: BorderRadius.circular(8)),
                  contentPadding: const EdgeInsets.symmetric(horizontal: 12, vertical: 14),
                ),
                hint: Text('movements.location_hint'.tr()),
                items: locations.map((l) => DropdownMenuItem(value: l, child: Text(l.name))).toList(),
                onChanged: (l) => setState(() => _toLocation = l),
              ),
              const SizedBox(height: 16),
            ],
            SizedBox(
              width: double.infinity,
              child: ElevatedButton(
                onPressed: _canSave ? _save : null,
                style: ElevatedButton.styleFrom(padding: const EdgeInsets.symmetric(vertical: 14)),
                child: _saving
                    ? const SizedBox(width: 20, height: 20, child: CircularProgressIndicator(strokeWidth: 2))
                    : Text('movements.save_movement'.tr()),
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class _ProductGridCard extends StatelessWidget {
  final Product product;
  final VoidCallback? onTap;

  const _ProductGridCard({required this.product, this.onTap});

  @override
  Widget build(BuildContext context) {
    return InkWell(
      onTap: onTap,
      child: Card(
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Expanded(
              child: Container(
                width: double.infinity,
                color: Colors.grey.shade100,
                child: _productThumb(product, height: 200),
              ),
            ),
            Padding(
              padding: const EdgeInsets.all(8),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    product.name,
                    style: Theme.of(context).textTheme.titleSmall,
                    maxLines: 2,
                    overflow: TextOverflow.ellipsis,
                  ),
                  const SizedBox(height: 4),
                  Text(
                    '${product.quantity.toStringAsFixed(1)} ${product.unit ?? 'common.unit_default'.tr()}',
                    style: Theme.of(context).textTheme.bodySmall?.copyWith(
                      color: Colors.green,
                      fontWeight: FontWeight.w500,
                    ),
                  ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }
}
