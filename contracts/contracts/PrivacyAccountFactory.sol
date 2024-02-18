// SPDX-License-Identifier: GPL-3.0
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/utils/Create2.sol";
import "@openzeppelin/contracts/proxy/ERC1967/ERC1967Proxy.sol";

//import "@semaphore-protocol/contracts/interfaces/ISemaphore.sol";
import "./ISemaphore.sol";
import "./ISemaphoreGroups.sol";

import "./PrivacyAccount.sol";
import "./IPrivacyAccountFactory.sol";

contract PrivacyAccountFactory is IPrivacyAccountFactory {
    PrivacyAccount public immutable accountImplementation;

    uint256 public constant DEFAULT_GROUP_DEPTH = 20;
    ISemaphore private immutable _semaphore;

    constructor(IEntryPoint anEntryPoint, ISemaphore aSemaphore) {
        accountImplementation = new PrivacyAccount(anEntryPoint, this);

        // create a default group to host wallet identity commitments
        _semaphore = aSemaphore;
        _semaphore.createGroup(uint256(uint160(address(this))), DEFAULT_GROUP_DEPTH, address(this));
    }

    function semaphore() public view virtual returns (ISemaphore) {
        return _semaphore;
    }

    // create a new account and return the contract address
    function createAccount(address owner, bytes calldata encryptedIdMessage, uint256 salt) public returns (PrivacyAccount ret) {
        address addr = getAddress(owner, encryptedIdMessage, salt);
        uint codeSize = addr.code.length;
        if (codeSize > 0) {
            return PrivacyAccount(payable(addr));
        }
        ret = PrivacyAccount(payable(new ERC1967Proxy{salt : bytes32(salt)}(
                address(accountImplementation),
                abi.encodeCall(PrivacyAccount.initialize, (owner, encryptedIdMessage))
            )));
    }

    // calculate the address using Create2
    function getAddress(address owner, bytes calldata encryptedIdMessage, uint256 salt) public view returns (address) {
        return Create2.computeAddress(bytes32(salt), keccak256(abi.encodePacked(
                type(ERC1967Proxy).creationCode,
                abi.encode(
                    address(accountImplementation),
                    abi.encodeCall(PrivacyAccount.initialize, (owner, encryptedIdMessage))
                )
            )));
    }

    // called by external signer to add a new identity commitment
    function addIdCommitment(uint256 idCommitment) external override {
        _semaphore.addMember(uint256(uint160(address(this))), idCommitment);
    }

    // verify the given signature from the user operation
    function verifySignature(bytes calldata signature, uint256 nonce) external override {
        // decode the signature to obtain the nullifier hash and the ZK proof
        (uint256 nullifierHash, uint256[8] memory proof) = abi.decode(signature, (uint256, uint256[8]));

        // verify the proof by the semaphore; revert if failed
        // always get the latest merkle tree root as the default group can only be controlled by this contract (rather than off-chain)
        _semaphore.verifyProof(
            uint256(uint160(address(this))),
            ISemaphoreGroups(address(_semaphore)).getMerkleTreeRoot(uint256(uint160(address(this)))),
            0,
            nullifierHash,
            nonce,
            proof);
    }
}
