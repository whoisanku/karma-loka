// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/metatx/ERC2771Forwarder.sol";

/**
 * @title MyForwarder
 * @dev This is a custom trusted forwarder for the SnakeLadderGame dApp.
 * It inherits from OpenZeppelin's ERC2771Forwarder.
 */
contract MyForwarder is ERC2771Forwarder {
    constructor() ERC2771Forwarder("SnakeLadderGame") {}
}
