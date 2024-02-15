// SPDX-License-Identifier: GPL-3.0
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/utils/Create2.sol";
import "@openzeppelin/contracts/proxy/ERC1967/ERC1967Proxy.sol";

import "./PrivacyAccount.sol";

contract PrivacyAccountFactory {
    PrivacyAccount public immutable accountImplementation;

    constructor(IEntryPoint _entryPoint) {
        accountImplementation = new PrivacyAccount(_entryPoint);
    }

    // create a new account and return the contract address
    function createAccount(address owner, uint256 salt) public returns (PrivacyAccount ret) {
        address addr = getAddress(owner, salt);
        uint codeSize = addr.code.length;
        if (codeSize > 0) {
            return PrivacyAccount(payable(addr));
        }
        ret = PrivacyAccount(payable(new ERC1967Proxy{salt : bytes32(salt)}(
                address(accountImplementation),
                abi.encodeCall(PrivacyAccount.initialize, (owner))
            )));
    }

    // calculate the address using Create2
    function getAddress(address owner, uint256 salt) public view returns (address) {
        return Create2.computeAddress(bytes32(salt), keccak256(abi.encodePacked(
                type(ERC1967Proxy).creationCode,
                abi.encode(
                    address(accountImplementation),
                    abi.encodeCall(PrivacyAccount.initialize, (owner))
                )
            )));
    }
}
