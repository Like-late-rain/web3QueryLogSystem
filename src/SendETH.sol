// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

contract SendETH {
    address constant ZERO_ADDR = 0x0000000000000000000000000000000000000000;

    function sendToZero() external payable {
        // 只负责转你发送来的 msg.value
        payable(ZERO_ADDR).transfer(msg.value);
    }

    // 允许携带数据发送 ETH
    receive() external payable {
        payable(ZERO_ADDR).transfer(msg.value);
    }

    // fallback 允许带 data 调用
    fallback() external payable {
        payable(ZERO_ADDR).transfer(msg.value);
    }
}
