const { network, getNamedAccounts, deployments, ethers } = require("hardhat");
const { developmentChains, networkConfig } = require("../../helper-hardhat-config.js");
const { assert, expect } = require("chai");

!developmentChains.includes(network.name) ? describe.skip : describe("Rraffle Unit Test", async function() {
  let raffle, VRFCoordinatorV2Mock, raffleEntranceFee, deployer, interval;
  const chainId = network.config.chainId;
  
  beforeEach(async function() {
    deployer = (await getNamedAccounts()).deployer;
    await deployments.fixture(["all"]);
    raffle = await ethers.getContract("Raffle", deployer);
    VRFCoordinatorV2Mock = await ethers.getContract("VRFCoordinatorV2Mock", deployer);
    raffleEntranceFee = await raffle.getEntranceFee();
    interval = await raffle.getInterval();
  })

  describe("Constructor", async function() {
    it("initializes the raffle correctly", async function() {
      const raffleState = await raffle.getRaffleState();
      assert.equal(raffleState.toString(), '0'); 
      assert.equal(interval.toString(), networkConfig[chainId]["keepersUpdateInterval"])
    }) 
  })

  describe("EnterRaffle", async function() {
    it("reverts when you dont pay enough", async function() {
      await expect(raffle.enterRaffle()).to.be.revertedWith("Raffle__SendMoreToEnterRaffle")
    })

    it("Records plyers when they enter", async function() {
      await raffle.enterRaffle({value: raffleEntranceFee});
      const playerFromContract = await raffle.getPlayer(0);
      assert.equal(playerFromContract, deployer);
    })
    it("eemits event on enter", async function() {
      await expect(raffle.enterRaffle({value: raffleEntranceFee})).to.emit(raffle, "RaffleEnter");
      await network.provider.send("evm_increaseTime", [interval.toNumber() + 1]); // скіп часу
      await network.provider.send("evm_mine", []); // скіп блоків

      await raffle.performUpkeep([]);
      await expect(raffle.enterRaffle({value: raffleEntranceFee})).to.be.revertedWith("Raffle__RaffleNotOpen");
    })
  })

  describe("Check Upkeep", async function() {

    it("returns false if people havent sent any ETH", async function() {
      await network.provider.send("evm_increaseTime", [interval.toNumber() + 1]); // скіп часу
      await network.provider.send("evm_mine", []); // скіп блоків

      const {upkeepNeeded} = await raffle.callStatic.checkUpkeep([]);
      assert(!upkeepNeeded);
    })

    it("returns false if raffle isnt open", async function() {
      await raffle.enterRaffle({value: raffleEntranceFee});
      await network.provider.send("evm_increaseTime", [interval.toNumber() + 1]); // скіп часу
      await network.provider.send("evm_mine", []); // скіп блоків

      await raffle.performUpkeep([]);
      const raffleState = await raffle.getRaffleState();
      const {upkeepNeeded} = await raffle.callStatic.checkUpkeep([]);
      assert.equal(raffleState.toString(), "1");
      assert.equal(upkeepNeeded, false);
    })

    it("returns false if enough time hasn't passed", async () => {
      await raffle.enterRaffle({ value: raffleEntranceFee })
      await network.provider.send("evm_increaseTime", [interval.toNumber() - 5]) // use a higher number here if this test fails
      await network.provider.request({ method: "evm_mine", params: [] })
      const { upkeepNeeded } = await raffle.callStatic.checkUpkeep("0x") // upkeepNeeded = (timePassed && isOpen && hasBalance && hasPlayers)
      assert(!upkeepNeeded)
  })
  it("returns true if enough time has passed, has players, eth, and is open", async () => {
      await raffle.enterRaffle({ value: raffleEntranceFee })
      await network.provider.send("evm_increaseTime", [interval.toNumber() + 1])
      await network.provider.request({ method: "evm_mine", params: [] })
      const { upkeepNeeded } = await raffle.callStatic.checkUpkeep("0x") // upkeepNeeded = (timePassed && isOpen && hasBalance && hasPlayers)
      assert(upkeepNeeded)
  })
  })

  describe("performUpkeep", function() {
    it("it can only run if checkupkeep is true", async function() {
      await raffle.enterRaffle({value: raffleEntranceFee});
      await network.provider.send("evm_increaseTime", [interval.toNumber() + 1]); // скіп часу
      await network.provider.send("evm_mine", []); // скіп блоків

      const tx = await raffle.performUpkeep([]);
      assert(tx);
    })

    it("reverts when checkupkeep is false", async function() {
      await expect(raffle.performUpkeep([])).to.be.revertedWith("Raffle__UpkeepNotNeeded");
    })
  })
})