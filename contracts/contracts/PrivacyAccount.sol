// SPDX-License-Identifier: GPL-3.0
pragma solidity ^0.8.24;

/* solhint-disable avoid-low-level-calls */
/* solhint-disable no-inline-assembly */
/* solhint-disable reason-string */

import "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";
import "@openzeppelin/contracts/utils/cryptography/MessageHashUtils.sol";
import "@openzeppelin/contracts/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts/proxy/utils/UUPSUpgradeable.sol";

import "@account-abstraction/contracts/core/BaseAccount.sol";

import "./IPrivacyAccountFactory.sol";
import "./TokenCallbackHandler.sol";

contract PrivacyAccount is BaseAccount, TokenCallbackHandler, UUPSUpgradeable, Initializable {
    using ECDSA for bytes32;
    using MessageHashUtils for bytes32;

    address public owner;
    bytes public encryptedIdMessage;

    IEntryPoint private immutable _entryPoint;
    IPrivacyAccountFactory private immutable _factory;

    event PrivacyAccountInitialized(IEntryPoint indexed entryPoint, IPrivacyAccountFactory indexed factory, address indexed owner);

    modifier onlyOwner() {
        _onlyOwner();
        _;
    }

    function entryPoint() public view virtual override returns (IEntryPoint) {
        return _entryPoint;
    }

    function factory() public view returns (IPrivacyAccountFactory) {
        return _factory;
    }

    // solhint-disable-next-line no-empty-blocks
    receive() external payable {}

    constructor(IEntryPoint anEntryPoint, IPrivacyAccountFactory aFactory) {
        _entryPoint = anEntryPoint;
        _factory = aFactory;
        _disableInitializers();
    }

    function _onlyOwner() internal view {
        require(msg.sender == owner || msg.sender == address(this), "only owner");
    }

    function execute(address dest, uint256 value, bytes calldata func) external {
        _requireFromEntryPointOrOwner();
        _call(dest, value, func);
    }

    function executeBatch(address[] calldata dest, bytes[] calldata func) external {
        _requireFromEntryPointOrOwner();
        require(dest.length == func.length, "wrong array lengths");
        for (uint256 i = 0; i < dest.length; i++) {
            _call(dest[i], 0, func[i]);
        }
    }

    function initialize(address anOwner, bytes calldata anEncryptedIdMessage) public virtual initializer {
        _initialize(anOwner, anEncryptedIdMessage);
    }

    function _initialize(address anOwner, bytes calldata anEncryptedIdMessage) internal virtual {
        owner = anOwner;
        encryptedIdMessage = anEncryptedIdMessage;

        emit PrivacyAccountInitialized(_entryPoint, _factory, owner);
    }

    function _requireFromEntryPointOrOwner() internal view {
        require(msg.sender == address(entryPoint()) || msg.sender == owner, "account: not Owner or EntryPoint");
    }

    function _validateSignature(UserOperation calldata userOp, bytes32 userOpHash)
    internal override virtual returns (uint256 validationData) {
        _factory.verifySignature(userOp.signature, getNonce()); // revert if failed
        return 0;

        // for public transaction, it has to be signed by the owner
        /*
        bytes32 hash = userOpHash.toEthSignedMessageHash();
        if (owner != hash.recover(userOp.signature))
            return SIG_VALIDATION_FAILED;
        return 0;
        */
    }

    function _call(address target, uint256 value, bytes memory data) internal {
        (bool success, bytes memory result) = target.call{value : value}(data);
        if (!success) {
            assembly {
                revert(add(result, 32), mload(result))
            }
        }
    }

    function getDeposit() public view returns (uint256) {
        return entryPoint().balanceOf(address(this));
    }

    function addDeposit() public payable {
        entryPoint().depositTo{value : msg.value}(address(this));
    }

    function withdrawDepositTo(address payable withdrawAddress, uint256 amount) public onlyOwner {
        entryPoint().withdrawTo(withdrawAddress, amount);
    }

    function _authorizeUpgrade(address newImplementation) internal view override {
        (newImplementation);
        _onlyOwner();
    }
}

