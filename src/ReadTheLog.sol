// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

contract DataLogger {
    // 定义事件把数据写进链上
    event DataLogged(address indexed shender, string data);

    // 转账函数
    function sendEther(
        address payable recipient, // 收款地址
        string memory data // 附加数据
    ) public payable {
        recipient.transfer(msg.value);
        // 检查 data 是否为空
        emit DataLogged(msg.sender, data);
    }
}
