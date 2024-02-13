//
//  RCTSemaphoreEnclaveError.swift
//  circuitbreaker2024
//
//  Created by Tommy Lee on 14/2/2024.
//

import Foundation

enum RCTSemaphoreEnclaveError: Error {
  case customError(_ message: String)
}

extension RCTSemaphoreEnclaveError: LocalizedError {
  public var errorDescription: String? {
    switch self {
    case let .customError(message):
      return NSLocalizedString(message, comment: message)
    }
  }
}
