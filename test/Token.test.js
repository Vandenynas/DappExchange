import {tokens, EVM_REVERT} from './helpers';

var {default : Web3} = require('web3');

var BN = web3.utils.BN;

const Token = artifacts.require('./Token');

require('chai')
    .use(require('chai-as-promised'))
    .should();

contract('Token', ([deployer, sender, receiver, exchange]) => {
    const name = 'Tic Tac Token';
    const symbol = 'TTT';
    const decimals = '18';
    const totalSupply = tokens('1000000').toString();
    let token;

    beforeEach(async () => {
        // Fetch token from Blockchain
        token = await Token.new(); // It deploys a new copy of the token to the Blockchain
    });
    
    describe('deployment', () => {
        it('tracks the name', async () => {
            // Read token name here...
            const result = await token.name();
            // The token name is Tic Tac Token
            result.should.equal(name);
        });

        it('tracks the symbol', async () => {
            const result = await token.symbol();
            result.should.equal(symbol);
        });

        it('tracks the decimals', async () => {
            const result = await token.decimals();
            result.toString().should.equal(decimals);
        });

        it('tracks the total supply', async () => {
            const result = await token.totalSupply();
            result.toString().should.equal(totalSupply.toString());
        });

        it('assigns the total supply to the deployer', async () => {
            const result = await token.balanceOf(deployer);
            result.toString().should.equal(totalSupply.toString());
        });

    });

    describe('sending tokens', () => {
        let result;
        let amount;

        describe('success', async () => {
            beforeEach(async () => {
                amount = tokens(100);//web3.utils.toWei('10', 'ether');
                // Fetch token from Blockchain
                result = await token.transfer(receiver, amount, {from: deployer}); // It deploys a new copy of the token to the Blockchain
            });
    
            it('transfers token balances', async () => {
                let balanceOf;
    
                // After transfer
                balanceOf = await token.balanceOf(receiver);
                balanceOf.toString().should.equal(amount.toString());
                balanceOf = await token.balanceOf(deployer);
                balanceOf.toString().should.equal(new BN(tokens(1000000)).sub(new BN(amount)).toString());
            });
    
            it('emits a Transfer event', async() => {
                const log = result.logs[0];
                log.event.should.equal('Transfer');
                const event = log.args;
                event.from.toString().should.equal(deployer, 'from is correct');
                event.to.toString().should.equal(receiver, 'to is correct');
                event.value.toString().should.equal(amount.toString(), 'amount is correct');
            });
        });

        describe('failure', async () => {
            it('rejects insufficient balances', async () => {
                let invalidAmount = tokens(100000000); // 100 million, greater than the total supply
                await token.transfer(receiver, invalidAmount, {from: deployer}).should.be.rejectedWith(EVM_REVERT);

                // Attempt transfer tokens, when you have none
                invalidAmount = tokens(10); // recipient has no tokens
                await token.transfer(deployer, invalidAmount, {from: receiver}).should.be.rejectedWith(EVM_REVERT);
            });

            it('rejects invalid recipients', async () => {
                await token.transfer(0x0, amount, {from: deployer}).should.be.rejected;
            });
        });
    });

    describe('approving tokens', () => {
        let result;
        let amount;

        beforeEach(async () => {
            amount = tokens(100);
            result = await token.approve(exchange, amount, {from:deployer});
        });

        describe('success', () => {
            it('allocates an allowance for delegated token spending', async () => {
                const allowance = await token.allowance(deployer, exchange);
                allowance.toString().should.equal(amount.toString());
            });

            it('emits an Approval event', async() => {
                const log = result.logs[0];
                log.event.should.equal('Approval');
                const event = log.args;
                event.owner.toString().should.equal(deployer, 'owner is correct');
                event.spender.toString().should.equal(exchange, 'spender is correct');
                event.value.toString().should.equal(amount.toString(), 'amount is correct');
            });
        });

        describe('failure', () => {
            it('rejects invalid recipients', async () => {
                await token.approve(0x0, amount, {from: deployer}).should.be.rejected;
            });
        });
    });

    describe('delegated token transfer', () => {
        let result;
        let amount;

        beforeEach(async () => {
            amount = tokens(100);
            await token.approve(exchange, amount, {from: deployer});
        })

        describe('success', async () => {
            beforeEach(async () => {
                result = await token.transferFrom(deployer, receiver, amount, {from: exchange}); // It deploys a new copy of the token to the Blockchain
            });
    
            it('transfers token balances', async () => {
                let balanceOf;
    
                // After transfer
                balanceOf = await token.balanceOf(receiver);
                balanceOf.toString().should.equal(amount.toString());
                balanceOf = await token.balanceOf(deployer);
                balanceOf.toString().should.equal(new BN(tokens(1000000)).sub(new BN(amount)).toString());
            });

            it('resets the allowance', async () => {
                const allowance = await token.allowance(deployer, exchange, {from: deployer});
                allowance.toString().should.equal('0');
            });
    
            it('emits a Transfer event', async() => {
                const log = result.logs[0];
                log.event.should.equal('Transfer');
                const event = log.args;
                event.from.toString().should.equal(deployer, 'from is correct');
                event.to.toString().should.equal(receiver, 'to is correct');
                event.value.toString().should.equal(amount.toString(), 'amount is correct');
            });
        });

        describe('failure', async () => {
            it('rejects insufficient balances', async () => {
                let invalidAmount = tokens(100000000); // 100 million, greater than the total supply
                await token.transferFrom(deployer, receiver, invalidAmount, {from: exchange}).should.be.rejectedWith(EVM_REVERT);
            });

            it('rejects invalid recipients', async () => {
                await token.transferFrom(deployer, 0x0, amount, {from: exchange}).should.be.rejected;
            });
        });
    });

    
});