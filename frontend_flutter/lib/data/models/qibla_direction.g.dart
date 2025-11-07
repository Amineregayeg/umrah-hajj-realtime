// GENERATED CODE - DO NOT MODIFY BY HAND
part of 'qibla_direction.dart';

QiblaDirection _$QiblaDirectionFromJson(Map<String, dynamic> json) =>
    QiblaDirection(
      location: Location.fromJson(json['location'] as Map<String, dynamic>),
      qibla: Qibla.fromJson(json['qibla'] as Map<String, dynamic>),
      kaaba: Kaaba.fromJson(json['kaaba'] as Map<String, dynamic>),
      calculatedAt: json['calculated_at'] as String,
    );

Map<String, dynamic> _$QiblaDirectionToJson(QiblaDirection instance) =>
    <String, dynamic>{
      'location': instance.location,
      'qibla': instance.qibla,
      'kaaba': instance.kaaba,
      'calculated_at': instance.calculatedAt,
    };

Location _$LocationFromJson(Map<String, dynamic> json) => Location(
      latitude: (json['latitude'] as num).toDouble(),
      longitude: (json['longitude'] as num).toDouble(),
    );

Map<String, dynamic> _$LocationToJson(Location instance) => <String, dynamic>{
      'latitude': instance.latitude,
      'longitude': instance.longitude,
    };

Qibla _$QiblaFromJson(Map<String, dynamic> json) => Qibla(
      direction: (json['direction'] as num).toDouble(),
      distance: (json['distance'] as num).toDouble(),
    );

Map<String, dynamic> _$QiblaToJson(Qibla instance) => <String, dynamic>{
      'direction': instance.direction,
      'distance': instance.distance,
    };

Kaaba _$KaabaFromJson(Map<String, dynamic> json) => Kaaba(
      latitude: (json['latitude'] as num).toDouble(),
      longitude: (json['longitude'] as num).toDouble(),
    );

Map<String, dynamic> _$KaabaToJson(Kaaba instance) => <String, dynamic>{
      'latitude': instance.latitude,
      'longitude': instance.longitude,
    };
