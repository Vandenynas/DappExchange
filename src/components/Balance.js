import React, { Component } from 'react';
import { connect } from 'react-redux';
import Spinner from './Spinner';
import { Tabs, Tab, OverlayTrigger, Tooltip} from 'react-bootstrap';
import { 
    loadBalances,
    depositEther,
    withdrawEther,
    depositToken,
    withdrawToken
} from '../store/interactions';
import {
    balancesLoadingSelector,
    web3Selector,
    tokenSelector,
    accountSelector,
    exchangeSelector,
    etherBalanceSelector,
    tokenBalanceSelector,
    exchangeEtherBalanceSelector,
    exchangeTokenBalanceSelector,
    etherDepositAmountSelector,
    etherWithdrawAmountSelector,
    tokenDepositAmountSelector,
    tokenWithdrawAmountSelector
} from '../store/selectors';
import { 
    etherDepositAmountChanged,
    etherWithdrawAmountChanged,
    tokenDepositAmountChanged,
    tokenWithdrawAmountChanged
} from '../store/actions';

import {dappNetwork} from '../helpers'

const createForm = (name, placeholder, amount, interaction, action, props, token) => {
    const {
        dispatch,
        exchange,
        web3,
        account
    } = props;
    return(
        <form className="row" onSubmit={(event) => {
            event.preventDefault();
            if(token === undefined) {
                interaction(dispatch, exchange, web3, amount, account);
            } else {
                interaction(dispatch, exchange, web3, token, amount, account);
            }
        }}>
            <div className="col-12 col-sm pr-sm-2">
                <input 
                type="text"
                placeholder={`${placeholder}`}
                onChange={(e) => dispatch(action(e.target.value))}
                className="form-control form-control-sm bg-dark text-white"
                required
                />
            </div>
            <div className="col-12 col-sm-auto pl-sm-0">
                <button type="submit" className="btn btn-secondary btn-block btn-sm">{name}</button>
            </div>
        </form>
    )

}

const showForm = (props) => {
    const {
        etherBalance,
        tokenBalance,
        exchangeEtherBalance,
        exchangeTokenBalance,
        token,
        etherDepositAmount,
        etherWithdrawAmount,
        tokenDepositAmount,
        tokenWithdrawAmount,
    } = props;
    return(
        <Tabs defaultActiveKey="deposit" className="bg-dark text-white">
            <Tab eventKey="deposit" title="Deposit" className="bg-dark">
                <table className="table table-dark table-sm small">
                    <thead>
                        <tr>
                            <th>Coin</th>
                            <th>Wallet</th>
                            <th>Exchange</th>
                        </tr>
                    </thead>
                    <tbody>
                        <tr>
                            <td style={{width:"30%"}}>ETH</td>
                            <td style={{width:"35%"}}>{etherBalance}</td>
                            <td style={{width:"35%"}}>{exchangeEtherBalance}</td>
                        </tr>
                    </tbody>
                </table>
                {createForm("Deposit", "ETH Amount", etherDepositAmount, depositEther, etherDepositAmountChanged, props)}
                <table className="table table-dark table-sm small">
                    <tbody>
                        <tr>
                            <td style={{width:"30%"}}>DLP</td>
                            <td style={{width:"35%"}}>{tokenBalance}</td>
                            <td style={{width:"35%"}}>{exchangeTokenBalance}</td>
                        </tr>
                    </tbody>
                </table>
                {createForm("Deposit", "DLP token Amount", tokenDepositAmount, depositToken, tokenDepositAmountChanged, props, token)}
            </Tab>
            <Tab eventKey="whitdraw" title="Withdraw" className="bg-dark">
                <table className="table table-dark table-sm small">
                    <thead>
                        <tr>
                            <th>Coin</th>
                            <th>Wallet</th>
                            <th>Exchange</th>
                        </tr>
                    </thead>
                    <tbody>
                        <tr>
                            <td style={{width:"30%"}}>ETH</td>
                            <td style={{width:"35%"}}>{etherBalance}</td>
                            <td style={{width:"35%"}}>{exchangeEtherBalance}</td>
                        </tr>
                    </tbody>
                </table>
                {createForm("Withdraw", "ETH Amount", etherWithdrawAmount, withdrawEther, etherWithdrawAmountChanged, props)}
                <table className="table table-dark table-sm small">
                    <tbody>
                        <tr>
                            <td style={{width:"30%"}}>DLP</td>
                            <td style={{width:"35%"}}>{tokenBalance}</td>
                            <td style={{width:"35%"}}>{exchangeTokenBalance}</td>
                        </tr>
                    </tbody>
                </table>
                {createForm("Withdraw", "DLP Token Amount", tokenWithdrawAmount, withdrawToken, tokenWithdrawAmountChanged, props, token)}
            </Tab>
        </Tabs>
    )
}

class Balance extends Component {
    componentDidMount() {
        this.loadBlockchainData();
    }
    async loadBlockchainData() {
        const { dispatch, web3, exchange, token, account } = this.props;
        const networkVersion = await window.ethereum.networkVersion;
        if (networkVersion === dappNetwork) {
            await loadBalances(dispatch, web3, exchange, token, account);
        }
    }

    render() {
        return (
            <div className="card bg-dark text-white">
                <OverlayTrigger
                    placement='auto'
                    overlay={
                        <Tooltip>
                            {`In order to start trading DLP token you need to first deposit some ETH on the exchange`}
                        </Tooltip>
                    }
                >
                    <div className="card-header">
                        Balance
                    </div>
                </OverlayTrigger>
                <div className="card-body">
                    {this.props.showForm ? showForm(this.props) : <Spinner />}
                </div>
            </div>
        )
    }
}

function mapStateToProps(state) {
    const balancesLoading = balancesLoadingSelector(state);
    return {
        account: accountSelector(state),
        exchange: exchangeSelector(state),
        token: tokenSelector(state),
        web3: web3Selector(state),
        etherBalance: etherBalanceSelector(state),
        tokenBalance: tokenBalanceSelector(state),
        exchangeEtherBalance: exchangeEtherBalanceSelector(state),
        exchangeTokenBalance: exchangeTokenBalanceSelector(state),
        etherDepositAmount: etherDepositAmountSelector(state),
        etherWithdrawAmount: etherWithdrawAmountSelector(state),
        tokenDepositAmount: tokenDepositAmountSelector(state),
        tokenWithdrawAmount: tokenWithdrawAmountSelector(state),
        balancesLoading,
        showForm: !balancesLoading
    }
}

export default connect(mapStateToProps)(Balance);