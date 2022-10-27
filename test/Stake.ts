import { time, loadFixture } from "@nomicfoundation/hardhat-network-helpers";
import { anyValue } from "@nomicfoundation/hardhat-chai-matchers/withArgs";
import { expect } from "chai";
import { ethers } from "hardhat";
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import { TestERC20, TestERC721, TroopzStaking } from "../typechain-types";
import { BigNumber } from "ethers";


describe("Staking", function () {
  async function deployContracts() {
    const [owner, otherAccount] = await ethers.getSigners();
    const totalSupply = "1000000"

    const ERC20Token = await ethers.getContractFactory("TestERC20");
    const erc20token = await ERC20Token.deploy(totalSupply, owner.address);

    const ERC721Token = await ethers.getContractFactory("TestERC721");
    const erc721token = await ERC721Token.deploy();

    const ERC721TokenTwo = await ethers.getContractFactory("TestERC721");
    const erc721tokenTwo = await ERC721TokenTwo.deploy();

    const ERC721TokenThree = await ethers.getContractFactory("TestERC721");
    const erc721tokenThree = await ERC721TokenThree.deploy();

    const ERC721TokenFour = await ethers.getContractFactory("TestERC721");
    const erc721tokenFour = await ERC721TokenFour.deploy();

    const ERC721TokenFive = await ethers.getContractFactory("TestERC721");
    const erc721tokenFive = await ERC721TokenFive.deploy();

    const StakingContract = await ethers.getContractFactory("TroopzStaking");
    const stakingContract = await StakingContract.deploy(erc20token.address, erc721token.address);

    return { owner, otherAccount, stakingContract, erc20token, erc721token, erc721tokenTwo, erc721tokenThree, erc721tokenFour, erc721tokenFive, totalSupply };
  }

  async function deployContractsWithRewards() {
    const [owner, otherAccount] = await ethers.getSigners();
    const totalSupply = "1000000"

    const ERC20Token = await ethers.getContractFactory("TestERC20");
    const erc20token = await ERC20Token.deploy(totalSupply, owner.address);

    const ERC721Token = await ethers.getContractFactory("TestERC721");
    const erc721token = await ERC721Token.deploy();

    const ERC721TokenTwo = await ethers.getContractFactory("TestERC721");
    const erc721tokenTwo = await ERC721TokenTwo.deploy();

    const StakingContract = await ethers.getContractFactory("TroopzStaking");
    const stakingContract = await StakingContract.deploy(erc20token.address, erc721token.address);

    await stakingContract.setWhitelisted(erc721token.address, true);
    await stakingContract.setWhitelisted(erc721token.address, true);
    await stakingContract.setTokenReward(erc721token.address, 10);
    await stakingContract.setTokenReward(erc721tokenTwo.address, 10);

    return { owner, otherAccount, stakingContract, erc20token, erc721token, erc721tokenTwo, totalSupply };
  }

  async function deployContractsAndStakeNFT() {
    const [owner, otherAccount] = await ethers.getSigners();
    const totalSupply = "1000000"

    const ERC20Token = await ethers.getContractFactory("TestERC20");
    const erc20token = await ERC20Token.deploy(totalSupply, owner.address);

    const ERC721Token = await ethers.getContractFactory("TestERC721");
    const erc721token = await ERC721Token.deploy();

    const ERC721TokenTwo = await ethers.getContractFactory("TestERC721");
    const erc721tokenTwo = await ERC721TokenTwo.deploy();

    const StakingContract = await ethers.getContractFactory("TroopzStaking");
    const stakingContract = await StakingContract.deploy(erc20token.address, erc721token.address);

    await stakingContract.deposit(owner.address, erc721token.address, 1); // Staking OG NFT
    await stakingContract.deposit(owner.address, erc721token.address, 2); // Staking OG NFT
    await stakingContract.deposit(owner.address, erc721tokenTwo.address, 1); // Staking a secondary NFT
    await stakingContract.deposit(owner.address, erc721tokenTwo.address, 2); // Staking a secondary NFT


    return { owner, otherAccount, stakingContract, erc20token, erc721token, erc721tokenTwo, totalSupply };
  }

  async function passTime(timeIncrease: any) {
    const currentTime = await time.latest();
    await time.increaseTo(currentTime + timeIncrease);
    const newTime = await time.latest();
    expect(newTime).to.equal(currentTime + timeIncrease);
  }

  let owner: SignerWithAddress, otherAccount: SignerWithAddress, stakingContract: TroopzStaking, erc20token: TestERC20, erc721token: TestERC721, erc721tokenTwo: TestERC721, erc721tokenThree: TestERC721, erc721tokenFour: TestERC721, erc721tokenFive: TestERC721, totalSupply: string;
  describe("Deployment", function () {
    before( async function () {
      ({ owner, otherAccount, stakingContract, erc20token, erc721token, erc721tokenTwo, erc721tokenThree, erc721tokenFour, erc721tokenFive, totalSupply } = await loadFixture(deployContracts));
    });

    it("Should set the right asset for Staking", async function () {
      expect(await stakingContract.asset()).to.equal(erc20token.address);
    });

    it("Should set the right OG contract for Staking", async function () {
      expect(await stakingContract.requiredAddress()).to.equal(erc721token.address);
    });

    it("Should set the right supply for ERC20T", async function () {
      expect(await erc20token.totalSupply()).to.equal(totalSupply);
    });

    it("Should set the right supply for ERC721T", async function () {
      expect(await erc721token.symbol()).to.equal("721T");
    });
  });

  describe("Deposits and Withdrawals", function () {
    describe("Setting up Staking", function () {
      it("Should whitelist OG", async function () {
        await stakingContract.setWhitelisted(erc721token.address, true);
        expect(await stakingContract.whitelisted(erc721token.address)).to.equal(true);
      });

      it("Should set OG rewards", async function () {
        await stakingContract.setTokenReward(erc721token.address, 10);
        expect(await stakingContract.tokenReward(erc721token.address)).to.equal(10);
      });

      it("Should set Two rewards", async function () {
        await stakingContract.setTokenReward(erc721tokenTwo.address, 5);
        expect(await stakingContract.tokenReward(erc721tokenTwo.address)).to.equal(5);
      });

      it("Should whitelist NFT Two", async function () {
        await stakingContract.setWhitelisted(erc721tokenTwo.address, true);
        expect(await stakingContract.whitelisted(erc721tokenTwo.address)).to.equal(true);
      });

      it("Should preview OG deposit rewards", async function () {
        const previewDeposit = await stakingContract.previewDeposit(erc721token.address);
        expect(previewDeposit).to.equal(await stakingContract.tokenReward(erc721token.address));
      });

      it("Should preview Secondary deposit rewards", async function () {
        const previewDeposit = await stakingContract.previewDeposit(erc721tokenTwo.address);
        expect(previewDeposit).to.equal(await stakingContract.tokenReward(erc721tokenTwo.address));
      });
    });

    describe("Single Deposits", function () {
      it("Should revert depositing a secondary NFT", async function () {
        await expect(stakingContract.deposit(owner.address, erc721tokenTwo.address, 2)).to.be.revertedWith("NEED_OG_STAKED")
      });

      it("Should deposit an OG NFT", async function () {
        await erc721token.approve(stakingContract.address, 1);
        await stakingContract.deposit(owner.address, erc721token.address, 1);
        expect(await stakingContract.balanceOf(owner.address)).to.equal(10);
      });

      it("Should revert depositing an NFT with no rewards", async function () {
        await expect(stakingContract.deposit(owner.address, erc721tokenFive.address, 2)).to.be.revertedWith("NO_REWARDS")
      });

      it("Should set Five rewards", async function () {
        await stakingContract.setTokenReward(erc721tokenFive.address, 5);
        expect(await stakingContract.tokenReward(erc721tokenFive.address)).to.equal(5);
      });

      it("Should revert depositing an NFT not whitelisted", async function () {
        await erc721tokenFive.approve(stakingContract.address, 2);
        await expect(stakingContract.deposit(owner.address, erc721tokenFive.address, 2)).to.be.revertedWith("NOT_WHITELISTED")
      });

      it("Should deposit a secondary NFT", async function () {
        await erc721tokenTwo.approve(stakingContract.address, 1);
        await stakingContract.deposit(owner.address, erc721tokenTwo.address, 1);
        expect(await stakingContract.balanceOf(owner.address)).to.equal(15);
      });

      it("Should deposit 2nd secondary NFT", async function () {
        await erc721tokenTwo.approve(stakingContract.address, 2);
        await stakingContract.deposit(owner.address, erc721tokenTwo.address, 2);
        expect(await stakingContract.balanceOf(owner.address)).to.equal(20);
      });

      it("Should deposit 2nd OG NFT", async function () {
        await erc721token.approve(stakingContract.address, 3);
        await stakingContract.deposit(owner.address, erc721token.address, 3);
        expect(await stakingContract.balanceOf(owner.address)).to.equal(30);
      });

      it("Should revert depositing a secondary to other account", async function () {
        await expect(stakingContract.deposit(otherAccount.address, erc721tokenTwo.address, 2)).to.be.revertedWith("NEED_OG_STAKED")
      });

      it("Should deposit an OG NFT to other account", async function () {
        await erc721token.approve(stakingContract.address, 2);
        await stakingContract.deposit(otherAccount.address, erc721token.address, 2);
        expect(await stakingContract.balanceOf(otherAccount.address)).to.equal(10);
      });

      it("Should deposit a secondary NFT to other account", async function () {
        await erc721tokenTwo.approve(stakingContract.address, 3);
        await stakingContract.deposit(otherAccount.address, erc721tokenTwo.address, 3);
        expect(await stakingContract.balanceOf(otherAccount.address)).to.equal(15);
      });
    });


    describe("Single Withdrawals", function () {
      it("Should revert withdrawing due to not owner  ", async function () {
        await expect(stakingContract.withdraw(owner.address, owner.address, erc721token.address, 4)).to.be.revertedWith("NOT_OWNER")
      });

      it("Should withdraw only OG NFT", async function () {
        expect(await erc721token.balanceOf(owner.address)).to.equal(0);
        await stakingContract.withdraw(owner.address, owner.address, erc721token.address, 3);
        expect(await erc721token.balanceOf(owner.address)).to.equal(1);
      });

      it("Should withdraw a secondary NFT", async function () {
        expect(await erc721tokenTwo.balanceOf(owner.address)).to.equal(0);
        await stakingContract.withdraw(owner.address, owner.address, erc721tokenTwo.address, 2);
        expect(await erc721tokenTwo.balanceOf(owner.address)).to.equal(1);
      });

      it("Should revert withdrawing only OG ", async function () {
        await expect(stakingContract.withdraw(owner.address, owner.address, erc721token.address, 1)).to.be.revertedWith("MUST_HAVE_OG_STAKED")
      });

      it("Should withdraw a secondary NFT", async function () {
        expect(await erc721tokenTwo.balanceOf(owner.address)).to.equal(1);
        await stakingContract.withdraw(owner.address, owner.address, erc721tokenTwo.address, 1);
        expect(await erc721tokenTwo.balanceOf(owner.address)).to.equal(2);
      });

      it("Should withdraw only OG NFT", async function () {
        expect(await erc721token.balanceOf(owner.address)).to.equal(1);
        await stakingContract.withdraw(owner.address, owner.address, erc721token.address, 1);
        expect(await erc721token.balanceOf(owner.address)).to.equal(2);
      });

      it("Should withdraw to owner from other account", async function () {
        expect(await erc721tokenTwo.balanceOf(owner.address)).to.equal(2);
        await stakingContract.connect(otherAccount).withdraw(otherAccount.address, owner.address, erc721tokenTwo.address, 3);
        expect(await erc721tokenTwo.balanceOf(owner.address)).to.equal(3);
      });

      it("Should revert withdrawing due to nothing staked ", async function () {
        await expect(stakingContract.withdraw(owner.address, owner.address, erc721token.address, 1)).to.be.revertedWith("NOTHING_STAKED")
      });
    });


    describe("Batch Deposits", function () {
      it("Should revert batch depositing due to no OG", async function () {
        const tokenAddresses = [erc721tokenTwo.address, erc721tokenTwo.address];
        const tokenIds = [1, 1];
        await expect(stakingContract.batchDeposit(owner.address, tokenAddresses, tokenIds)).to.be.revertedWith("NEED_OG_STAKED")
      });

      it("Should revert batch depositing due to length", async function () {
        const tokenAddresses = [erc721token.address, erc721tokenTwo.address];
        const tokenIds = [1];
        await expect(stakingContract.batchDeposit(owner.address, tokenAddresses, tokenIds)).to.be.revertedWith("LENGTH_MISMATCH")
      });

      it("Should batch deposit with OG to initialise", async function () {
        expect(await stakingContract.balanceOf(owner.address)).to.equal(0);
        await erc721token.approve(stakingContract.address, 1);
        await erc721tokenTwo.approve(stakingContract.address, 1);
        const tokenAddresses = [erc721token.address, erc721tokenTwo.address];
        const tokenIds = [1, 1];
        await stakingContract.batchDeposit(owner.address, tokenAddresses, tokenIds);
        expect(await stakingContract.balanceOf(owner.address)).to.equal(15);
      });

      it("Should revert batch depositing due to no rewards", async function () {
        const tokenAddresses = [erc721tokenFour.address, erc721token.address];
        const tokenIds = [1, 2];
        await expect(stakingContract.batchDeposit(owner.address, tokenAddresses, tokenIds)).to.be.revertedWith("NO_REWARDS")
      });

      it("Should batch deposit with two different tokens", async function () {
        await erc721token.approve(stakingContract.address, 3);
        await erc721tokenTwo.approve(stakingContract.address, 2);
        const tokenAddresses = [erc721token.address, erc721tokenTwo.address];
        const tokenIds = [3, 2];
        await stakingContract.batchDeposit(owner.address, tokenAddresses, tokenIds);
        expect(await stakingContract.balanceOf(owner.address)).to.equal(30);
      });

      it("Should deposit a secondary NFT to other account", async function () {
        await erc721tokenTwo.approve(stakingContract.address, 3);
        await stakingContract.deposit(owner.address, erc721tokenTwo.address, 3);
        expect(await stakingContract.balanceOf(owner.address)).to.equal(35);
      });
    });

    // Owner staked tokens are
    // OG: 1, 3
    // 2ND: 1, 2, 3
    describe("Batch Withdrawals", function () {
      it("Should revert batch withdrawal due to not owner", async function () {
        const tokenAddresses = [erc20token.address, erc721tokenTwo.address];
        const tokenIds = [4, 4];
        await expect(stakingContract.batchWithdraw(owner.address, owner.address, tokenAddresses, tokenIds)).to.be.revertedWith("NOT_OWNER")
      });

      it("Should revert batch withdrawal due to length", async function () {
        const tokenAddresses = [erc20token.address, erc721tokenTwo.address];
        const tokenIds = [1];
        await expect(stakingContract.batchWithdraw(owner.address, owner.address, tokenAddresses, tokenIds)).to.be.revertedWith("LENGTH_MISMATCH")
      });


      it("Should batch withdraw two different tokens", async function () {
        const tokenAddresses = [erc721token.address, erc721tokenTwo.address];
        const tokenIds = [1, 1];
        await stakingContract.batchWithdraw(owner.address, owner.address, tokenAddresses, tokenIds);
        expect(await stakingContract.balanceOf(owner.address)).to.equal(20);
      });

      // Staked by owner
      // OG: 3
      // 2ND: 2, 3
      it("Should revert batch withdrawing due to no OG", async function () {
        const tokenAddresses = [erc721token.address, erc721tokenTwo.address];
        const tokenIds = [3, 3];
        await expect(stakingContract.batchWithdraw(owner.address, owner.address, tokenAddresses, tokenIds)).to.be.revertedWith("NEED_OG_STAKED")
      });

      it("Should batch withdraw final tokens", async function () {
        const tokenAddresses = [erc721tokenTwo.address, erc721tokenTwo.address, erc721token.address];
        const tokenIds = [2, 3, 3];
        await stakingContract.batchWithdraw(owner.address, owner.address, tokenAddresses, tokenIds);
        expect(await stakingContract.balanceOf(owner.address)).to.equal(0);
      });

      it("Should revert batch depositing due to nothing staked", async function () {
        const tokenAddresses = [erc721tokenTwo.address, erc721tokenTwo.address, erc721token.address];
        const tokenIds = [2, 3, 3];
        await expect(stakingContract.batchWithdraw(owner.address, owner.address, tokenAddresses, tokenIds)).to.be.revertedWith("NOTHING_STAKED")
      });
    });
  });

  describe("Claim Rewards", function () {  
    let startingBalance:BigNumber, ownerBalance: BigNumber, rewards: BigNumber, updateTime: BigNumber, previewBalance: BigNumber; 

    describe("Claim Rewards in multiple steps ", function () {
      it("Should top up contract with full balances", async function () {
        expect(await erc20token.balanceOf(stakingContract.address)).to.equal(0);
        await erc20token.transfer(stakingContract.address, 1000000);
        expect(await erc20token.balanceOf(stakingContract.address)).to.equal(1000000);
      });

      it("Should deposit tokens for owner and pass 25 hours", async function () {
        startingBalance = await erc20token.balanceOf(owner.address);
        expect(await stakingContract.balanceOf(owner.address)).to.equal(0);
        await erc721token.approve(stakingContract.address, 1);
        await erc721tokenTwo.approve(stakingContract.address, 1);
        const tokenAddresses = [erc721token.address, erc721tokenTwo.address];
        const tokenIds = [1, 1];
        await stakingContract.batchDeposit(owner.address, tokenAddresses, tokenIds);
        expect(await stakingContract.balanceOf(owner.address)).to.equal(15);
        [rewards, updateTime, previewBalance] = await stakingContract.previewRewards(owner.address);
        expect(rewards).to.equal(0);
      });
      
      it("Should preview rewards of 1 day", async function () {
        ownerBalance = await stakingContract.balanceOf(owner.address); // Balance is tokens i.e. one days rewards
        await passTime(86400); // 25 hours
        [rewards, updateTime, previewBalance] = await stakingContract.previewRewards(owner.address);
        expect(rewards).to.equal(ownerBalance);
      });

      it("Should preview rewards of 2 days", async function () {
        ownerBalance = await stakingContract.balanceOf(owner.address); // Balance is tokens i.e. one days rewards
        await passTime(86400); // 25 hours
        [rewards, updateTime, previewBalance] = await stakingContract.previewRewards(owner.address);
        expect(rewards).to.equal(ownerBalance.mul(2));
      });

      it("Should preview rewards of 2 days for 2.5 days", async function () {
        ownerBalance = await stakingContract.balanceOf(owner.address); // Balance is tokens i.e. one days rewards
        await passTime(43200); // 25 hours
        [rewards, updateTime, previewBalance] = await stakingContract.previewRewards(owner.address);
        expect(rewards).to.equal(ownerBalance.mul(2));
      });

      it("Should update rewards correctly", async function () {
        await stakingContract.updateRewards();
        const claimableRewards = await stakingContract.ownerRewards(owner.address);
        expect(claimableRewards).to.equal(ownerBalance.mul(2));
      });

      it("Should preview rewards of 0 for 0.5 days", async function () {
        ownerBalance = await stakingContract.balanceOf(owner.address); // Balance is tokens i.e. one days rewards
        [rewards, updateTime, previewBalance] = await stakingContract.previewRewards(owner.address);
        expect(rewards).to.equal(0);
      });

      it("Should withdraw rewards to owner", async function () {
        await stakingContract.claimRewards();
        const claimableRewards = await stakingContract.ownerRewards(owner.address);
        const tokenBalance = await erc20token.balanceOf(owner.address);
        expect(claimableRewards).to.equal(0);
        const expectedRewards = ownerBalance.mul(2);
        expect(tokenBalance).to.equal(expectedRewards.add(startingBalance));
        [rewards, updateTime, previewBalance] = await stakingContract.previewRewards(owner.address);
      });
    });

    describe("Claim Rewards in one step", function () {
      it("Should preview rewards correccly", async function () {
        startingBalance = await erc20token.balanceOf(owner.address);
        await passTime(43200); // 12 hours to tally time to 1 day
        ownerBalance = await stakingContract.balanceOf(owner.address); // Balance is tokens i.e. one days rewards
        [rewards, updateTime, previewBalance] = await stakingContract.previewRewards(owner.address);
        expect(rewards).to.equal(ownerBalance);
      });

      it("Should update and claim rewards correctly", async function () {
        await passTime(216000); // 48 hours added
        const expectedRewards = ownerBalance.mul(3); // 30 
        [rewards, updateTime, previewBalance] = await stakingContract.previewRewards(owner.address);

        await stakingContract.updateRewardsAndClaim();
        const claimableRewards = await stakingContract.ownerRewards(owner.address);
        const tokenBalance = await erc20token.balanceOf(owner.address);
        
        expect(claimableRewards).to.equal(0);
        expect(tokenBalance).to.equal(startingBalance.add(expectedRewards)); // 40 is 2 days worth of rewards at 20 per day
      });

    });

    describe("Claim Rewards after OG reward is updated", function () {
      it("Should update the rewards for token 0", async function () {
        startingBalance = await erc20token.balanceOf(owner.address);
        ownerBalance = await stakingContract.balanceOf(owner.address);
        [rewards, updateTime, previewBalance] = await stakingContract.previewRewards(owner.address)
        await passTime(43200); // 24 hours
        expect(ownerBalance).to.equal(15);
        await stakingContract.setTokenReward(erc721token.address, 5);
        expect(await stakingContract.tokenReward(erc721token.address)).to.equal(5);
      });

      it("Should preview rewards correccly", async function () {
        await passTime(86400); // 24 hours
        [rewards, updateTime, previewBalance] = await stakingContract.previewRewards(owner.address);
        expect(rewards).to.equal(25); // Expect: 25 -> 15 from before plus 5 + 5 from change
      });

      it("Should preview rewards correccly", async function () {
        await passTime(86400); // 24 hours
        [rewards, updateTime] = await stakingContract.previewRewards(owner.address);
        expect(rewards).to.equal(35); // Expect: 25 -> 15 from before plus 5 + 5 from change
      });

      it("Should update rewards correctly", async function () {
        await stakingContract.updateRewards();
        ownerBalance = await stakingContract.balanceOf(owner.address);
        const expectedRewards = await stakingContract.ownerRewards(owner.address);
        [rewards, updateTime, previewBalance] = await stakingContract.previewRewards(owner.address);
        expect(expectedRewards).to.equal(35);
        expect(ownerBalance).to.equal(10);
        expect(rewards).to.equal(0);
      });


      it("Should withdraw rewards to owner", async function () {
        await stakingContract.claimRewards();
        const expectedRewards = await stakingContract.ownerRewards(owner.address);
        const tokenBalance = await erc20token.balanceOf(owner.address);
        expect(expectedRewards).to.equal(0);
        expect(tokenBalance).to.equal(startingBalance.add(35)); // 40 plus 35 in new rewards
      });
    });

    describe("Claim Rewards after OG and secondary rewards updated", function () {
      it("Should update the rewards for OG token", async function () {
        startingBalance = await erc20token.balanceOf(owner.address);
        ownerBalance = await stakingContract.balanceOf(owner.address);
        await passTime(86400); // 24 hours
        await stakingContract.setTokenReward(erc721token.address, 20);
        expect(await stakingContract.tokenReward(erc721token.address)).to.equal(20);
      });

      it("Should preview rewards from two days", async function () {
        await passTime(86400); // 24 hours
        [rewards, updateTime, previewBalance] = await stakingContract.previewRewards(owner.address);
        expect(rewards).to.equal(35); // 10 for one day plus 25 for one day
      });

      it("Should update the rewards for token two", async function () {
        await stakingContract.setTokenReward(erc721tokenTwo.address, 10);
        expect(await stakingContract.tokenReward(erc721tokenTwo.address)).to.equal(10);
      });

      it("Should preview rewards from one day", async function () {
        await passTime(86400); // 24 hours
        [rewards, updateTime, previewBalance] = await stakingContract.previewRewards(owner.address);
        expect(rewards).to.equal(65); // 35 plus 30 for one day
      });

      it("Should update rewards from one day", async function () {
        await stakingContract.updateRewards();
        ownerBalance = await stakingContract.balanceOf(owner.address);
        expect(ownerBalance).to.equal(30);
        const expectedRewards = await stakingContract.ownerRewards(owner.address);
        [rewards, updateTime, previewBalance] = await stakingContract.previewRewards(owner.address);
        expect(expectedRewards).to.equal(65); // 35 plus 30 for one day
        expect(rewards).to.equal(0);
      });


      it("Should withdraw rewards to owner", async function () {
        const claimableRewards = await stakingContract.ownerRewards(owner.address);
        await stakingContract.claimRewards();
        const expectedRewards = await stakingContract.ownerRewards(owner.address);
        const tokenBalance = await erc20token.balanceOf(owner.address);
        expect(expectedRewards).to.equal(0);
        expect(tokenBalance).to.equal(startingBalance.add(claimableRewards)); // 75 plus 65
      });

      it("Should preview rewards from one day", async function () {
        startingBalance = await erc20token.balanceOf(owner.address);
        ownerBalance = await stakingContract.balanceOf(owner.address);
        await passTime(86400); // 24 hours
        [rewards, updateTime, previewBalance] = await stakingContract.previewRewards(owner.address);
        expect(rewards).to.equal(30); // 30 per day
      });

      it("Should update and claim rewards from one day", async function () {
        await stakingContract.updateRewardsAndClaim();
        const expectedRewards = await stakingContract.ownerRewards(owner.address);
        const tokenBalance = await erc20token.balanceOf(owner.address);
        expect(expectedRewards).to.equal(0);
        expect(tokenBalance).to.equal(startingBalance.add(ownerBalance)); // 140 plus 30
      });
    });

    describe("Claim and update rewards with two changes", function () {
      it("Should update the rewards for OG token", async function () {
        startingBalance = await erc20token.balanceOf(owner.address);
        ownerBalance = await stakingContract.balanceOf(owner.address);
        await passTime(86400); // 24 hours
        await stakingContract.setTokenReward(erc721token.address, 10);
        expect(await stakingContract.tokenReward(erc721token.address)).to.equal(10);
      });

      it("Should preview rewards from two days", async function () {
        await passTime(86400); // 24 hours
        [rewards, updateTime, previewBalance] = await stakingContract.previewRewards(owner.address);
        expect(rewards).to.equal(50); // 30 for one day plus 20 for one day
      });

      it("Should update the rewards for token two", async function () {
        await stakingContract.setTokenReward(erc721tokenTwo.address, 5);
        expect(await stakingContract.tokenReward(erc721tokenTwo.address)).to.equal(5);
      });

      it("Should preview rewards from one day", async function () {
        await passTime(86400); // 24 hours
        [rewards, updateTime, previewBalance] = await stakingContract.previewRewards(owner.address);
        expect(rewards).to.equal(65); // 50 plus 15 for one day
      });

      it("Should update and claim rewards from one day", async function () {
        const [claimableRewards, , ] = await stakingContract.previewRewards(owner.address);
        await stakingContract.updateRewardsAndClaim();
        ownerBalance = await stakingContract.balanceOf(owner.address);
        expect(ownerBalance).to.equal(15);

        const tokenBalance = await erc20token.balanceOf(owner.address);
        const expectedRewards = await stakingContract.ownerRewards(owner.address);
        [rewards, updateTime, previewBalance] = await stakingContract.previewRewards(owner.address);
        expect(expectedRewards).to.equal(0); // As claimed
        expect(rewards).to.equal(0); // As claimed
        expect(tokenBalance).to.equal(startingBalance.add(claimableRewards)); // 75 plus 65
      });

      it("Should preview rewards from one day", async function () {
        startingBalance = await erc20token.balanceOf(owner.address);
        ownerBalance = await stakingContract.balanceOf(owner.address);
        await passTime(86400); // 24 hours
        [rewards, updateTime, previewBalance] = await stakingContract.previewRewards(owner.address);
        expect(rewards).to.equal(15); // 15 per day
      });

      it("Should update and claim rewards from one day", async function () {
        await stakingContract.updateRewardsAndClaim();
        const expectedRewards = await stakingContract.ownerRewards(owner.address);
        const tokenBalance = await erc20token.balanceOf(owner.address);
        expect(expectedRewards).to.equal(0);
        expect(tokenBalance).to.equal(startingBalance.add(ownerBalance));
      });
    });

    describe("Claim Rewards after unrelated collections updated", function () {
      it("Should whitelist new NFT 1", async function () {
        await passTime(86400); // 24 hours
        await stakingContract.setWhitelisted(erc721tokenThree.address, true);
        expect(await stakingContract.whitelisted(erc721tokenThree.address)).to.equal(true);
      });

      it("Should set reward for new NFT 1", async function () {
        await stakingContract.setTokenReward(erc721tokenThree.address, 10);
        expect(await stakingContract.tokenReward(erc721tokenThree.address)).to.equal(10);
      });

      it("Should preview rewards for one day", async function () {
        [rewards, updateTime, previewBalance] = await stakingContract.previewRewards(owner.address);
        expect(rewards).to.equal(15); // 15 per day
      });

      it("Should whitelist new NFT 2", async function () {
        await passTime(86400); // 24 hours
        await stakingContract.setWhitelisted(erc721tokenFour.address, true);
        expect(await stakingContract.whitelisted(erc721tokenFour.address)).to.equal(true);
      });

      it("Should set reward for new NFT 2", async function () {
        await stakingContract.setTokenReward(erc721tokenFour.address, 10);
        expect(await stakingContract.tokenReward(erc721tokenFour.address)).to.equal(10);
      });

      it("Should preview rewards for two days", async function () {
        [rewards, updateTime, previewBalance] = await stakingContract.previewRewards(owner.address);
        expect(rewards).to.equal(30); // 15 per day x2
      });

      it("Should update reward for new NFT 1", async function () {
        await passTime(86400); // 24 hours
        await stakingContract.setTokenReward(erc721tokenThree.address, 20);
        expect(await stakingContract.tokenReward(erc721tokenThree.address)).to.equal(20);
      });

      it("Should preview rewards for three days", async function () {
        [rewards, updateTime, previewBalance] = await stakingContract.previewRewards(owner.address);
        expect(rewards).to.equal(45); // 15 per day x3
      });

      it("Should update reward for new NFT 2", async function () {
        await passTime(86400); // 24 hours
        await stakingContract.setTokenReward(erc721tokenFour.address, 20);
        expect(await stakingContract.tokenReward(erc721tokenFour.address)).to.equal(20);
      });

      it("Should preview rewards for four days", async function () {
        [rewards, updateTime, previewBalance] = await stakingContract.previewRewards(owner.address);
        expect(rewards).to.equal(60); // 15 per day x4
      });

      it("Should update reward for new NFT 1 again", async function () {
        await passTime(86400); // 24 hours
        await stakingContract.setTokenReward(erc721tokenThree.address, 30);
        expect(await stakingContract.tokenReward(erc721tokenThree.address)).to.equal(30);
      });

      it("Should preview rewards for five days", async function () {
        [rewards, updateTime, previewBalance] = await stakingContract.previewRewards(owner.address);
        expect(rewards).to.equal(75); // 15 per day x5
      });

      it("Should update reward for new NFT 2 again", async function () {
        await passTime(86400); // 24 hours
        await stakingContract.setTokenReward(erc721tokenFour.address, 30);
        expect(await stakingContract.tokenReward(erc721tokenFour.address)).to.equal(30);
      });

      it("Should preview rewards for six days", async function () {
        [rewards, updateTime, previewBalance] = await stakingContract.previewRewards(owner.address);
        expect(rewards).to.equal(90); // 15 per day x6
      });
    });
  });
});
