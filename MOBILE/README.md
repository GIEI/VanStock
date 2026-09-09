# VanStock Flutter App

Flutter implementation of VanStock app using Clean Architecture + Riverpod.

## Struttura Progetto

```
lib/
├── core/                     # Core utilities
│   ├── constants/            # App constants & config
│   ├── errors/               # Failure & Result types
│   ├── network/              # Dio client & interceptors
│   └── utils/                # Helper utilities
├── data/                     # Data layer
│   ├── datasources/          # API data sources
│   ├── models/               # Freezed data models
│   └── repositories/         # Repository implementations
├── domain/                   # Domain/Business logic layer
│   ├── entities/             # Business entities
│   ├── repositories/         # Repository interfaces
│   └── usecases/             # Use cases
└── presentation/             # UI & State Management
    ├── app/                  # App widget & routing
    ├── providers/            # Riverpod providers
    ├── screens/              # Screen widgets
    └── widgets/              # Reusable widgets
```

## Tech Stack

- **State Management**: Riverpod
- **Data Models**: Freezed + json_serializable
- **Networking**: Dio
- **UI**: Flutter Material 3
- **Architecture**: Clean Architecture + MVVM
- **Localization**: flutter_localizations
- **Local Storage**: Shared Preferences + Hive

## Setup & Development

### 1. Installa dipendenze
```bash
cd MOBILE
flutter pub get
```

### 2. Genera codice (Freezed + json_serializable)
```bash
dart run build_runner build
```

### 3. Esegui l'app
```bash
flutter run
```

## Code Generation

I modelli Freezed e JSON serialization richiedono code generation. Esegui:

```bash
# Build una volta
dart run build_runner build

# Watch mode (durante sviluppo)
dart run build_runner watch
```

## Convention

### Naming
- **File**: `snake_case` (es: `home_screen.dart`)
- **Class**: `PascalCase` (es: `HomeScreen`)
- **Constants**: `camelCase` (es: `appName`)

### Architettura
1. **Domain** → Entità pure (no dipendenze)
2. **Data** → Implementazione repository + modelli JSON
3. **Presentation** → UI + Riverpod providers

### Riverpod Patterns
- **FutureProvider** → Operazioni async singole
- **StreamProvider** → Stream continui
- **StateNotifier** → State mutabile complesso
- **Provider** → Valore semplice (computed)

## Prossimi Step

1. ✅ Struttura base (pubspec.yaml + cartelle)
2. → Modelli dati (Freezed)
3. → Network layer (API services)
4. → Repository pattern
5. → Riverpod providers & state management
6. → UI Screens
7. → Localization & themes
