//
//  RCTSemaphoreEnclaveModule.m
//  circuitbreaker2024
//
//  Created by Tommy Lee on 13/2/2024.
//

#import <Foundation/Foundation.h>
#import <React/RCTBridgeModule.h>

@interface RCT_EXTERN_MODULE(RCTSemaphoreEnclaveModule, NSObject)

// createSecuredIdMessage()
RCT_EXTERN_METHOD(createSecuredIdMessage:(NSString)idAlias
                  resolver:(RCTPromiseResolveBlock)resolve
                  rejecter:(RCTPromiseRejectBlock)reject)

// authenticate()
RCT_EXTERN_METHOD(authenticate:(NSString)idAlias
                  resolver:(RCTPromiseResolveBlock)resolve
                  rejecter:(RCTPromiseRejectBlock)reject)

// run in the background queue
+ (BOOL)requiresMainQueueSetup
{
  return NO;
}

@end
