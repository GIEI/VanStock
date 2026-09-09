# Configurazione mobile e Firebase

L'app mobile non contiene riferimenti a un backend o progetto Firebase
specifico. Senza configurazione Firebase l'app resta utilizzabile, ma le push
notification sono disabilitate.

## Backend

Passare l'endpoint API alla build Flutter:

```bash
flutter run --dart-define=BACKEND_BASE_URL=https://app.example.com/api
```

Usare lo stesso `--dart-define` per `flutter build apk` o `flutter build ipa`.

## Firebase (opzionale)

1. Creare o selezionare il proprio progetto Firebase.
2. Registrare le app Android e iOS con gli application identifier scelti.
3. Scaricare i file Firebase e conservarli solo localmente:
   - `MOBILE/android/app/google-services.json`;
   - `MOBILE/ios/Runner/GoogleService-Info.plist`.
4. Passare alla build le opzioni Firebase fornite dal progetto:

```bash
flutter build apk \
  --dart-define=BACKEND_BASE_URL=https://app.example.com/api \
  --dart-define=FIREBASE_ANDROID_API_KEY=... \
  --dart-define=FIREBASE_ANDROID_APP_ID=... \
  --dart-define=FIREBASE_IOS_API_KEY=... \
  --dart-define=FIREBASE_IOS_APP_ID=... \
  --dart-define=FIREBASE_MESSAGING_SENDER_ID=... \
  --dart-define=FIREBASE_PROJECT_ID=... \
  --dart-define=FIREBASE_STORAGE_BUCKET=...
```

I file Firebase scaricati sono ignorati da Git e non devono essere aggiunti al
repository. Configurare anche `FIREBASE_SERVICE_ACCOUNT_JSON` nel backend,
come descritto nella [policy dati](public-repository-data-policy.md), per
consentire l'invio delle notifiche dal server.
