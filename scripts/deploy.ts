import { ethers } from "hardhat";

// Testnet addresses
const deployer = "0xC59b3779A592B620028c77Ab1742c9960e038e4C";
const ERC20Address = "0xaa2c1b957026F873Fb2f20Dc0F9970f931c62eF1"
const ERC721Address = "0xBB1B84Dee8B2e3bd52FA0F4B9d41c2Ba8460730F"
const StakeAddress = "0xa94574749263D7B965F752885300D14F274222A6"

async function main() {
  // const totalSupply = "1000000";
  // const ERC20Token = await ethers.getContractFactory("TestERC20");
  // const erc20token = await ERC20Token.deploy(totalSupply, deployer);
  // console.log(`Deployed ERC20 to ${erc20token.address}`);

  // const ERC721Token = await ethers.getContractFactory("TestERC721");
  // const erc721token = await ERC721Token.deploy();
  // console.log(`Deployed ERC721 to ${erc721token.address}`);

  // const TroopzStaking = await ethers.getContractFactory("TroopzStaking");
  // const troopzStaking = await TroopzStaking.deploy(
  //   ERC20Address,
  //   ERC721Address
  // );
  // await troopzStaking.deployed();
  // console.log(`Deployed to ${troopzStaking.address}`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
