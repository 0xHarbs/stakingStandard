// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.9;

// Uncomment this line to use console.log
// import "hardhat/console.sol";
import {ERC20} from "@rari-capital/solmate/src/tokens/ERC20.sol";
import {SafeTransferLib} from "@rari-capital/solmate/src/utils/SafeTransferLib.sol";
import {FixedPointMathLib} from "@rari-capital/solmate/src/utils/FixedPointMathLib.sol";
import {Owned} from "@rari-capital/solmate/src/auth/Owned.sol";
import {ERC721TokenReceiver} from "@rari-capital/solmate/src/tokens/ERC721.sol";

/// @notice Minimal interface for an tokenized NFT staking vault.
/// @author 0xHarbs (https://github.com/0xHarbs/)
abstract contract MultiStakingStandard is Owned, ERC721TokenReceiver {
    using SafeTransferLib for ERC20;
    using FixedPointMathLib for uint256;

    /*//////////////////////////////////////////////////////////////
                                 EVENTS
    //////////////////////////////////////////////////////////////*/

    event Deposit(address indexed caller, address indexed owner, address tokenAddress, uint256 tokenId, uint256 shares);

    event Withdraw(
        address indexed caller,
        address indexed receiver,
        address indexed owner,
        address tokenAddress,
        uint256 tokenId,
        uint256 shares
    );

        /*//////////////////////////////////////////////////////////////
                             STORAGE
    //////////////////////////////////////////////////////////////*/

    struct Update {
        address tokenAddress;
        uint64 updateCount;
        uint128 updateTime;
        uint128 previousReward;
    }

    ERC20 public immutable asset;
    uint256 totalSupply;
    uint256 lastUpdate;
    uint64 updateCount;

    mapping(uint64 => Update) public updates;
    mapping(address => bool) public whitelisted;
    mapping(address => uint256) public tokenReward;
    mapping(address => uint256) public balanceOf;
    mapping(address => uint256) public ownerLastUpdate;
    mapping(address => mapping(address => uint256)) public holderToTokenCount;
    mapping(address => mapping(address => mapping(uint256 => bool))) public holderToToken;

        /*//////////////////////////////////////////////////////////////
                               CONSTRUCTOR
    //////////////////////////////////////////////////////////////*/

    constructor(ERC20 _asset){
        asset = _asset;
    }

        /*//////////////////////////////////////////////////////////////
                        DEPOSIT/WITHDRAWAL/ CLAIM LOGIC
    //////////////////////////////////////////////////////////////*/

    function deposit(address _receiver, address _tokenAddress, uint256 _tokenId) internal returns (uint256 shares) {
        require((shares = previewDeposit(_tokenAddress)) != 0, "ZERO_SHARES");
        holderToToken[_receiver][_tokenAddress][_tokenId] = true;
        holderToTokenCount[_receiver][_tokenAddress] += 1;
        balanceOf[_receiver] += shares;
        totalSupply+= shares;
        emit Deposit(msg.sender, _receiver, _tokenAddress, _tokenId, shares);
        afterDeposit(_tokenAddress, _tokenId, shares);
    }

    function withdraw(address _owner, address _receiver, address _tokenAddress, uint256 _tokenId) external returns (uint256 shares) {
        require(holderToToken[msg.sender][_tokenAddress][_tokenId], "NOT_OWNER");
        claim(_receiver);
        shares = tokenReward[_tokenAddress];
        balanceOf[_receiver] -= shares;
        holderToTokenCount[_receiver][_tokenAddress] -= 1;
        holderToToken[_receiver][_tokenAddress][_tokenId] = false;
        totalSupply-= shares;
        emit Withdraw(msg.sender, _receiver, _owner, _tokenAddress, _tokenId, shares);
    }

    // @NOTE: Need logic to check if update has been made
    function claim(address _receiver) public returns (uint256 reward) {
        reward = ownerLastUpdate[msg.sender] < lastUpdate ? _update(msg.sender) : previewClaim(msg.sender);
        beforeClaim(reward);
        ownerLastUpdate[msg.sender] = block.timestamp;
        asset.safeTransfer(_receiver, reward);
    }

    function _update(address _owner) internal view returns (uint256 reward) {
        uint256 ownerUpdate = ownerLastUpdate[owner];
        uint256 loops = lastUpdate - ownerUpdate;
        uint256 balance = balanceOf[_owner];
        for(uint256 i; i < loops; ++i) {
            Update memory update = updates[uint64(ownerUpdate++)];
            if(holderToTokenCount[_owner][update.tokenAddress] > 0) {
                // Get count of holding
                uint256 tokenCount = holderToTokenCount[_owner][update.tokenAddress];

                // Get time difference
                // Get the tokencount multiplied by issue rate = rewardRate
                // Multiply the time by the old reward rate
                reward += (update.updateTime - ownerUpdate) * (tokenCount * update.previousReward);

                // Multiple the time diff by the balance of the user minus token count
                // Token count deducts should reduce the reward for the tokens that have been calculated already
                reward += (update.updateTime - ownerUpdate) * balance - tokenCount;
                ownerUpdate = update.updateTime;
            }
        }
    }

    function onERC721Received(
        address _operator,
        address _from,
        uint256 _tokenId,
        bytes calldata
    ) external virtual override returns (bytes4) {
        require(whitelisted[msg.sender], "NOT_WHITELISTED");
        deposit(_from, msg.sender, _tokenId);
        return ERC721TokenReceiver.onERC721Received.selector;
    }

        /*//////////////////////////////////////////////////////////////
                            ACCOUNTING LOGIC
    //////////////////////////////////////////////////////////////*/

    function previewDeposit(address _tokenAddress) public view virtual returns (uint256) {
        return tokenReward[_tokenAddress];
    }

    function previewClaim(address _owner) public view virtual returns (uint256 reward) {
        reward = asset.balanceOf(_owner) * (block.timestamp - ownerLastUpdate[_owner]);
    }

            /*//////////////////////////////////////////////////////////////
                               ADMIN LOGIC
    //////////////////////////////////////////////////////////////*/

    function setWhitelisted(address _tokenAddress, bool _whitelisted) external onlyOwner {
        whitelisted[_tokenAddress] = _whitelisted;
    }

    function setTokenReward(address _tokenAddress, uint128 _tokenReward) external onlyOwner {
        tokenReward[_tokenAddress] = _tokenReward;
        updateCount++;
        updates[updateCount] = Update(_tokenAddress, updateCount, uint128(block.timestamp), _tokenReward);
    }

    /*//////////////////////////////////////////////////////////////
                          INTERNAL HOOKS LOGIC
    //////////////////////////////////////////////////////////////*/

    function beforeWithdraw(address tokenAddress, uint256 assets, uint256 shares) internal virtual {}

    function beforeClaim(uint256 rewards) internal virtual {}

    function afterDeposit(address tokenAddress, uint256 assets, uint256 shares) internal virtual {}
}
