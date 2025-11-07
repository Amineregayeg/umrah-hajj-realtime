import 'package:flutter_secure_storage/flutter_secure_storage.dart';

class SecureStorage {
  static const _storage = FlutterSecureStorage(
    aOptions: AndroidOptions(
      encryptedSharedPreferences: true,
    ),
  );

  // Token keys
  static const String _authTokenKey = 'auth_token';
  static const String _refreshTokenKey = 'refresh_token';

  // Read/Write methods
  Future<String?> read({required String key}) async {
    return await _storage.read(key: key);
  }

  Future<void> write({required String key, required String value}) async {
    await _storage.write(key: key, value: value);
  }

  Future<void> delete({required String key}) async {
    await _storage.delete(key: key);
  }

  Future<void> deleteAll() async {
    await _storage.deleteAll();
  }

  // Auth token specific methods
  Future<String?> getAuthToken() async {
    return await read(key: _authTokenKey);
  }

  Future<void> setAuthToken(String token) async {
    await write(key: _authTokenKey, value: token);
  }

  Future<void> deleteAuthToken() async {
    await delete(key: _authTokenKey);
  }

  Future<String?> getRefreshToken() async {
    return await read(key: _refreshTokenKey);
  }

  Future<void> setRefreshToken(String token) async {
    await write(key: _refreshTokenKey, value: token);
  }

  Future<void> deleteRefreshToken() async {
    await delete(key: _refreshTokenKey);
  }

  // Clear all auth data
  Future<void> clearAuthData() async {
    await deleteAuthToken();
    await deleteRefreshToken();
  }
}
