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
        mapping(address => uint8) lastPositions;
        mapping(address => uint8) lastRollValue;
        uint256 currentPlayerIndex;
        address winner;
        string metadataUri;
        mapping(address => bool) hasRolledSix;
    }

    mapping(uint256 => Room) private roomStorage;
    uint256 public roomCount;
    mapping(address => uint256) public leaderboard; // Track number of wins per player
    address[] private leaderboardPlayers; // Array to track all players who have won at least once

    mapping(uint8 => uint8) private snakeLadderMap;
    address private owner;
    uint256 public globalMaxParticipants;
    IERC20 public stakeToken;

    // Track all rooms a player has participated in
    mapping(address => uint256[]) private playerRooms;

    event RoomCreated(uint256 indexed roomId, address creator);
    event Participated(uint256 indexed roomId, address player);
    event DiceRolled(uint256 indexed roomId, address player, uint8 roll);
    event GameWon(uint256 indexed roomId, address winner);
    event LeaderboardUpdated(address indexed player, uint256 newWinCount);

    modifier onlyOwner() {
        require(msg.sender == owner, "Only owner can call this");
        _;
    }

    constructor(address _stakeToken) {
        owner = msg.sender;
        stakeToken = IERC20(_stakeToken);
        globalMaxParticipants = 4; // Default max participants for any room
        snakeLadderMap[99] = 41;
        snakeLadderMap[95] = 75;
        snakeLadderMap[92] = 88;
        snakeLadderMap[89] = 68;
        snakeLadderMap[74] = 53;
        snakeLadderMap[62] = 24;
        snakeLadderMap[64] = 20;
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

    function createRoom(uint256 _requiredParticipants, uint256 _stakeAmount, string memory _metadataUri) external {
        require(_requiredParticipants > 1 && _requiredParticipants <= globalMaxParticipants, "Invalid participant count for current global max");
        require(_stakeAmount > 0, "Stake required");
        require(bytes(_metadataUri).length > 0, "Metadata URI required");
        stakeToken.safeTransferFrom(msg.sender, address(this), _stakeAmount);

        roomCount++;
        Room storage newRoom = roomStorage[roomCount];
        newRoom.id = roomCount;
        newRoom.creator = msg.sender;
        newRoom.requiredParticipants = _requiredParticipants;
        newRoom.maxParticipants = globalMaxParticipants;
        newRoom.stakeAmount = _stakeAmount;
        newRoom.metadataUri = _metadataUri;

        newRoom.players.push(msg.sender);
        newRoom.hasJoined[msg.sender] = true;
        newRoom.positions[msg.sender] = 1;
        newRoom.lastRollSlot[msg.sender] = type(uint256).max;
        newRoom.lastPositions[msg.sender] = 1;
        newRoom.currentPlayerIndex = 0;
        newRoom.hasRolledSix[msg.sender] = false;

        // Track room participation for the creator
        playerRooms[msg.sender].push(roomCount);

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
        room.lastPositions[msg.sender] = 1;
        room.hasRolledSix[msg.sender] = false;

        // Track room participation for the player
        playerRooms[msg.sender].push(roomId);

        emit Participated(roomId, msg.sender);

        if (room.players.length == room.requiredParticipants) {
            room.started = true;
            room.gameStartTime = block.timestamp;
            room.currentPlayerIndex = 0;
        }
    }

    function getCurrentSlot(Room storage room) internal view returns (uint256) {
        require(room.started, "Game not started");
        // return (block.timestamp - room.gameStartTime) / 1 days;
        return block.timestamp - room.gameStartTime;
    }

    function applySnakeLadder(uint8 position) internal view returns (uint8) {
        if (snakeLadderMap[position] != 0) {
            return snakeLadderMap[position];
        }
        return position;
    }

    function rollDice(uint256 roomId) public returns (uint8) {
        Room storage room = roomStorage[roomId];
        require(room.started, "Not started");
        require(room.hasJoined[msg.sender], "Not joined");
        require(msg.sender == room.players[room.currentPlayerIndex], "Not your turn");
        require(room.winner == address(0), "Game over");
        require(!room.hasRolledSix[msg.sender], "Must use extra roll");

        uint256 currentSlot = getCurrentSlot(room);
        require(room.lastRollSlot[msg.sender] < currentSlot || room.lastRollSlot[msg.sender] == type(uint256).max, "Roll not allowed in current slot");

        uint8 baseRoll = uint8(uint256(keccak256(abi.encodePacked(block.timestamp, msg.sender))) % 6 + 1);
        uint8 bonus = room.prasadMeter[msg.sender] / 10;
        uint8 finalRoll = baseRoll + bonus;
        if (finalRoll > 6) finalRoll = 6;

        uint8 previousPosition = room.positions[msg.sender];
        room.lastPositions[msg.sender] = previousPosition;

        uint8 newPos;
        uint16 potentialPos = uint16(previousPosition) + uint16(finalRoll);
        if (potentialPos > 100) {
            newPos = uint8(100 - (potentialPos - 100)); // Bounce back
        } else {
            newPos = uint8(potentialPos);
        }

        newPos = applySnakeLadder(newPos);
        room.positions[msg.sender] = newPos;

        if (newPos == 100) {
            // Player wins.
            room.winner = msg.sender;
            stakeToken.safeTransfer(msg.sender, room.stakeAmount * room.players.length);
            if (leaderboard[msg.sender] == 0) {
                leaderboardPlayers.push(msg.sender);
            }
            leaderboard[msg.sender] += 1;
            emit GameWon(roomId, msg.sender);
            emit LeaderboardUpdated(msg.sender, leaderboard[msg.sender]);
        } else if (finalRoll == 6) {
            // Rolled a 6, gets an extra turn.
            room.hasRolledSix[msg.sender] = true;
        } else {
            // Normal move, turn passes to the next player.
            room.lastRollSlot[msg.sender] = currentSlot;
            room.currentPlayerIndex = (room.currentPlayerIndex + 1) % room.players.length;
        }
        
        room.lastRollValue[msg.sender] = finalRoll;
        emit DiceRolled(roomId, msg.sender, finalRoll);
        return finalRoll;
    }

    function extraRoll(uint256 roomId) public returns (uint8) {
        Room storage room = roomStorage[roomId];
        require(room.started, "Not started");
        require(room.hasJoined[msg.sender], "Not joined");
        require(room.winner == address(0), "Game over");
        require(room.hasRolledSix[msg.sender], "No extra roll granted");
        require(msg.sender == room.players[room.currentPlayerIndex], "Not your turn");

        uint8 baseRoll = uint8(uint256(keccak256(abi.encodePacked(block.timestamp, msg.sender, "extra"))) % 6 + 1);
        uint8 finalRoll = baseRoll;

        uint8 previousPosition = room.positions[msg.sender];
        room.lastPositions[msg.sender] = previousPosition;

        uint8 newPos;
        uint16 potentialPos = uint16(previousPosition) + uint16(finalRoll);
        if (potentialPos > 100) {
            newPos = uint8(100 - (potentialPos - 100)); // Bounce back
        } else {
            newPos = uint8(potentialPos);
        }

        newPos = applySnakeLadder(newPos);
        room.positions[msg.sender] = newPos;

        if (newPos == 100) {
            // Player wins.
            room.winner = msg.sender;
            stakeToken.safeTransfer(msg.sender, room.stakeAmount * room.players.length);
            if (leaderboard[msg.sender] == 0) {
                leaderboardPlayers.push(msg.sender);
            }
            leaderboard[msg.sender] += 1;
            emit GameWon(roomId, msg.sender);
            emit LeaderboardUpdated(msg.sender, leaderboard[msg.sender]);
        }
        
        room.lastRollValue[msg.sender] = finalRoll;
        emit DiceRolled(roomId, msg.sender, finalRoll);

        uint256 currentSlot = getCurrentSlot(room);
        room.hasRolledSix[msg.sender] = false;
        room.lastRollSlot[msg.sender] = currentSlot;
        room.currentPlayerIndex = (room.currentPlayerIndex + 1) % room.players.length;

        return finalRoll;
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

                uint8 previousPosition = room.positions[player];
                room.lastPositions[player] = previousPosition;

                uint8 newPos;
                uint16 potentialPos = uint16(previousPosition) + uint16(finalRoll);
                if (potentialPos > 100) {
                    newPos = uint8(100 - (potentialPos - 100)); // Bounce back
                } else {
                    newPos = uint8(potentialPos);
                }
                newPos = applySnakeLadder(newPos);
                room.positions[player] = newPos;

                emit DiceRolled(roomId, player, finalRoll);

                if (newPos == 100) {
                    room.winner = player;
                    stakeToken.safeTransfer(player, room.stakeAmount * room.players.length);
                    if (leaderboard[player] == 0) {
                        leaderboardPlayers.push(player);
                    }
                    leaderboard[player] += 1;
                    emit GameWon(roomId, player);
                    emit LeaderboardUpdated(player, leaderboard[player]);
                    return;
                }

                if (finalRoll == 6) {
                    uint8 extraRollValue = uint8(uint256(keccak256(abi.encodePacked(block.timestamp, player, "extra"))) % 6 + 1);
                    previousPosition = newPos;
                    room.lastPositions[player] = previousPosition;
                    
                    uint16 extraPotentialPos = uint16(previousPosition) + uint16(extraRollValue);
                    if (extraPotentialPos > 100) {
                        newPos = uint8(100 - (extraPotentialPos - 100)); // Bounce back
                    } else {
                        newPos = uint8(extraPotentialPos);
                    }
                    newPos = applySnakeLadder(newPos);
                    room.positions[player] = newPos;
                    emit DiceRolled(roomId, player, extraRollValue);

                    if (newPos == 100) {
                        room.winner = player;
                        stakeToken.safeTransfer(player, room.stakeAmount * room.players.length);
                        if (leaderboard[player] == 0) {
                            leaderboardPlayers.push(player);
                        }
                        leaderboard[player] += 1;
                        emit GameWon(roomId, player);
                        emit LeaderboardUpdated(player, leaderboard[player]);
                        return;
                    }
                }

                room.lastRollValue[player] = finalRoll;
                room.lastRollSlot[player] = currentSlot;
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
        address winner,
        string memory metadataUri
    ) {
        Room storage room = roomStorage[roomId];
        return (
            room.creator,
            room.requiredParticipants,
            room.maxParticipants,
            room.stakeAmount,
            room.started,
            room.gameStartTime,
            room.winner,
            room.metadataUri
        );
    }

    function getUserInfo(uint256 roomId, address player) external view returns (
        uint8 lastPosition,
        uint8 currentPosition,
        bool hasRolledSix,
        uint256 lastRollSlot,
        uint8 lastRoll,
        uint8 prasad
    ) {
        Room storage room = roomStorage[roomId];
        require(room.hasJoined[player], "Player not in room");
        return (
            room.lastPositions[player],
            room.positions[player],
            room.hasRolledSix[player],
            room.lastRollSlot[player],
            room.lastRollValue[player],
            room.prasadMeter[player]
        );
    }

    function getLastRoomId() external view returns (uint256) {
        return roomCount;
    }
    
    function getCurrentRunningRoomId() external view returns (uint256) {
        for (uint256 i = roomCount; i >= 1; i--) {
            Room storage room = roomStorage[i];
            if (room.started && room.winner == address(0)) {
                return i;
            }
        }
        return 0; // No running room found
    }

    /// @notice who's turn it is in a given room
    function getCurrentPlayer(uint256 roomId) external view returns (address) {
        Room storage room = roomStorage[roomId];
        return room.players[ room.currentPlayerIndex ];
    }

    // Add a function to get leaderboard stats
    function getLeaderboardStats(address player) external view returns (uint256) {
        return leaderboard[player];
    }

    // Get player's rank (1-based ranking)
    function getPlayerRank(address player) external view returns (uint256) {
        uint256 playerWins = leaderboard[player];
        if (playerWins == 0) return 0; // Player hasn't won any games

        uint256 rank = 1;
        for (uint256 i = 0; i < leaderboardPlayers.length; i++) {
            if (leaderboardPlayers[i] != player && leaderboard[leaderboardPlayers[i]] > playerWins) {
                rank++;
            }
        }
        return rank;
    }

    // Get top N players from the leaderboard
    function getTopPlayers(uint256 n) external view returns (
        address[] memory players,
        uint256[] memory wins
    ) {
        uint256 length = leaderboardPlayers.length;
        if (n > length) {
            n = length;
        }

        players = new address[](n);
        wins = new uint256[](n);
        
        // Create a memory array of indices for sorting
        uint256[] memory indices = new uint256[](length);
        for (uint256 i = 0; i < length; i++) {
            indices[i] = i;
        }

        // Sort indices based on win counts (bubble sort)
        for (uint256 i = 0; i < n; i++) {
            for (uint256 j = i + 1; j < length; j++) {
                if (leaderboard[leaderboardPlayers[indices[i]]] < leaderboard[leaderboardPlayers[indices[j]]]) {
                    (indices[i], indices[j]) = (indices[j], indices[i]);
                }
            }
            players[i] = leaderboardPlayers[indices[i]];
            wins[i] = leaderboard[players[i]];
        }

        return (players, wins);
    }

    // Get total number of players on leaderboard
    function getTotalLeaderboardPlayers() external view returns (uint256) {
        return leaderboardPlayers.length;
    }

    /// @notice Get overall stats for a player
    function getUserStats(address player) external view returns (
        uint256 totalGames,
        uint256 totalWins,
        uint256 rank
    ) {
        totalGames = playerRooms[player].length;
        totalWins = leaderboard[player];

        uint256 playerWins = totalWins;
        if (playerWins == 0) {
            rank = 0;
        } else {
            rank = 1;
            for (uint256 i = 0; i < leaderboardPlayers.length; i++) {
                if (leaderboardPlayers[i] != player && leaderboard[leaderboardPlayers[i]] > playerWins) {
                    rank++;
                }
            }
        }
    }

    /// @notice Get all room ids a player has participated in
    function getUserRooms(address player) external view returns (uint256[] memory) {
        return playerRooms[player];
    }
}
