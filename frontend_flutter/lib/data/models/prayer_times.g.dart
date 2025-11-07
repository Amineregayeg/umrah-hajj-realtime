// GENERATED CODE - DO NOT MODIFY BY HAND
part of 'prayer_times.dart';

PrayerTimes _$PrayerTimesFromJson(Map<String, dynamic> json) => PrayerTimes(
      location: LocationInfo.fromJson(json['location'] as Map<String, dynamic>),
      date: json['date'] as String,
      times: Times.fromJson(json['times'] as Map<String, dynamic>),
      hijriDate: json['hijri_date'] == null
          ? null
          : HijriDate.fromJson(json['hijri_date'] as Map<String, dynamic>),
      timezone: json['timezone'] as String,
      method: json['method'] as String,
    );

Map<String, dynamic> _$PrayerTimesToJson(PrayerTimes instance) =>
    <String, dynamic>{
      'location': instance.location,
      'date': instance.date,
      'times': instance.times,
      'hijri_date': instance.hijriDate,
      'timezone': instance.timezone,
      'method': instance.method,
    };

LocationInfo _$LocationInfoFromJson(Map<String, dynamic> json) => LocationInfo(
      city: json['city'] as String,
      country: json['country'] as String,
      latitude: (json['latitude'] as num).toDouble(),
      longitude: (json['longitude'] as num).toDouble(),
    );

Map<String, dynamic> _$LocationInfoToJson(LocationInfo instance) =>
    <String, dynamic>{
      'city': instance.city,
      'country': instance.country,
      'latitude': instance.latitude,
      'longitude': instance.longitude,
    };

Times _$TimesFromJson(Map<String, dynamic> json) => Times(
      fajr: json['fajr'] as String,
      sunrise: json['sunrise'] as String,
      dhuhr: json['dhuhr'] as String,
      asr: json['asr'] as String,
      maghrib: json['maghrib'] as String,
      isha: json['isha'] as String,
    );

Map<String, dynamic> _$TimesToJson(Times instance) => <String, dynamic>{
      'fajr': instance.fajr,
      'sunrise': instance.sunrise,
      'dhuhr': instance.dhuhr,
      'asr': instance.asr,
      'maghrib': instance.maghrib,
      'isha': instance.isha,
    };

HijriDate _$HijriDateFromJson(Map<String, dynamic> json) => HijriDate(
      day: json['day'] as int,
      month: json['month'] as String,
      year: json['year'] as int,
    );

Map<String, dynamic> _$HijriDateToJson(HijriDate instance) =>
    <String, dynamic>{
      'day': instance.day,
      'month': instance.month,
      'year': instance.year,
    };
