// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.9;

import {ERC20} from "@rari-capital/solmate/src/tokens/ERC20.sol";
import {ERC721} from "@rari-capital/solmate/src/tokens/ERC721.sol";
import {SafeTransferLib} from "@rari-capital/solmate/src/utils/SafeTransferLib.sol";
import {FixedPointMathLib} from "@rari-capital/solmate/src/utils/FixedPointMathLib.sol";
import {ReentrancyGuard} from "@rari-capital/solmate/src/utils/ReentrancyGuard.sol";
import {Owned} from "@rari-capital/solmate/src/auth/Owned.sol";
import {ERC721TokenReceiver} from "@rari-capital/solmate/src/tokens/ERC721.sol";

/// @notice Minimal interface for an tokenized NFT staking vault.
/// @author 0xHarbs (https://github.com/0xHarbs/)

/// TODO: Need to figure out when to update rewards on withdrawals
/// IF can claim rewards when no OG is staked then equals an issue

// Situation: Unstake last OG --> can claim rewards
// Situation: Unstake last OG --> can't deposit more as no OG staked to update rewards
/// @notice Deposit requires an OG is staked, shares for NFT are minted, and owner storage updated
/// NOTE: Make sure receiver and msg.sender are correct when sending tx's - for updates etc.

contract TroopzStaking is Owned, ERC721TokenReceiver, ReentrancyGuard {
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
    event BatchDeposit(address indexed caller, address indexed _receiver, address[] _tokenAddress, uint256[] _tokenId, uint256 shares);
    event BatchWithdraw(address indexed caller, address indexed _receiver, address indexed _owner, address[] _tokenAddress, uint256[] _tokenId, uint256 shares);
    event claimedRewards(address indexed caller, uint256 indexed claimed);

        /*//////////////////////////////////////////////////////////////
                             STORAGE
    //////////////////////////////////////////////////////////////*/

    struct Update {
        address tokenAddress;
        uint64 updateVersion;
        uint128 updateTime;
        uint128 previousReward;
    }

    address public requiredAddress;
    ERC20 public asset;
    // uint256 public totalSupply;
    uint256 public lastUpdate;
    uint64 public updateVersion;

    mapping(uint64 => Update) public updates;
    mapping(address => bool) public whitelisted;
    mapping(address => uint256) public tokenReward;
    mapping(address => uint256) public balanceOf;
    mapping(address => uint64) public ownerVersion;
    mapping(address => uint256) public ownerLastUpdate;
    mapping(address => uint256) public ownerRewards;
    mapping(address => mapping(address => uint256)) public holderToTokenCount;
    mapping(address => mapping(address => mapping(uint256 => bool))) public holderToToken;

        /*//////////////////////////////////////////////////////////////
                               CONSTRUCTOR
    //////////////////////////////////////////////////////////////*/

    constructor(ERC20 _asset, address _requiredAddress) Owned(msg.sender) {
        asset = _asset;
        requiredAddress = _requiredAddress;
    }

        /*//////////////////////////////////////////////////////////////
                        DEPOSIT/WITHDRAWAL/ CLAIM LOGIC
    //////////////////////////////////////////////////////////////*/

    function deposit(address _receiver, address _tokenAddress, uint256 _tokenId) nonReentrant external returns (uint256 shares) {
        // Check an OG is staked or depositing an OG then check NFT has rewards
        require(holderToTokenCount[_receiver][requiredAddress] > 0 || _tokenAddress == requiredAddress, "NEED_OG_STAKED");
        require((shares = previewDeposit(_tokenAddress)) != 0, "NO_REWARDS");
        
        if(holderToTokenCount[_receiver][requiredAddress] == 0 ) {
            ownerLastUpdate[_receiver] = block.timestamp; // Set time to block.timestamp for new stakers
            ownerVersion[_receiver] = updateVersion;
        } else {
            _updateRewards(_receiver);
        }

        // Update storage for deposited token
        holderToToken[_receiver][_tokenAddress][_tokenId] = true;
        holderToTokenCount[_receiver][_tokenAddress] += 1;
        balanceOf[_receiver] += shares;
        // totalSupply += shares; // NOTE: may be able to remove this as could query balance of contract

        // Transfer the NFT to the contract
        ERC721(_tokenAddress).safeTransferFrom(msg.sender, address(this), _tokenId);
        emit Deposit(msg.sender, _receiver, _tokenAddress, _tokenId, shares);
    }

    /// @notice Batch deposit would transfer a batch of NFTs but only update the rewards once
    function batchDeposit(address _receiver, address[] calldata _tokenAddress, uint256[] calldata _tokenId) nonReentrant external returns (uint256 shares) {
        require(holderToTokenCount[_receiver][requiredAddress] > 0 || _tokenAddress[0] == requiredAddress, "NEED_OG_STAKED");
        require(_tokenAddress.length == _tokenId.length, "LENGTH_MISMATCH");

        if(holderToTokenCount[_receiver][requiredAddress] == 0 ) {
            ownerLastUpdate[_receiver] = block.timestamp; // Set time to block.timestamp for new stakers
            ownerVersion[_receiver] = updateVersion;
        } else {
            _updateRewards(_receiver);
        }

        uint256 shareTotal;

        // Update storage for deposited token
        for(uint i; i < _tokenAddress.length; i++){
            require((shares = previewDeposit(_tokenAddress[i])) != 0, "NO_REWARDS"); 
            holderToToken[_receiver][_tokenAddress[i]][_tokenId[i]] = true;
            holderToTokenCount[_receiver][_tokenAddress[i]] += 1;
            shareTotal += shares;

            // Transfer the NFT to the contract
            ERC721(_tokenAddress[i]).safeTransferFrom(msg.sender, address(this), _tokenId[i]);
        }

        // Update storage after the loop to reduce gas usage 
        balanceOf[_receiver] += shareTotal;
        // totalSupply += shareTotal;
        emit BatchDeposit(msg.sender, _receiver, _tokenAddress, _tokenId, shares);
    }

    /// @notice Owner storage is cleared for the NFT and shares are burned
    /// @dev An OG is required to be staked at all times. If last OG unstaked and other NFTS staked, gas will be paid and tx will revert.
    function withdraw(address _owner, address _receiver, address _tokenAddress, uint256 _tokenId) nonReentrant external returns (uint256 shares) {
        require(holderToTokenCount[msg.sender][requiredAddress] > 0, "NOTHING_STAKED");
        require(holderToToken[msg.sender][_tokenAddress][_tokenId], "NOT_OWNER");
        
        _updateRewards(_owner); 

        // Update storage for withdrawn token
        shares = tokenReward[_tokenAddress];
        holderToToken[_owner][_tokenAddress][_tokenId] = false;
        holderToTokenCount[_owner][_tokenAddress] -= 1;

        // Checking at least one OG staked after changes
        balanceOf[_owner] -= shares;
        if(balanceOf[_owner] > 0) { 
            require(holderToTokenCount[_owner][requiredAddress] > 0, "MUST_HAVE_OG_STAKED");
        }

        // totalSupply -= shares;

        // Transfer the NFT to the receiver
        ERC721(_tokenAddress).safeTransferFrom(address(this), _receiver, _tokenId);
        emit Withdraw(msg.sender, _receiver, _owner, _tokenAddress, _tokenId, shares);
    }

    /// @notice Batch withdraw NFTS to the owner and update storage
    /// @dev An OG is required to be staked at all times. If all OGs unstaked and other NFTS, gas will be paid and tx will revert.
    function batchWithdraw(address _owner, address _receiver, address[] calldata _tokenAddress, uint256[] calldata _tokenId) nonReentrant external returns (uint256 shares) {
        require(holderToTokenCount[msg.sender][requiredAddress] > 0, "NOTHING_STAKED");
        require(_tokenAddress.length == _tokenId.length, "LENGTH_MISMATCH");

        // Update rewards for the owner
        _updateRewards(_owner);

        // Update storage for withdrawn token
        for(uint i; i < _tokenAddress.length; i++){
            require(holderToToken[msg.sender][_tokenAddress[i]][_tokenId[i]], "NOT_OWNER");
            shares += tokenReward[_tokenAddress[i]];
            holderToToken[_owner][_tokenAddress[i]][_tokenId[i]] = false;
            holderToTokenCount[_owner][_tokenAddress[i]] -= 1;
            ERC721(_tokenAddress[i]).safeTransferFrom(address(this), _receiver, _tokenId[i]);
        }

        // Update storage after the loop to reduce gas usage
        balanceOf[_owner] -= shares;
        if(balanceOf[_owner] > 0) { 
            require(holderToTokenCount[_owner][requiredAddress] > 0, "NEED_OG_STAKED");
        }

        // totalSupply -= shares;
        emit BatchWithdraw(msg.sender, _receiver, _owner, _tokenAddress, _tokenId, shares);
    }

    function updateRewards() external {
        _updateRewards(msg.sender);
    }

    function claimRewards() nonReentrant external {
        _claimRewards();
    }

    function updateRewardsAndClaim() nonReentrant external {
        _updateRewards(msg.sender);
        _claimRewards();
    }

    /// @notice NFT can be deposited if whitelisted and deposit function is called
    function onERC721Received(
        address _operator,
        address _from,
        uint256 _tokenId,
        bytes calldata
    ) external virtual override returns (bytes4) {
        require(whitelisted[msg.sender], "NOT_WHITELISTED");
        return ERC721TokenReceiver.onERC721Received.selector;
    }

        /*//////////////////////////////////////////////////////////////
                            INTERNAL LOGIC
    //////////////////////////////////////////////////////////////*/

    /// @notice Updates the rewards for the user
    function _updateRewards(address _owner) internal returns (uint256 reward, uint256 updateTime, uint256 balance) {
        (reward, updateTime, balance) = ownerVersion[_owner] == updateVersion ? claimWithoutUpdates(_owner) : claimWithUpdates(_owner);
        
        // Update the timestamps and rewards
        if(reward != 0) {
            ownerLastUpdate[_owner] = block.timestamp - updateTime; // Minuses carried time to backtrack the last update
            ownerRewards[_owner] += reward;
        }

        // Update the version for the owner
        if(ownerVersion[_owner] != updateVersion) {
            ownerVersion[_owner] = updateVersion;
            balanceOf[_owner] = balance;
        }
    }

    /// @notice If OG staked all rewards are claimed and transferred to owner
    function _claimRewards() internal returns (uint256 claimed) {
        claimed = ownerRewards[msg.sender];
        ownerRewards[msg.sender] = 0;
        asset.safeTransfer(msg.sender, claimed);
        emit claimedRewards(msg.sender, claimed);
    }

        /*//////////////////////////////////////////////////////////////
                            ACCOUNTING LOGIC
    //////////////////////////////////////////////////////////////*/

    /// @notice Returns the daily reward for an NFT
    function previewDeposit(address _tokenAddress) public view virtual returns (uint256) {
        return tokenReward[_tokenAddress];
    }

    function previewRewards(address _owner) public view virtual returns (uint256 reward, uint256 updateTime, uint256 balance) {
        if(balanceOf[_owner] != 0) {
            return ownerVersion[_owner] == updateVersion ? claimWithoutUpdates(_owner) : claimWithUpdates(_owner);
        }
    }

    function claimWithoutUpdates(address _owner) internal view virtual returns (uint256 reward, uint256 updateTime, uint256 balance) {
        uint256 timeSinceLastUpdate = block.timestamp - ownerLastUpdate[_owner]; // Time passed since last update in seconds
        reward = (timeSinceLastUpdate / 86400) * balanceOf[_owner]; // Calculates reward for time passed rounded down to whole days
        updateTime = timeSinceLastUpdate % 86400; // Calculates the time to carry
    }

    function claimWithUpdates(address _owner) internal view returns (uint256 reward, uint256 ownerUpdate, uint256 balance) {
        // Using versions for determine loops
        ownerUpdate = ownerLastUpdate[owner];
        uint64 startingVersion = ownerVersion[_owner]; 
        uint256 loops = updateVersion - startingVersion;
        balance = balanceOf[_owner];

        for(uint256 i; i < loops; ++i) {
            Update memory update = updates[++startingVersion];

            if(holderToTokenCount[_owner][update.tokenAddress] > 0) {
                // Finding # of updated tokens held by owner
                uint256 tokenCount = holderToTokenCount[_owner][update.tokenAddress];

                // Getting the previous reward rate 
                uint256 rewardRate = tokenCount * update.previousReward; 

                // Getting the time passed and multiplying by old reward rate for tokens
                reward += rewardRate * ((update.updateTime - ownerUpdate)/ 86400);

                // Getting time difference and multiplying reward rate by rest of tokens
                reward +=  (balance - rewardRate) * ((update.updateTime - ownerUpdate)/ 86400);

                // The new reward rate for balance adjustment
                uint256 newRewardRate = tokenCount * tokenReward[update.tokenAddress]; 

                // Adjusting balance for new reward rate
                balance = balance - rewardRate + newRewardRate;

                // Setting the update time to time last update
                ownerUpdate = update.updateTime;
            }
        }
        reward += balance * ((block.timestamp - ownerUpdate) / 86400); // Gets leftover time and calculates reward
        ownerUpdate = (block.timestamp - ownerUpdate) % 86400; // Calculates carried time from last update;
    }

            /*//////////////////////////////////////////////////////////////
                               ADMIN LOGIC
    //////////////////////////////////////////////////////////////*/

    /// @notice Whitelists an NFT address so it can be staked
    function setWhitelisted(address _tokenAddress, bool _whitelisted) external onlyOwner {
        whitelisted[_tokenAddress] = _whitelisted;
    }

    /// @notice Sets the daily token reward for an NFT
    function setTokenReward(address _tokenAddress, uint128 _tokenReward) external onlyOwner {
        if(tokenReward[_tokenAddress] != 0) {
            updateVersion++;
            updates[updateVersion] = Update(_tokenAddress, updateVersion, uint128(block.timestamp), uint128(tokenReward[_tokenAddress]));
        }
        tokenReward[_tokenAddress] = _tokenReward;
    }

    /// @notice Sets the token addres for the reward token
    function setTokenAddress(address _tokenAddress) external onlyOwner {
        asset = ERC20(_tokenAddress);
    }
}
