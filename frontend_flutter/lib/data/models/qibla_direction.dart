import 'package:json_annotation/json_annotation.dart';

part 'qibla_direction.g.dart';

@JsonSerializable()
class QiblaDirection {
  final Location location;
  final Qibla qibla;
  final Kaaba kaaba;
  @JsonKey(name: 'calculated_at')
  final String calculatedAt;

  QiblaDirection({
    required this.location,
    required this.qibla,
    required this.kaaba,
    required this.calculatedAt,
  });

  factory QiblaDirection.fromJson(Map<String, dynamic> json) =>
      _$QiblaDirectionFromJson(json);

  Map<String, dynamic> toJson() => _$QiblaDirectionToJson(this);
}

@JsonSerializable()
class Location {
  final double latitude;
  final double longitude;

  Location({
    required this.latitude,
    required this.longitude,
  });

  factory Location.fromJson(Map<String, dynamic> json) =>
      _$LocationFromJson(json);

  Map<String, dynamic> toJson() => _$LocationToJson(this);
}

@JsonSerializable()
class Qibla {
  final double direction;
  final double distance;

  Qibla({
    required this.direction,
    required this.distance,
  });

  factory Qibla.fromJson(Map<String, dynamic> json) => _$QiblaFromJson(json);

  Map<String, dynamic> toJson() => _$QiblaToJson(this);
}

@JsonSerializable()
class Kaaba {
  final double latitude;
  final double longitude;

  Kaaba({
    required this.latitude,
    required this.longitude,
  });

  factory Kaaba.fromJson(Map<String, dynamic> json) => _$KaabaFromJson(json);

  Map<String, dynamic> toJson() => _$KaabaToJson(this);
}
