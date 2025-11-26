// SPDX-License-Identifier: MIT

pragma solidity ^0.8.0;

contract RedEnvelope {
    address public owner; // 红包发起人
    uint256 public totalAmount; // 红包总金额
    uint256 public numEnvelopes; // 红包个数
    uint256 public remainingEnvelopes; // 剩余红包数量
    uint256 private currentRound; // 当前红包轮次

    // 记录某个地址最后成功领取的轮次
    mapping(address => uint256) public lastClaimRound;
    event RedEnvelopeClaimed(address claimer, uint256 amount); // 抢红包时触发的事件

    // 创建红包函数
    function createRedEnvelopes(
        uint256 _totalAmount,
        uint256 _numEnvelopes
    ) public payable {
        require(msg.value == _totalAmount, "Don't play if you have no money");
        owner = msg.sender; // 合约发起人
        totalAmount = _totalAmount; // 设置红包总金额
        numEnvelopes = _numEnvelopes; // 设置红包个数
        remainingEnvelopes = _numEnvelopes; // 设置剩余红包个数，初始都是和总个数一样。
        currentRound++; // 只有在新一轮红包创建时才递增轮次
    }

    // 抢红包函数
    function claimRedEnvelope() public {
        // 判断是否还有剩余红包
        require(remainingEnvelopes > 0, "A slow hand counts.");

        // 判断当前地址是否在本轮已经领取过
        require(lastClaimRound[msg.sender] < currentRound, "Greedy little rascal");

        uint256 randomAmount;
        if (remainingEnvelopes == 1) {
            randomAmount = totalAmount;
        } else {
            // 生成一个伪随机数，范围是 [0, totalAmount]
            randomAmount =
                uint256(
                    keccak256(
                        abi.encodePacked(
                            block.timestamp,
                            block.prevrandao,
                            msg.sender
                        )
                    )
                ) %
                totalAmount;

            // 确保分配的金额不会超过剩余金额
            if (randomAmount == 0) {
                randomAmount = 1; // 避免随机数为零
            }
        }

        // 标记当前用户已经抢过红包了
        lastClaimRound[msg.sender] = currentRound;

        // 向抢红包的用户转钱
        payable(msg.sender).transfer(randomAmount);

        // 更新剩余数量
        remainingEnvelopes--;

        // 更新剩余总金额
        totalAmount -= randomAmount;

        // 触发抢红包事件
        emit RedEnvelopeClaimed(msg.sender, randomAmount);
    }

    // 查询红包当前状态函数
    function getStatus() public view returns (uint256, uint256) {
        // 返回剩余红包个数和总金额
        return (remainingEnvelopes, totalAmount);
    }

    // 查询当前用户在当前轮次是否已领过红包
    function getUserStatus(address user) public view returns (bool) {
        return lastClaimRound[user] == currentRound;
    }

    // 接收ETH的函数
    receive() external payable {}
}
