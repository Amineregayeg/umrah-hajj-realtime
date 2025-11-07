import 'package:json_annotation/json_annotation.dart';

part 'prayer_times.g.dart';

@JsonSerializable()
class PrayerTimes {
  final LocationInfo location;
  final String date;
  final Times times;
  @JsonKey(name: 'hijri_date')
  final HijriDate? hijriDate;
  final String timezone;
  final String method;

  PrayerTimes({
    required this.location,
    required this.date,
    required this.times,
    this.hijriDate,
    required this.timezone,
    required this.method,
  });

  factory PrayerTimes.fromJson(Map<String, dynamic> json) =>
      _$PrayerTimesFromJson(json);

  Map<String, dynamic> toJson() => _$PrayerTimesToJson(this);
}

@JsonSerializable()
class LocationInfo {
  final String city;
  final String country;
  final double latitude;
  final double longitude;

  LocationInfo({
    required this.city,
    required this.country,
    required this.latitude,
    required this.longitude,
  });

  factory LocationInfo.fromJson(Map<String, dynamic> json) =>
      _$LocationInfoFromJson(json);

  Map<String, dynamic> toJson() => _$LocationInfoToJson(this);
}

@JsonSerializable()
class Times {
  final String fajr;
  final String sunrise;
  final String dhuhr;
  final String asr;
  final String maghrib;
  final String isha;

  Times({
    required this.fajr,
    required this.sunrise,
    required this.dhuhr,
    required this.asr,
    required this.maghrib,
    required this.isha,
  });

  factory Times.fromJson(Map<String, dynamic> json) => _$TimesFromJson(json);

  Map<String, dynamic> toJson() => _$TimesToJson(this);
}

@JsonSerializable()
class HijriDate {
  final int day;
  final String month;
  final int year;

  HijriDate({
    required this.day,
    required this.month,
    required this.year,
  });

  factory HijriDate.fromJson(Map<String, dynamic> json) =>
      _$HijriDateFromJson(json);

  Map<String, dynamic> toJson() => _$HijriDateToJson(this);
}
