import 'package:timezone/timezone.dart' as tz;
import 'package:easy_localization/easy_localization.dart';

/// Converte un orario UTC a Europe/Rome e ritorna come DateTime
DateTime convertUtcToRome(DateTime utcTime) {
  try {
    final romeLocation = tz.getLocation('Europe/Rome');
    final romeTzDateTime = tz.TZDateTime.from(utcTime, romeLocation);
    return romeTzDateTime;
  } catch (e) {
    // Se timezone non è inizializzato, ritorna semplicemente l'ora UTC
    return utcTime;
  }
}

/// Converte una stringa ISO 8601 UTC a DateTime Rome
DateTime? convertUtcStringToRome(String? utcString) {
  if (utcString == null || utcString.isEmpty) return null;
  try {
    final utcTime = DateTime.parse(utcString);
    return convertUtcToRome(utcTime);
  } catch (e) {
    return null;
  }
}

/// Formatta un orario UTC per visualizzazione in Europe/Rome
/// Esempio: "30 apr 2024 14:30"
String formatUtcToRome(DateTime? utcTime, {String format = 'dd MMM yyyy HH:mm'}) {
  if (utcTime == null) return '';
  try {
    final romeTime = convertUtcToRome(utcTime);
    final formatter = DateFormat(format);
    return formatter.format(romeTime);
  } catch (e) {
    return '';
  }
}

/// Formatta una stringa ISO 8601 UTC per visualizzazione
String formatUtcStringToRome(String? utcString, {String format = 'dd MMM yyyy HH:mm'}) {
  if (utcString == null || utcString.isEmpty) return '';
  final utcTime = DateTime.tryParse(utcString);
  if (utcTime == null) return utcString;
  return formatUtcToRome(utcTime, format: format);
}

/// Formatta solo la data da un orario UTC (es: "30/04/2024")
String formatUtcDateToRome(DateTime? utcTime) {
  return formatUtcToRome(utcTime, format: 'dd/MM/yyyy');
}

/// Formatta solo l'ora da un orario UTC (es: "14:30")
String formatUtcTimeToRome(DateTime? utcTime) {
  return formatUtcToRome(utcTime, format: 'HH:mm');
}

/// Verifica se un orario UTC è oggi in Europe/Rome
bool isToday(DateTime? utcTime) {
  if (utcTime == null) return false;
  try {
    final romeTime = convertUtcToRome(utcTime);
    final now = DateTime.now();
    return romeTime.year == now.year &&
        romeTime.month == now.month &&
        romeTime.day == now.day;
  } catch (e) {
    return false;
  }
}

/// Verifica se un orario UTC è ieri in Europe/Rome
bool isYesterday(DateTime? utcTime) {
  if (utcTime == null) return false;
  try {
    final romeTime = convertUtcToRome(utcTime);
    final yesterday = DateTime.now().subtract(const Duration(days: 1));
    return romeTime.year == yesterday.year &&
        romeTime.month == yesterday.month &&
        romeTime.day == yesterday.day;
  } catch (e) {
    return false;
  }
}
