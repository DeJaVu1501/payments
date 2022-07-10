import { expect } from "chai";
import { ethers } from "hardhat";
import { Payments } from "../typechain-types";
import { Signer } from "ethers";
import {  TransactionResponse } from '@ethersproject/providers'

describe("Payment", function () {
  let owner: Signer;
  let other_addr: Signer;
  let payments: Payments;

  beforeEach(async () => {
    [owner, other_addr] = await ethers.getSigners();
    const DemoContract = await ethers.getContractFactory("Payments", owner);
    payments = await DemoContract.deploy();
    await payments.deployed();
  })

  async function sendMoney(sender: Signer): Promise<[TransactionResponse, number]> {
    const amount = 100;

    const txData = {
      to: payments.address,
      value: amount,
    }

    const tx = await sender.sendTransaction(txData);
    await tx.wait();

    return [tx, amount];
  }

  it("Should be deployed successfully", () => {
    expect(payments.address).to.be.properAddress
  })

  it("should have 0 ether by default", async () => {
    const balance = await payments.currentBalance()
    expect(balance).to.eq(0);
  })

  it("should allow to send money", async () => {
    const [sendMoneyTx, amount] = await sendMoney(other_addr);
    await expect(() => sendMoneyTx)
      .to.changeEtherBalance(payments, amount);

    const timestamp = (await ethers.provider.getBlock(sendMoneyTx.blockNumber || 0)).timestamp;
    const otherAccAddress = await other_addr.getAddress();

    await expect(sendMoneyTx).to.emit(payments, "Paid").withArgs(otherAccAddress, amount, timestamp)
  })

  it("should allow owner to withdraw money", async () => {
    const ownerAddress = await owner.getAddress();

    const [sendMoneyTx, amount] = await sendMoney(other_addr);
    const tx = await payments.withdraw(ownerAddress);

    await expect(()=> tx).to.changeEtherBalances([payments, owner], [-amount, amount]);

  })

  it("should not allow other accounts to withdraw funds", async () => {
    await sendMoney(other_addr);
    const otherAccAddress = await other_addr.getAddress();

    await expect(payments.connect(other_addr).withdraw(otherAccAddress)).to.be.revertedWith("you are not an owner!")
  })
});
