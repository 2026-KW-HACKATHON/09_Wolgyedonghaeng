import { copy } from '../config/copy';

/** 서버 오류 `{error:{code,message}}`, 네트워크 실패, 시간 초과를 모두 이 오류로 통일한다. */
export class ApiError extends Error {
  readonly code: string;
  readonly status: number | null;

  constructor(code: string, message: string, status: number | null = null) {
    super(message);
    this.name = 'ApiError';
    this.code = code;
    this.status = status;
  }

  static network(): ApiError {
    return new ApiError('network', copy.failure.network);
  }

  static timeout(): ApiError {
    return new ApiError('timeout', copy.failure.timeout);
  }

  static unknown(status: number | null = null): ApiError {
    return new ApiError('unknown', copy.failure.unknown, status);
  }
}

export function isApiError(e: unknown): e is ApiError {
  return e instanceof ApiError;
}
