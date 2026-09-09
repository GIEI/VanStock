import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:easy_localization/easy_localization.dart';
import '../../../data/models/inventory_models.dart';
import '../../providers/inventory_providers.dart';

class ProductDetailScreen extends ConsumerWidget {
  final int productId;

  const ProductDetailScreen({super.key, required this.productId});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final productAsync = ref.watch(productDetailProvider(productId));

    return productAsync.when(
      loading: () => Scaffold(
        appBar: AppBar(title: Text('product_detail.details_title'.tr())),
        body: const Center(child: CircularProgressIndicator()),
      ),
      error: (error, stack) => Scaffold(
        appBar: AppBar(title: Text('product_detail.details_title'.tr())),
        body: Center(
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
                'common.error'.tr(),
                style: Theme.of(context).textTheme.titleMedium,
              ),
              const SizedBox(height: 8),
              Padding(
                padding: const EdgeInsets.symmetric(horizontal: 16),
                child: Text(
                  error.toString(),
                  style: Theme.of(context).textTheme.bodySmall,
                  textAlign: TextAlign.center,
                ),
              ),
              const SizedBox(height: 24),
              ElevatedButton(
                onPressed: () => ref.invalidate(productDetailProvider(productId)),
                child: Text('common.retry'.tr()),
              ),
            ],
          ),
        ),
      ),
      data: (product) => Scaffold(
        appBar: AppBar(
          title: Text('product_detail.details_title'.tr()),
          elevation: 0,
        ),
        body: SingleChildScrollView(
          child: Column(
            children: [
              _ProductHeaderCard(product: product),
              const SizedBox(height: 16),
              Padding(
                padding: const EdgeInsets.symmetric(horizontal: 16),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      'product_detail.inventory_title'.tr(),
                      style: Theme.of(context).textTheme.titleSmall,
                    ),
                    const SizedBox(height: 12),
                    _InventoryCard(product: product),
                    const SizedBox(height: 24),
                    Text(
                      'product_detail.details_title'.tr(),
                      style: Theme.of(context).textTheme.titleSmall,
                    ),
                    const SizedBox(height: 12),
                    if (product.sku != null)
                      _DetailRow(label: 'create_product.sku_label'.tr(), value: product.sku!),
                    if (product.barcode != null)
                      _DetailRow(label: 'create_product.barcode_label'.tr(), value: product.barcode!),
                    if (product.category != null)
                      _DetailRow(label: 'create_product.category_label'.tr(), value: product.category!),
                    if (product.unit != null)
                      _DetailRow(label: 'create_product.unit_label'.tr(), value: product.unit!),
                    if (product.price != null)
                      _DetailRow(
                        label: 'create_product.price_label'.tr(),
                        value: '€${product.price!.toStringAsFixed(2)}',
                      ),
                    if (product.minStock != null)
                      _DetailRow(
                        label: 'create_product.min_stock_label'.tr(),
                        value: product.minStock!.toStringAsFixed(1),
                      ),
                    const SizedBox(height: 24),
                    if (product.description != null) ...[
                      Text(
                        'create_product.description_label'.tr(),
                        style: Theme.of(context).textTheme.titleSmall,
                      ),
                      const SizedBox(height: 8),
                      Text(
                        product.description!,
                        style: Theme.of(context).textTheme.bodyMedium,
                      ),
                      const SizedBox(height: 24),
                    ],
                    if (product.stocks != null && product.stocks!.isNotEmpty) ...[
                      Text(
                        'product_detail.stock_by_location'.tr(),
                        style: Theme.of(context).textTheme.titleSmall,
                      ),
                      const SizedBox(height: 12),
                      ListView.builder(
                        shrinkWrap: true,
                        physics: const NeverScrollableScrollPhysics(),
                        itemCount: product.stocks!.length,
                        itemBuilder: (context, index) {
                          final stock = product.stocks![index];
                          return Card(
                            margin: const EdgeInsets.only(bottom: 8),
                            child: Padding(
                              padding: const EdgeInsets.all(12),
                              child: Row(
                                mainAxisAlignment:
                                    MainAxisAlignment.spaceBetween,
                                children: [
                                  Expanded(
                                    child: Column(
                                      crossAxisAlignment:
                                          CrossAxisAlignment.start,
                                      children: [
                                        Text(
                                          stock.locationName,
                                          style: Theme.of(context)
                                              .textTheme
                                              .labelMedium,
                                        ),
                                        if (stock.locationType != null)
                                          Text(
                                            stock.locationType!,
                                            style: Theme.of(context)
                                                .textTheme
                                                .bodySmall
                                                ?.copyWith(
                                                  color: Colors.grey.shade600,
                                                ),
                                          ),
                                      ],
                                    ),
                                  ),
                                  Text(
                                    '${stock.quantity.toStringAsFixed(1)} ${'create_product.unit_label'.tr()}',
                                    style: Theme.of(context)
                                        .textTheme
                                        .labelMedium
                                        ?.copyWith(
                                          fontWeight: FontWeight.w600,
                                        ),
                                  ),
                                ],
                              ),
                            ),
                          );
                        },
                      ),
                      const SizedBox(height: 24),
                    ],
                  ],
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

class _ProductHeaderCard extends StatelessWidget {
  final Product product;

  const _ProductHeaderCard({required this.product});

  bool get isLowStock =>
      product.minStock != null && product.quantity < product.minStock!;

  @override
  Widget build(BuildContext context) {
    return Container(
      color: isLowStock ? Colors.orange.withAlpha(20) : Colors.blue.withAlpha(20),
      padding: const EdgeInsets.all(16),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      product.name,
                      style: Theme.of(context).textTheme.headlineSmall,
                    ),
                    if (product.locationName != null) ...[
                      const SizedBox(height: 4),
                      Text(
                        product.locationName!,
                        style: Theme.of(context)
                            .textTheme
                            .bodySmall
                            ?.copyWith(color: Colors.grey.shade600),
                      ),
                    ],
                  ],
                ),
              ),
              if (isLowStock)
                Icon(
                  Icons.warning_outlined,
                  color: Colors.orange,
                  size: 28,
                ),
            ],
          ),
        ],
      ),
    );
  }
}

class _InventoryCard extends StatelessWidget {
  final Product product;

  const _InventoryCard({required this.product});

  bool get isLowStock =>
      product.minStock != null && product.quantity < product.minStock!;

  @override
  Widget build(BuildContext context) {
    return Card(
      color: isLowStock ? Colors.orange.shade50 : Colors.green.shade50,
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          children: [
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      'create_product.quantity_label'.tr(),
                      style: Theme.of(context).textTheme.labelSmall,
                    ),
                    Text(
                      product.quantity.toStringAsFixed(1),
                      style: Theme.of(context).textTheme.headlineMedium?.copyWith(
                        color: isLowStock ? Colors.orange : Colors.green,
                      ),
                    ),
                  ],
                ),
                if (product.minStock != null)
                  Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        'create_product.min_stock_label'.tr(),
                        style: Theme.of(context).textTheme.labelSmall,
                      ),
                      Text(
                        product.minStock!.toStringAsFixed(1),
                        style: Theme.of(context).textTheme.headlineMedium,
                      ),
                    ],
                  ),
              ],
            ),
            if (isLowStock) ...[
              const SizedBox(height: 12),
              Container(
                padding: const EdgeInsets.all(8),
                decoration: BoxDecoration(
                  color: Colors.orange.shade100,
                  borderRadius: BorderRadius.circular(4),
                ),
                child: Row(
                  children: [
                    Icon(Icons.warning_outlined,
                        size: 16, color: Colors.orange.shade700),
                    const SizedBox(width: 8),
                    Expanded(
                      child: Text(
                        'product_detail.low_stock_warning'.tr(),
                        style: TextStyle(
                          fontSize: 12,
                          color: Colors.orange.shade700,
                          fontWeight: FontWeight.w500,
                        ),
                      ),
                    ),
                  ],
                ),
              ),
            ],
          ],
        ),
      ),
    );
  }
}

class _DetailRow extends StatelessWidget {
  final String label;
  final String value;

  const _DetailRow({
    required this.label,
    required this.value,
  });

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 12),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          Text(
            label,
            style: Theme.of(context)
                .textTheme
                .labelMedium
                ?.copyWith(color: Colors.grey.shade600),
          ),
          Text(
            value,
            style: Theme.of(context).textTheme.labelMedium?.copyWith(
              fontWeight: FontWeight.w500,
            ),
            textAlign: TextAlign.end,
            maxLines: 2,
            overflow: TextOverflow.ellipsis,
          ),
        ],
      ),
    );
  }
}
