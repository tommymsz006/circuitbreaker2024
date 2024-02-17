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

//import "@semaphore-protocol/contracts/interfaces/ISemaphore.sol";
import "./ISemaphore.sol";

import "./TokenCallbackHandler.sol";

contract PrivacyAccount is BaseAccount, TokenCallbackHandler, UUPSUpgradeable, Initializable {
    using ECDSA for bytes32;
    using MessageHashUtils for bytes32;

    uint256 public constant DEFAULT_GROUP_ID = 0x2A3B4C5D6E7F;

    address public owner;
    bytes public encryptedIdMessage;
    uint256 public idCommitment;

    IEntryPoint private immutable _entryPoint;
    ISemaphore private immutable _semaphore;

    event PrivacyAccountInitialized(IEntryPoint indexed entryPoint, address indexed owner, uint256 idCommitment);

    modifier onlyOwner() {
        _onlyOwner();
        _;
    }

    function entryPoint() public view virtual override returns (IEntryPoint) {
        return _entryPoint;
    }

    function semaphore() public view virtual returns (ISemaphore) {
        return _semaphore;
    }

    // solhint-disable-next-line no-empty-blocks
    receive() external payable {}

    constructor(IEntryPoint anEntryPoint, ISemaphore aSemaphore) {
        _entryPoint = anEntryPoint;
        _semaphore = aSemaphore;
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

    function initialize(address anOwner, bytes calldata anEncryptedIdMessage, uint256 anIdCommitment) public virtual initializer {
        _initialize(anOwner, anEncryptedIdMessage, anIdCommitment);
    }

    function _initialize(address anOwner, bytes calldata anEncryptedIdMessage, uint256 anIdCommitment) internal virtual {
        owner = anOwner;
        encryptedIdMessage = anEncryptedIdMessage;
        idCommitment = anIdCommitment;

        // add the given identity commitment to the default group
        //_semaphore.addMember(DEFAULT_GROUP_ID, idCommitment);
        
        emit PrivacyAccountInitialized(_entryPoint, owner, idCommitment);
    }

    function _requireFromEntryPointOrOwner() internal view {
        require(msg.sender == address(entryPoint()) || msg.sender == owner, "account: not Owner or EntryPoint");
    }

    function _validateSignature(UserOperation calldata userOp, bytes32 userOpHash)
    internal override virtual returns (uint256 validationData) {
        // for public transaction, it has to be signed by the owner
        bytes32 hash = userOpHash.toEthSignedMessageHash();
        if (owner != hash.recover(userOp.signature))
            return SIG_VALIDATION_FAILED;
        return 0;
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

