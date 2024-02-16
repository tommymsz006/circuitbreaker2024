// SPDX-License-Identifier: GPL-3.0
pragma solidity ^0.8.23;

contract Utils {
  function toBytes32(uint256[] memory arr_) public pure returns (bytes32[] memory arr) {
      assembly {
          arr := arr_
      }
  }
}