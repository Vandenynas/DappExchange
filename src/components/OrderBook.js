import React, { Component } from 'react';
import { connect } from 'react-redux';
import { OverlayTrigger, Tooltip } from 'react-bootstrap';
import Spinner from './Spinner'
import {
    orderBookSelector,
    orderBookLoadedSelector,
    web3Selector,
    exchangeSelector,
    tokenSelector,
    accountSelector,
    orderFillingSelector
} from '../store/selectors';
import { fillOrder } from '../store/interactions';

const renderOrder = (order, props) => {
    const { dispatch, web3, exchange, token, account } = props;
    return (
        <OverlayTrigger
            key={order.id}
            placement='auto'
            overlay={
                <Tooltip id={order.id}>
                    {`Click here to ${order.orderFillAction}`}
                </Tooltip>
            }
        >
            <tr key={order.id}
                className="order-book-order"
                onClick={(e) => {
                    fillOrder(dispatch, web3, exchange, token, order, account)
                }
                }
            >
                <td>{order.tokenAmount}</td>
                <td className={`text-${order.orderTypeClass}`}>{order.tokenPrice}</td>
                <td>{order.etherAmount}</td>
            </tr>
        </OverlayTrigger>
    )
}

const showOrderBook = (props) => {
    const {orderBook} = props;
    return(
        <tbody>
            <tr>
                <th>Asks</th>
            </tr>
            {orderBook.sellOrders.map((order) => renderOrder(order, props))}
            <tr>
                <th>DLP Qty</th>
                <th>DLP/ETH</th>
                <th>ETH Qty</th>
            </tr>
            <tr>
                <th>Bids</th>
            </tr>
            {orderBook.buyOrders.map((order) => renderOrder(order, props))}
        </tbody>
    )
}

class OrderBook extends Component {
    render() {
        return (
            <div className="card bg-dark text-white">
                <OverlayTrigger
                    placement='auto'
                    overlay={
                        <Tooltip>
                            {`Here you can see the current active limit orders. Click on the lowest ask to buy at cheapest price or the highest bid to sell at the highest price`}
                        </Tooltip>
                    }
                >
                    <div className="card-header">
                        Order Book
                    </div>
                </OverlayTrigger>

                <div className="card-body order-book">
                    <table className="table table-dark table-sm small">
                        {this.props.showOrderBook ? showOrderBook(this.props) : <Spinner type='table' />}
                    </table>
                </div>
            </div>
        )
    }
}

function mapStateToProps(state) {
    const orderBookLoaded = orderBookLoadedSelector(state);
    const orderFilling = orderFillingSelector(state);

    return {
        orderBook: orderBookSelector(state),
        showOrderBook: orderBookLoaded && !orderFilling,
        web3: web3Selector(state),
        exchange: exchangeSelector(state),
        token: tokenSelector(state),
        account: accountSelector(state)
    }
}

export default connect(mapStateToProps)(OrderBook);