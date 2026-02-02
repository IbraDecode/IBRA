import 'package:dio/dio.dart';
import '../config/constants.dart';

class ApiService {
  late final Dio _dio;
  String? _authToken;
  String? _deviceId;

  ApiService() {
    _dio = Dio(BaseOptions(
      baseUrl: AppConstants.apiBaseUrl,
      connectTimeout: AppConstants.connectTimeout,
      receiveTimeout: AppConstants.receiveTimeout,
      headers: {
        'Content-Type': 'application/json',
      },
    ));

    _dio.interceptors.add(InterceptorsWrapper(
      onRequest: (options, handler) {
        if (_authToken != null) {
          options.headers['X-Session-Token'] = _authToken;
        }
        if (_deviceId != null) {
          options.headers['X-Device-Id'] = _deviceId;
        }
        return handler.next(options);
      },
    ));
  }

  void setSession(String token, String deviceId) {
    _authToken = token;
    _deviceId = deviceId;
  }

  Future<Response> get(String path,
      {Map<String, dynamic>? queryParameters}) async {
    return _dio.get(path, queryParameters: queryParameters);
  }

  Future<Response> post(String path, {dynamic data}) async {
    return _dio.post(path, data: data);
  }

  Future<Response> delete(String path) async {
    return _dio.delete(path);
  }
}
