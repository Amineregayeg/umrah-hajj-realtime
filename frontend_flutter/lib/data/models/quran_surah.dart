import 'package:json_annotation/json_annotation.dart';

part 'quran_surah.g.dart';

@JsonSerializable()
class QuranSurah {
  final int id;
  final String name;
  final String? transliteration;
  final String? translation;
  final String type;
  @JsonKey(name: 'ayah_count')
  final int ayahCount;
  final List<QuranAyah>? ayahs;

  QuranSurah({
    required this.id,
    required this.name,
    this.transliteration,
    this.translation,
    required this.type,
    required this.ayahCount,
    this.ayahs,
  });

  factory QuranSurah.fromJson(Map<String, dynamic> json) =>
      _$QuranSurahFromJson(json);

  Map<String, dynamic> toJson() => _$QuranSurahToJson(this);
}

@JsonSerializable()
class QuranAyah {
  final int id;
  final String text;
  final int? page;
  final int? juz;
  final int? manzil;
  final int? ruku;
  @JsonKey(name: 'hizb_quarter')
  final int? hizbQuarter;
  final bool? sajda;

  QuranAyah({
    required this.id,
    required this.text,
    this.page,
    this.juz,
    this.manzil,
    this.ruku,
    this.hizbQuarter,
    this.sajda,
  });

  factory QuranAyah.fromJson(Map<String, dynamic> json) =>
      _$QuranAyahFromJson(json);

  Map<String, dynamic> toJson() => _$QuranAyahToJson(this);
}

@JsonSerializable()
class QuranSurahsList {
  final List<QuranSurah> surahs;
  final int total;
  final String language;

  QuranSurahsList({
    required this.surahs,
    required this.total,
    required this.language,
  });

  factory QuranSurahsList.fromJson(Map<String, dynamic> json) =>
      _$QuranSurahsListFromJson(json);

  Map<String, dynamic> toJson() => _$QuranSurahsListToJson(this);
}
