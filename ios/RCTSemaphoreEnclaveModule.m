//
//  RCTSemaphoreEnclaveModule.m
//  circuitbreaker2024
//
//  Created by Tommy Lee on 13/2/2024.
//

#import <Foundation/Foundation.h>
#import <React/RCTBridgeModule.h>

@interface RCT_EXTERN_MODULE(RCTSemaphoreEnclaveModule, NSObject)

// createSecuredIdentityString()
RCT_EXTERN_METHOD(createSecuredIdentityString:(NSString)idAlias
                  resolver:(RCTPromiseResolveBlock)resolve
                  rejecter:(RCTPromiseRejectBlock)reject)

// createKeyPair()
RCT_EXTERN_METHOD(createKeyPair:(NSString)idAlias
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
