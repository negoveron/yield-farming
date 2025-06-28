const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("TokenFarm", function () {
  let tokenFarm, dappToken, lpToken;
  let owner, user1, user2;
  
  beforeEach(async function () {
    // Obtener signers
    [owner, user1, user2] = await ethers.getSigners();
    
    // Desplegar DAppToken
    const DAppToken = await ethers.getContractFactory("DAppToken");
    dappToken = await DAppToken.deploy(owner.address);
    await dappToken.waitForDeployment();
    
    // Desplegar LPToken
    const LPToken = await ethers.getContractFactory("LPToken");
    lpToken = await LPToken.deploy(owner.address);
    await lpToken.waitForDeployment();
    
    // Desplegar TokenFarm
    const TokenFarm = await ethers.getContractFactory("TokenFarm");
    tokenFarm = await TokenFarm.deploy(
      await dappToken.getAddress(),
      await lpToken.getAddress()
    );
    await tokenFarm.waitForDeployment();
    
    // Transferir ownership de DAppToken a TokenFarm
    await dappToken.transferOwnership(await tokenFarm.getAddress());
    
    // Mintear LP tokens para testing
    await lpToken.mint(user1.address, ethers.parseEther("1000"));
    await lpToken.mint(user2.address, ethers.parseEther("500"));
  });

  describe("Deployment", function () {
    it("Should set the correct owner", async function () {
      expect(await tokenFarm.owner()).to.equal(owner.address);
    });

    it("Should set the correct token addresses", async function () {
      expect(await tokenFarm.dappToken()).to.equal(await dappToken.getAddress());
      expect(await tokenFarm.lpToken()).to.equal(await lpToken.getAddress());
    });

    it("Should set the correct name", async function () {
      expect(await tokenFarm.name()).to.equal("Ultimate Token Farm");
    });

    it("Should set initial reward per block", async function () {
      expect(await tokenFarm.rewardPerBlock()).to.equal(ethers.parseEther("1"));
    });

    it("Should set initial fee percentage", async function () {
      expect(await tokenFarm.feePercentage()).to.equal(500); // 5%
    });
  });

  describe("Deposit", function () {
    it("Should allow users to deposit LP tokens", async function () {
      const depositAmount = ethers.parseEther("100");
      
      // Aprobar tokens
      await lpToken.connect(user1).approve(await tokenFarm.getAddress(), depositAmount);
      
      // Depositar
      await expect(tokenFarm.connect(user1).deposit(depositAmount))
        .to.emit(tokenFarm, "Deposit")
        .withArgs(user1.address, depositAmount);
      
      // Verificar balance
      expect(await tokenFarm.totalStakingBalance()).to.equal(depositAmount);
    });

    it("Should revert if deposit amount is 0", async function () {
      await expect(tokenFarm.connect(user1).deposit(0))
        .to.be.revertedWith("Amount must be greater than 0");
    });

    it("Should revert if user hasn't approved tokens", async function () {
      const depositAmount = ethers.parseEther("100");
      
      await expect(tokenFarm.connect(user1).deposit(depositAmount))
        .to.be.reverted;
    });

    it("Should add user to stakers array on first deposit", async function () {
      const depositAmount = ethers.parseEther("100");
      
      await lpToken.connect(user1).approve(await tokenFarm.getAddress(), depositAmount);
      await tokenFarm.connect(user1).deposit(depositAmount);
      
      expect(await tokenFarm.getStakersCount()).to.equal(1);
      expect(await tokenFarm.stakers(0)).to.equal(user1.address);
    });
  });

  describe("Withdraw", function () {
    beforeEach(async function () {
      // Setup: user1 deposits tokens
      const depositAmount = ethers.parseEther("100");
      await lpToken.connect(user1).approve(await tokenFarm.getAddress(), depositAmount);
      await tokenFarm.connect(user1).deposit(depositAmount);
    });

    it("Should allow users to withdraw all staked tokens", async function () {
      const initialBalance = await lpToken.balanceOf(user1.address);
      
      await expect(tokenFarm.connect(user1).withdraw())
        .to.emit(tokenFarm, "Withdraw")
        .withArgs(user1.address, ethers.parseEther("100"));
      
      const finalBalance = await lpToken.balanceOf(user1.address);
      expect(finalBalance - initialBalance).to.equal(ethers.parseEther("100"));
      expect(await tokenFarm.totalStakingBalance()).to.equal(0);
    });

    it("Should revert if user is not staking", async function () {
      await expect(tokenFarm.connect(user2).withdraw())
        .to.be.revertedWith("User is not staking");
    });
  });

  describe("Rewards Distribution", function () {
    beforeEach(async function () {
      // Setup: user1 and user2 deposit tokens
      await lpToken.connect(user1).approve(await tokenFarm.getAddress(), ethers.parseEther("300"));
      await tokenFarm.connect(user1).deposit(ethers.parseEther("300"));
      
      await lpToken.connect(user2).approve(await tokenFarm.getAddress(), ethers.parseEther("100"));
      await tokenFarm.connect(user2).deposit(ethers.parseEther("100"));
    });

    it("Should distribute rewards proportionally", async function () {
      // Minar algunos bloques
      for (let i = 0; i < 10; i++) {
        await ethers.provider.send("evm_mine");
      }
      
      await tokenFarm.distributeRewardsAll();
      
      // user1 tiene 75% del stake (300/400), user2 tiene 25% (100/400)
      // Con recompensas proporcionales, user1 debería tener ~3x más recompensas que user2
      const user1Info = await tokenFarm.userInfo(user1.address);
      const user2Info = await tokenFarm.userInfo(user2.address);
      
      expect(user1Info.pendingRewards).to.be.gt(user2Info.pendingRewards);
    });

    it("Should only allow owner to distribute rewards to all", async function () {
      await expect(tokenFarm.connect(user1).distributeRewardsAll())
        .to.be.revertedWith("Only owner can call this function");
    });
  });

  describe("Claim Rewards", function () {
    beforeEach(async function () {
      // Setup: user1 deposits and generates rewards
      await lpToken.connect(user1).approve(await tokenFarm.getAddress(), ethers.parseEther("100"));
      await tokenFarm.connect(user1).deposit(ethers.parseEther("100"));
      
      // Minar bloques para generar recompensas
      for (let i = 0; i < 5; i++) {
        await ethers.provider.send("evm_mine");
      }
      
      await tokenFarm.distributeRewardsAll();
    });

    it("Should allow users to claim rewards with fee deduction", async function () {
      const userInfoBefore = await tokenFarm.userInfo(user1.address);
      const pendingRewards = userInfoBefore.pendingRewards;
      
      expect(pendingRewards).to.be.gt(0);
      
      await expect(tokenFarm.connect(user1).claimRewards())
        .to.emit(tokenFarm, "RewardsClaimed");
      
      // Verificar que se aplicó la comisión
      const dappBalance = await dappToken.balanceOf(user1.address);
      const expectedNetReward = pendingRewards - (pendingRewards * 500n / 10000n); // 5% fee
      
      expect(dappBalance).to.equal(expectedNetReward);
    });

    it("Should revert if no pending rewards", async function () {
      await expect(tokenFarm.connect(user2).claimRewards())
        .to.be.revertedWith("No pending rewards");
    });

    it("Should accumulate fees for owner", async function () {
      const feesBefore = await tokenFarm.accumulatedFees();
      await tokenFarm.connect(user1).claimRewards();
      const feesAfter = await tokenFarm.accumulatedFees();
      
      expect(feesAfter).to.be.gt(feesBefore);
    });
  });

  describe("Owner Functions", function () {
    it("Should allow owner to change reward per block", async function () {
      const newReward = ethers.parseEther("2");
      
      await expect(tokenFarm.setRewardPerBlock(newReward))
        .to.emit(tokenFarm, "RewardPerBlockUpdated")
        .withArgs(ethers.parseEther("1"), newReward);
      
      expect(await tokenFarm.rewardPerBlock()).to.equal(newReward);
    });

    it("Should not allow non-owner to change reward per block", async function () {
      await expect(tokenFarm.connect(user1).setRewardPerBlock(ethers.parseEther("2")))
        .to.be.revertedWith("Only owner can call this function");
    });

    it("Should allow owner to change fee percentage", async function () {
      const newFee = 1000; // 10%
      
      await expect(tokenFarm.setFeePercentage(newFee))
        .to.emit(tokenFarm, "FeePercentageUpdated")
        .withArgs(500, newFee);
      
      expect(await tokenFarm.feePercentage()).to.equal(newFee);
    });

    it("Should not allow fee percentage above 10%", async function () {
      await expect(tokenFarm.setFeePercentage(1100))
        .to.be.revertedWith("Fee cannot exceed 10%");
    });

    it("Should allow owner to withdraw accumulated fees", async function () {
      // Setup: generate some fees
      await lpToken.connect(user1).approve(await tokenFarm.getAddress(), ethers.parseEther("100"));
      await tokenFarm.connect(user1).deposit(ethers.parseEther("100"));
      
      for (let i = 0; i < 5; i++) {
        await ethers.provider.send("evm_mine");
      }
      
      await tokenFarm.distributeRewardsAll();
      await tokenFarm.connect(user1).claimRewards();
      
      const feesBefore = await tokenFarm.accumulatedFees();
      expect(feesBefore).to.be.gt(0);
      
      await expect(tokenFarm.withdrawFees())
        .to.emit(tokenFarm, "FeesWithdrawn")
        .withArgs(owner.address, feesBefore);
      
      expect(await tokenFarm.accumulatedFees()).to.equal(0);
    });
  });

  describe("Edge Cases", function () {
    it("Should handle multiple deposits from same user", async function () {
      await lpToken.connect(user1).approve(await tokenFarm.getAddress(), ethers.parseEther("200"));
      
      await tokenFarm.connect(user1).deposit(ethers.parseEther("100"));
      await tokenFarm.connect(user1).deposit(ethers.parseEther("100"));
      
      expect(await tokenFarm.totalStakingBalance()).to.equal(ethers.parseEther("200"));
      expect(await tokenFarm.getStakersCount()).to.equal(1); // Should not duplicate
    });

    it("Should handle zero total staking balance in reward distribution", async function () {
      // No deposits made, should not revert
      await expect(tokenFarm.distributeRewardsAll()).to.not.be.reverted;
    });
  });
});