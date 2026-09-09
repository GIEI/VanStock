import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:van_stock/presentation/app/app.dart';

void main() {
  testWidgets('App launches and displays home screen', (WidgetTester tester) async {
    // Build our app and trigger a frame.
    await tester.pumpWidget(
      const ProviderScope(
        child: StockSimpleApp(),
      ),
    );

    // Verify that the home screen renders.
    expect(find.text('StockSimple'), findsWidgets);
    expect(find.byIcon(Icons.inventory_2), findsOneWidget);
    expect(find.text('Welcome to StockSimple'), findsOneWidget);
  });
}
