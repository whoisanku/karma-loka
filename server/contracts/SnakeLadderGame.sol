// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";

contract SnakeGame {
    using SafeERC20 for IERC20;

    struct Room {
        uint256 id;
        address creator;
        uint256 requiredParticipants;
        uint256 maxParticipants;
        uint256 stakeAmount;
        bool started;
        uint256 gameStartTime;
        address[] players;
        mapping(address => bool) hasJoined;
        mapping(address => uint8) positions;
        mapping(address => uint256) lastRollSlot;
        mapping(address => uint8) prasadMeter;
        address winner;
    }

    mapping(uint256 => Room) private roomStorage;
    uint256 public roomCount;

    mapping(uint8 => uint8) private snakeLadderMap;
    address private owner;
    uint256 public globalMaxParticipants;
    IERC20 public stakeToken;

    event RoomCreated(uint256 indexed roomId, address creator);
    event Participated(uint256 indexed roomId, address player);
    event DiceRolled(uint256 indexed roomId, address player, uint8 roll);
    event GameWon(uint256 indexed roomId, address winner);

    modifier onlyOwner() {
        require(msg.sender == owner, "Only owner can call this");
        _;
    }

    constructor(address _stakeToken) {
        owner = msg.sender;
        stakeToken = IERC20(_stakeToken);
        globalMaxParticipants = 4; // Default max participants for any room
        snakeLadderMap[99] = 21;
        snakeLadderMap[95] = 75;
        snakeLadderMap[92] = 88;
        snakeLadderMap[89] = 68;
        snakeLadderMap[74] = 53;
        snakeLadderMap[62] = 19;
        snakeLadderMap[64] = 60;
        snakeLadderMap[49] = 11;
        snakeLadderMap[46] = 25;
        snakeLadderMap[16] = 6;

        // Ladders
        snakeLadderMap[2] = 38;
        snakeLadderMap[7] = 14;
        snakeLadderMap[8] = 31;
        snakeLadderMap[15] = 26;
        snakeLadderMap[21] = 42;
        snakeLadderMap[28] = 84;
        snakeLadderMap[36] = 44;
        snakeLadderMap[51] = 67;
        snakeLadderMap[71] = 91;
        snakeLadderMap[78] = 98;
        snakeLadderMap[87] = 94;
    }

    function setGlobalMaxParticipants(uint256 _newMaxParticipants) external onlyOwner {
        require(_newMaxParticipants > 1 && _newMaxParticipants <= 10, "Max participants must be between 2 and 10");
        globalMaxParticipants = _newMaxParticipants;
    }

    function createRoom(uint256 _requiredParticipants, uint256 _stakeAmount) external {
        require(_requiredParticipants > 1 && _requiredParticipants <= globalMaxParticipants, "Invalid participant count for current global max");
        require(_stakeAmount > 0, "Stake required");
        stakeToken.safeTransferFrom(msg.sender, address(this), _stakeAmount);

        roomCount++;
        Room storage newRoom = roomStorage[roomCount];
        newRoom.id = roomCount;
        newRoom.creator = msg.sender;
        newRoom.requiredParticipants = _requiredParticipants;
        newRoom.maxParticipants = globalMaxParticipants; // Use global max participants
        newRoom.stakeAmount = _stakeAmount;

        newRoom.players.push(msg.sender);
        newRoom.hasJoined[msg.sender] = true;
        newRoom.positions[msg.sender] = 1;
        newRoom.lastRollSlot[msg.sender] = type(uint256).max;

        emit RoomCreated(roomCount, msg.sender);
    }

    function participate(uint256 roomId) external {
        Room storage room = roomStorage[roomId];
        require(!room.started, "Game started");
        require(room.players.length < room.maxParticipants, "Room full");
        require(!room.hasJoined[msg.sender], "Already joined");
        stakeToken.safeTransferFrom(msg.sender, address(this), room.stakeAmount);

        room.players.push(msg.sender);
        room.hasJoined[msg.sender] = true;
        room.positions[msg.sender] = 1;
        room.lastRollSlot[msg.sender] = type(uint256).max;

        emit Participated(roomId, msg.sender);

        if (room.players.length == room.requiredParticipants) {
            room.started = true;
            room.gameStartTime = block.timestamp;
        }
    }

    function getCurrentSlot(Room storage room) internal view returns (uint256) {
        require(room.started, "Game not started");
        return (block.timestamp - room.gameStartTime) / 1 days;
    }

    function applySnakeLadder(uint8 position) internal view returns (uint8) {
        if (snakeLadderMap[position] != 0) {
            return snakeLadderMap[position];
        }
        return position;
    }

    function rollDice(uint256 roomId) public {
        Room storage room = roomStorage[roomId];
        require(room.started, "Not started");
        require(room.hasJoined[msg.sender], "Not joined");
        require(room.winner == address(0), "Game over");

        uint256 currentSlot = getCurrentSlot(room);
        require(room.lastRollSlot[msg.sender] < currentSlot || room.lastRollSlot[msg.sender] == type(uint256).max, "Roll not allowed in current slot");

        uint8 baseRoll = uint8(uint256(keccak256(abi.encodePacked(block.timestamp, msg.sender))) % 6 + 1);
        uint8 bonus = room.prasadMeter[msg.sender] / 10;
        uint8 finalRoll = baseRoll + bonus;
        if (finalRoll > 6) finalRoll = 6;

        // One-time extra roll if finalRoll is 6
        if (finalRoll == 6) {
            uint8 extraRoll = uint8(uint256(keccak256(abi.encodePacked(block.timestamp, msg.sender, "bonus"))) % 6 + 1);
            finalRoll += extraRoll;
        }

        uint8 newPos = room.positions[msg.sender] + finalRoll;
        if (newPos > 100) newPos = 100;
        newPos = applySnakeLadder(newPos);
        room.positions[msg.sender] = newPos;

        if (newPos >= 100) {
            room.winner = msg.sender;
            stakeToken.safeTransfer(msg.sender, room.stakeAmount * room.players.length);
            emit GameWon(roomId, msg.sender);
        }

        room.lastRollSlot[msg.sender] = currentSlot;
        emit DiceRolled(roomId, msg.sender, finalRoll);
    }

    function autoRoll(uint256 roomId) external {
        Room storage room = roomStorage[roomId];
        require(room.started, "Not started");
        require(room.winner == address(0), "Game over");

        uint256 currentSlot = getCurrentSlot(room);

        for (uint i = 0; i < room.players.length; i++) {
            address player = room.players[i];
            if (room.lastRollSlot[player] < currentSlot) {
                uint8 baseRoll = uint8(uint256(keccak256(abi.encodePacked(block.timestamp, player))) % 6 + 1);
                uint8 bonus = room.prasadMeter[player] / 10;
                uint8 finalRoll = baseRoll + bonus;
                if (finalRoll > 6) finalRoll = 6;

                if (finalRoll == 6) {
                    uint8 extraRoll = uint8(uint256(keccak256(abi.encodePacked(block.timestamp, player, "bonus"))) % 6 + 1);
                    finalRoll += extraRoll;
                }

                uint8 newPos = room.positions[player] + finalRoll;
                if (newPos > 100) newPos = 100;
                newPos = applySnakeLadder(newPos);
                room.positions[player] = newPos;

                if (newPos >= 100) {
                    room.winner = player;
                    stakeToken.safeTransfer(player, room.stakeAmount * room.players.length);
                    emit GameWon(roomId, player);
                    return;
                }

                room.lastRollSlot[player] = currentSlot;
                emit DiceRolled(roomId, player, finalRoll);
            }
        }
    }

    function updatePrasadMeter(uint256 roomId, address player, uint8 activityWeight) external onlyOwner {
        Room storage room = roomStorage[roomId];
        require(room.hasJoined[player], "Not joined");
        room.prasadMeter[player] += activityWeight;
    }

    function getRoomPlayers(uint256 roomId) external view returns (address[] memory) {
        return roomStorage[roomId].players;
    }

    function hasJoined(uint256 roomId, address player) external view returns (bool) {
        return roomStorage[roomId].hasJoined[player];
    }

    function getRoomInfo(uint256 roomId) external view returns (
        address creator,
        uint256 requiredParticipants,
        uint256 maxParticipants,
        uint256 stakeAmount,
        bool started,
        uint256 gameStartTime,
        address winner
    ) {
        Room storage room = roomStorage[roomId];
        return (
            room.creator,
            room.requiredParticipants,
            room.maxParticipants,
            room.stakeAmount,
            room.started,
            room.gameStartTime,
            room.winner
        );
    }

    function getUserInfo(uint256 roomId, address player) external view returns (
        uint8 position,
        uint256 lastRoll,
        uint8 prasad
    ) {
        Room storage room = roomStorage[roomId];
        require(room.hasJoined[player], "Player not in room");
        return (
            room.positions[player],
            room.lastRollSlot[player],
            room.prasadMeter[player]
        );
    }
}
