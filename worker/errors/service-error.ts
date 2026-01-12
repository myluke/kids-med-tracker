/**
 * 错误代码枚举 - 与前端约定的错误标识
 */
export const ErrorCode = {
  // 通用错误
  BAD_REQUEST: 'BAD_REQUEST',
  VALIDATION_ERROR: 'VALIDATION_ERROR',

  // 认证错误
  UNAUTHENTICATED: 'UNAUTHENTICATED',
  INVALID_EMAIL: 'INVALID_EMAIL',

  // 授权错误
  FORBIDDEN: 'FORBIDDEN',
  NOT_FAMILY_MEMBER: 'NOT_FAMILY_MEMBER',
  NOT_FAMILY_OWNER: 'NOT_FAMILY_OWNER',

  // 资源错误
  NOT_FOUND: 'NOT_FOUND',
  GONE: 'GONE',

  // 业务限制
  FAMILY_LIMIT: 'FAMILY_LIMIT',
  RECORD_NOT_EDITABLE: 'RECORD_NOT_EDITABLE',
  INVITE_EXPIRED: 'INVITE_EXPIRED',
  INVITE_USED: 'INVITE_USED',

  // 系统错误
  DB_ERROR: 'DB_ERROR',
  EMAIL_FAILED: 'EMAIL_FAILED',
  INTERNAL_ERROR: 'INTERNAL_ERROR',
} as const

export type ErrorCodeType = typeof ErrorCode[keyof typeof ErrorCode]

/**
 * 服务层异常类
 * 包含 HTTP 状态码、错误代码、用户友好消息
 */
export class ServiceError extends Error {
  constructor(
    public readonly statusCode: number,
    public readonly code: ErrorCodeType,
    message: string,
    public readonly details?: unknown
  ) {
    super(message)
    this.name = 'ServiceError'
  }

  /**
   * 工厂方法 - 常见错误快捷创建
   */
  static badRequest(message: string, details?: unknown) {
    return new ServiceError(400, ErrorCode.BAD_REQUEST, message, details)
  }

  static validationError(message: string, details?: unknown) {
    return new ServiceError(400, ErrorCode.VALIDATION_ERROR, message, details)
  }

  static unauthorized(message = 'Not authenticated') {
    return new ServiceError(401, ErrorCode.UNAUTHENTICATED, message)
  }

  static forbidden(message = 'Access denied') {
    return new ServiceError(403, ErrorCode.FORBIDDEN, message)
  }

  static notFamilyMember() {
    return new ServiceError(403, ErrorCode.NOT_FAMILY_MEMBER, 'Not a family member')
  }

  static notFamilyOwner() {
    return new ServiceError(403, ErrorCode.NOT_FAMILY_OWNER, 'Only owner can perform this action')
  }

  static notFound(resource = 'Resource') {
    return new ServiceError(404, ErrorCode.NOT_FOUND, `${resource} not found`)
  }

  static gone(message: string) {
    return new ServiceError(410, ErrorCode.GONE, message)
  }

  static dbError(message = 'Database operation failed') {
    return new ServiceError(500, ErrorCode.DB_ERROR, message)
  }

  static internal(message = 'Internal server error') {
    return new ServiceError(500, ErrorCode.INTERNAL_ERROR, message)
  }
}
