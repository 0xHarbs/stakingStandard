//SPDX-License-Identifier: Unlicense
pragma solidity ^0.8.0;

import "hardhat/console.sol";
import {ERC721} from "@rari-capital/solmate/src/tokens/ERC721.sol";

contract TestERC721 is ERC721 {
    uint256 tokenId;

    constructor()
        ERC721("Test 721", "721T")
    {
        _mint(msg.sender, ++tokenId);
        _mint(msg.sender, ++tokenId);
        _mint(msg.sender, ++tokenId);
    }

    // ================= PUBLIC FUNCTIONS ============== //
    function mint(address _addr) external {
        _mint(_addr, ++tokenId);
    }

    function batchMint(uint256 num) external {
        for(uint256 i; i < num ; ++i) {
            _mint(msg.sender, ++tokenId);
        }
    }

    function burn(uint256 _id) external {
        _burn(_id);
    }

    function tokenURI(uint256 id) public view override virtual returns (string memory) {
        string memory baseURI = "https://test.com/";
        return baseURI;
    }

}