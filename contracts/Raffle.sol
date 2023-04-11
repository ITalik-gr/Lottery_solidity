// SPDX-License-Identifier: MIT

pragma solidity ^0.8.7;

import "@chainlink/contracts/src/v0.8/interfaces/VRFCoordinatorV2Interface.sol";
import "@chainlink/contracts/src/v0.8/VRFConsumerBaseV2.sol";

error Raffle__NotEnoughETHEnterned();

contract Raffle is VRFConsumerBaseV2 {
  // State Variables
  uint private immutable i_entranceFee;
  address payable[] private s_players;
  VRFCoordinatorV2Interface private immutable i_vrfCoordinator;
  bytes32 private immutable i_gasLane;
  uint64 private immutable i_subscriptionId;
  uint32 private immutable i_callbackGasLimit;
  uint16 private constant REQUEST_CONFRIMATIONS = 3;
  uint32 private constant NUM_WORDS = 1;
  // Events

  event RaffleEnter(address indexed player);
  event RequestedRaffleWinner(uint256 indexed requestId);

  constructor(
    address vrfCoordinatorV2, 
    uint entranceFee, 
    bytes32 gasLane,
    uint64 subscriptionId,
    uint32 callbackGasLimit
    ) VRFConsumerBaseV2(vrfCoordinatorV2) {
    i_entranceFee = entranceFee;
    i_vrfCoordinator = VRFCoordinatorV2Interface(vrfCoordinatorV2);
    i_gasLane = gasLane;
    i_subscriptionId = subscriptionId;
    i_callbackGasLimit = callbackGasLimit;
  }

  function enterRaffle() payable public {
    if (msg.value < i_entranceFee) {
      revert Raffle__NotEnoughETHEnterned();
    }
    s_players.push(payable(msg.sender));
    emit RaffleEnter(msg.sender);
  }

  function requestRandomWinner() external {
    uint256 requestId = i_vrfCoordinator.requestRandomWords(
      i_gasLane,
      i_subscriptionId,
      REQUEST_CONFRIMATIONS,
      i_callbackGasLimit,
      NUM_WORDS
      );
      emit RequestedRaffleWinner(requestId);
  }

  function fulfillRandomWords(uint requestId, uint[] memory randomWords) 
    internal 
    override {
      uint indexOfWinner = randomWords[0] % s_players.length;
      address payable recentWinner = s_players[indexOfWinner];
  }




  function getEntranceFee() public view returns(uint) {
    return i_entranceFee;
  }

  function getPlayers(uint index) public view returns(address) {
    return s_players[index];
  }

}