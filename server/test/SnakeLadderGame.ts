import { expect } from "chai";
import { ethers } from "hardhat";
import { loadFixture, time } from "@nomicfoundation/hardhat-toolbox/network-helpers";

describe("SnakeLadderGame", function () {
  // Fixture: deploy mock USDC and game
  async function deployGameFixture() {
    const decimals = 6;
    const initialMint = ethers.parseUnits("1000", decimals);
    const stakeAmount = ethers.parseUnits("10", decimals);

    const [owner, player1, player2, player3] = await ethers.getSigners();

    const MockERC20 = await ethers.getContractFactory("MockERC20");
    const mockUsdc = await MockERC20.deploy("MockUSDC", "mUSDC");
    await mockUsdc.waitForDeployment(); // Ensure deployment is complete
    const mockUsdcAddress = await mockUsdc.getAddress();

    const SnakeGame = await ethers.getContractFactory("SnakeGame");
    const snakeGame = await SnakeGame.deploy(mockUsdcAddress);
    await snakeGame.waitForDeployment(); // Ensure deployment is complete
    const snakeGameAddress = await snakeGame.getAddress();

    // Mint and approve tokens
    for (const acct of [owner, player1, player2, player3]) {
      await mockUsdc.mint(acct.address, initialMint);
      await mockUsdc.connect(acct).approve(snakeGameAddress, ethers.MaxUint256);
    }

    // Owner sets max participants
    await snakeGame.connect(owner).setGlobalMaxParticipants(3);

    return { snakeGame, mockUsdc, owner, player1, player2, player3, stakeAmount };
  }

  describe("Configuration", function () {
    it("Should allow owner to set global max participants", async function () {
      const { snakeGame, owner } = await loadFixture(deployGameFixture);
      await snakeGame.connect(owner).setGlobalMaxParticipants(5);
      expect(await snakeGame.globalMaxParticipants()).to.equal(5);
    });
  });

  describe("Game flow", function () {
    it("Should create room and collect stake", async function () {
      const { snakeGame, mockUsdc, player1, stakeAmount } = await loadFixture(deployGameFixture);
      await snakeGame.connect(player1).createRoom(2, stakeAmount, "test-uri");
      const players = await snakeGame.getRoomPlayers(1);
      expect(players).to.include(player1.address);
      const gameAddr = await snakeGame.getAddress();
      expect(await mockUsdc.balanceOf(gameAddr)).to.equal(stakeAmount);
      expect(await snakeGame.hasJoined(1, player1.address)).to.be.true;
    });

    it("Should allow players to join and start game", async function () {
      const { snakeGame, player1, player2, stakeAmount } = await loadFixture(deployGameFixture);
      await snakeGame.connect(player1).createRoom(2, stakeAmount, "test-uri");
      await snakeGame.connect(player2).participate(1);
      const [, , , , started] = await snakeGame.getRoomInfo(1);
      expect(started).to.be.true;
    });

    it("Should enforce starting position at square 1 and update on roll", async function () {
      const { snakeGame, player1, player2, stakeAmount } = await loadFixture(deployGameFixture);
      await snakeGame.connect(player1).createRoom(2, stakeAmount, "test-uri");
      await snakeGame.connect(player2).participate(1);

      // Advance time by more than 5 minutes to ensure a new slot
      await time.increase(301);

      const [, before] = await snakeGame.getUserInfo(1, player1.address);
      expect(before).to.equal(1);
      await snakeGame.connect(player1).rollDice(1);
      const [, after] = await snakeGame.getUserInfo(1, player1.address);
      expect(after).to.be.gt(before);
    });

    it("Should track prasad meter", async function () {
      const { snakeGame, owner, player1, player2, stakeAmount } = await loadFixture(deployGameFixture);
      await snakeGame.connect(player1).createRoom(2, stakeAmount, "test-uri");
      await snakeGame.connect(player2).participate(1);
      await snakeGame.connect(owner).updatePrasadMeter(1, player1.address, 5);
      const [,,,, prasad] = await snakeGame.getUserInfo(1, player1.address);
      expect(prasad).to.equal(5);
    });

    it("Should collect stakes correctly for multiple participants", async function () {
      const { snakeGame, mockUsdc, player1, player2, player3, stakeAmount } = await loadFixture(deployGameFixture);
      const snakeGameAddress = await snakeGame.getAddress(); // Define snakeGameAddress here
      await snakeGame.connect(player1).createRoom(3, stakeAmount, "test-uri");
      expect(await mockUsdc.balanceOf(snakeGameAddress)).to.equal(stakeAmount);
      await snakeGame.connect(player2).participate(1);
      expect(await mockUsdc.balanceOf(snakeGameAddress)).to.equal(stakeAmount * 2n);
      await snakeGame.connect(player3).participate(1);
      expect(await mockUsdc.balanceOf(snakeGameAddress)).to.equal(stakeAmount * 3n);
    });

    it("Should return correct room info", async function () {
      const { snakeGame, player1, stakeAmount } = await loadFixture(deployGameFixture);
      await snakeGame.connect(player1).createRoom(3, stakeAmount, "test-uri");
      const [creator, required, maxParticipants, stake, started, , winner] = await snakeGame.getRoomInfo(1);
      expect(creator).to.equal(player1.address);
      expect(required).to.equal(3);
      expect(maxParticipants).to.equal(await snakeGame.globalMaxParticipants());
      expect(stake).to.equal(stakeAmount);
      expect(started).to.be.false;
      expect(winner).to.equal(ethers.ZeroAddress);
    });

    it("Should correctly handle turn progression based on dice roll", async function () {
      const { snakeGame, player1, player2, stakeAmount } = await loadFixture(deployGameFixture);
      await snakeGame.connect(player1).createRoom(2, stakeAmount, "test-uri");
      await snakeGame.connect(player2).participate(1);

      await time.increase(301); // 5 minutes + 1 second for a new slot

      const tx = await snakeGame.connect(player1).rollDice(1);
      const receipt = await tx.wait();

      if (!receipt) {
        throw new Error("Transaction receipt is null");
      }
      
      const event = receipt.logs.find(
        (e: any) => e.eventName === 'DiceRolled'
      );

      if (!event || !('args' in event)) {
        throw new Error("DiceRolled event not found or args are missing");
      }
      
      const roll = event.args[2];
      
      if (roll === 6) {
        expect(await snakeGame.getCurrentPlayer(1)).to.equal(player1.address);
        await expect(snakeGame.connect(player1).rollDice(1)).to.be.revertedWith("Must use extra roll");
        await expect((snakeGame as any).connect(player1).extraRoll(1)).to.not.be.reverted;
        expect(await snakeGame.getCurrentPlayer(1)).to.equal(player2.address);
      } else {
        expect(await snakeGame.getCurrentPlayer(1)).to.equal(player2.address);
        await expect((snakeGame as any).connect(player1).extraRoll(1)).to.be.revertedWith("No extra roll granted");
      }
    });
  });
});
