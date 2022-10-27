//SPDX-License-Identifier: Unlicense
pragma solidity ^0.8.0;

import "hardhat/console.sol";
import {ERC20} from "@rari-capital/solmate/src/tokens/ERC20.sol";

contract TestERC20 is ERC20 {
    /// @notice Zero decimals used to create max supply of 1bn
    uint256 public constant MAX_SUPPLY = 1000000000;

    constructor(uint256 _initialSupply, address _wallet)
        ERC20("Test ERC20", "ERC20T", 0)
    {
        _mint(_wallet, _initialSupply);
    }

    // ================= PUBLIC FUNCTIONS ============== //
    function mint(address _addr, uint256 _amount) external {
        require(totalSupply + _amount < MAX_SUPPLY, "Max supply exceeded");
        _mint(_addr, _amount);
    }

    function burn(uint256 _amount) external {
        _burn(msg.sender, _amount);
    }
}