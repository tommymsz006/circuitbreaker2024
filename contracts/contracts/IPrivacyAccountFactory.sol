//SPDX-License-Identifier: GPL-3.0
pragma solidity ^0.8.24;

interface IPrivacyAccountFactory {
    function addIdCommitment(uint256 idCommitment) external;
    function verifySignature(bytes calldata signature, uint256 nonce) external;
}
