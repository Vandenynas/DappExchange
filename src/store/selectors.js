import { get, groupBy, reject, maxBy, minBy } from 'lodash';
import { createSelector } from 'reselect';
import { ETHER_ADDRESS, RED, GREEN, tokens, ether, formatBalance} from '../helpers';
import moment from 'moment';

const web3 = state => get(state, 'web3.connection');
export const web3Selector = createSelector(web3, wb => wb);

const navigation = state => get(state, 'navigation.showApp');
export const navigationSelector = createSelector(navigation, nv => nv);

const account = state => get(state, 'web3.account');
export const accountSelector = createSelector(account, a => a);

const tokenLoaded = state => get(state, 'token.loaded', false);
export const tokenLoadedSelector = createSelector(tokenLoaded, tl => tl);

const token = state => get(state, 'token.contract', false);
export const tokenSelector = createSelector(token, tok => tok);

const exchangeLoaded = state => get(state, 'exchange.loaded', false);
export const exchangeLoadedSelector = createSelector(exchangeLoaded, el => el);

const exchange = state => get(state, 'exchange.contract', false);
export const exchangeSelector = createSelector(exchange, exc => exc);

export const contractsLoadedSelector = createSelector(
    tokenLoaded,
    exchangeLoaded,
    (tl, el) => (tl && el)
);

// All Orders
const allOrdersLoaded = state => get(state, 'exchange.allOrders.loaded', false);
const allOrders = state => get(state, 'exchange.allOrders.data', []);

// Cancelled Orders
const cancelledOrdersLoaded = state => get(state, 'exchange.cancelledOrders.loaded', false);
export const cancelledOrdersLoadedSelector = createSelector(cancelledOrdersLoaded, loaded => loaded);

const cancelledOrders = state => get(state, 'exchange.cancelledOrders.data', []);
export const cancelledOrdersSelector = createSelector(cancelledOrders, o => o);

// Filled Orders
const filledOrdersLoaded = state => get(state, 'exchange.filledOrders.loaded', false);
export const filledOrdersLoadedSelector = createSelector(filledOrdersLoaded, loaded => loaded);

const filledOrders = state => get(state, 'exchange.filledOrders.data', []);
export const filledOrdersSelector = createSelector(
    filledOrders,
    (orders) => {
        // Sort orders by date asceding for price comparison
        orders = orders.sort((a,b) => a.timestamp - b.timestamp);
        // Decorate the orders
        orders = decorateFilledOrders(orders);

        // Sorts orders by timestamp
        orders = orders.sort((a,b) => b.timestamp - a.timestamp);
        return orders;
    }
)

const decorateFilledOrders = (orders) => {
    let previousOrder = orders[0];
    return(
        orders.map((order) => {
            order  = decorateOrder(order);
            order = decorateFilledOrder(order, previousOrder);
            previousOrder = order // Update the previous order once it's decorated
            return order;
        })
    )
}

const decorateOrder = (order) => {
    let etherAmount;
    let tokenAmount;
    // if tokenGive
    if(order.tokenGive === ETHER_ADDRESS) {
        etherAmount = order.amountGive;
        tokenAmount = order.amountGet;
    } else {
        etherAmount = order.amountGet;
        tokenAmount = order.amountGive;
    }

    // Calculate token price to 5 decimal places
    const precision = 100000;
    let tokenPrice = (etherAmount / tokenAmount);
    tokenPrice = Math.round(tokenPrice * precision) / precision;

    return({
        ...order,
        etherAmount: ether(etherAmount),
        tokenAmount: tokens(tokenAmount),
        tokenPrice,
        formattedTimestamp: moment.unix(order.timestamp).format('YYYY-MM-DD HH:mm:ss')
    })
}

const decorateFilledOrder = (order, previousOrder) => {
    return({
        ...order,
        tokenPriceClass: tokenPriceClass(order.tokenPrice, order.id, previousOrder)
    });
}

const tokenPriceClass = (tokenPrice, orderId, previousOrder) => {
    // Show green price if only on order exists
    if(previousOrder.id === orderId) {
        return GREEN;
    }
    // Show green price if order price higher than previous order
    // Show red price if order price lower than previous order
    if(previousOrder.tokenPrice <= tokenPrice) {
        return GREEN; // Success
    } else {
        return RED; // Danger
    }
}

const openOrders = state => {
    const all = allOrders(state);
    const filled = filledOrders(state);
    const cancelled = cancelledOrders(state);

    const openOrders = reject(all, (order) => {  // Using the reject function from lodash
        const orderFilled = filled.some((o) => o.id === order.id);
        const orderCancelled = cancelled.some((o) => o.id === order.id);
        return(orderFilled || orderCancelled);
    });

    return openOrders;
}

const orderBookLoaded = state => cancelledOrdersLoaded(state) && filledOrdersLoaded(state) && allOrdersLoaded(state);
export const orderBookLoadedSelector = createSelector(orderBookLoaded, loaded => loaded);

// Create order book
export const orderBookSelector = createSelector(
    openOrders,
    (orders) => {
        // Decorate orders
        orders = decorateOrderBookOrders(orders);
        // Group orders by "Order type"
        orders = groupBy(orders, 'orderType');
        // Fetch buy orders
        const buyOrders = get(orders, 'buy', []);
        // Sort buy orders by token price
        orders = {
            ...orders,
            buyOrders: buyOrders.sort((a, b) => b.tokenPrice - a.tokenPrice)
        }
        // Fetch sell orders
        const sellOrders = get(orders, 'sell', []);
        // Sort sell orders by token price
        orders = {
            ...orders,
            sellOrders: sellOrders.sort((a, b) => b.tokenPrice - a.tokenPrice)
        }
        return orders;
    }
);

const decorateOrderBookOrders = (orders) => {
    return(
        orders.map((order) => {
            order = decorateOrder(order);
            order = decorateOrderBookOrder(order);
            return(order);
        })
    );
}

const decorateOrderBookOrder = (order) => {
    const orderType = order.tokenGive === ETHER_ADDRESS ? 'buy' : 'sell';
    return({
        ...order,
        orderType,
        orderTypeClass: (orderType === 'buy' ? GREEN : RED),
        orderFillAction: (orderType === 'buy' ? 'sell' : 'buy')
    });
}

export const myFilledOrdersLoadedSelector = createSelector(filledOrdersLoaded, loaded => loaded);
export const myFilledOrdersSelector = createSelector(
    account,
    filledOrders,
    (account, orders) => {
        // Find our orders
        orders = orders.filter((o) => o.user === account || o.userFill === account);
        // Sort by date ascending
        orders = orders.sort((a, b) => a.timestamp - b.timestamp);
        // Decorate orders - add display attributes
        orders = decorateMyFilledOrders(orders, account);
        return orders;
    }
);

const decorateMyFilledOrders = (orders, account) => {
    return(
        orders.map((order) => {
            order = decorateOrder(order);
            order = decorateMyFilledOrder(order, account);
            return(order);
        })
    );
}

const decorateMyFilledOrder = (order, account) => {
    const myOrder = order.user === account;

    let orderType;
    if(myOrder) {
        orderType = order.tokenGive === ETHER_ADDRESS ? 'buy' : 'sell';
    } else {
        orderType = order.tokenGive === ETHER_ADDRESS ? 'sell' : 'buy';
    }
    return({
        ...order,
        orderType,
        orderTypeClass: (orderType === 'buy' ? GREEN : RED),
        orderSign: (orderType === 'buy' ? '+' : '-')
    });
}

export const myOpenOrdersLoadedSelector = createSelector(orderBookLoaded, loaded => loaded);
export const myOpenOrdersSelector = createSelector(
    account,
    openOrders,
    (account, orders) => {
        // Filter orders created by current account
        orders = orders.filter((o) => o.user === account);
        // Decorate orders - add display attributes
        orders = decorateMyOpenOrders(orders);
        // Sort orders by date descending
        orders = orders.sort((a, b) => b.timestamp - a.timestamp);
        return orders;
    }
)

const decorateMyOpenOrders = (orders) => {
    return(
        orders.map((order) => {
            order = decorateOrder(order);
            order = decorateMyOpenOrder(order, account);
            return(order);
        })
    );
}

const decorateMyOpenOrder = (order, account) => {
    let orderType = order.tokenGive === ETHER_ADDRESS ? 'buy' : 'sell';

    return({
        ...order,
        orderType,
        orderTypeClass: (orderType === 'buy' ? GREEN : RED),
    });
}

export const priceChartLoadedSelector = createSelector(filledOrdersLoaded, loaded => loaded);

export const priceChartSelector = createSelector(
    filledOrders,
    (orders) => {
        // Sort by date ascending to compare history
        orders = orders.sort((a, b) => a.timestamp - b.timestamp);
        // Decorate orders - add display attributes
        orders = orders.map((o) => decorateOrder(o));
        // Get last 2 orders for final price & price change
        let secondLastOrder, lastOrder;
        [secondLastOrder, lastOrder] = orders.slice(orders.length - 2, orders.lenth);
        // Get last order price
        const lastPrice = get(lastOrder, 'tokenPrice', 0);
        // Get second last order price
        const secondLastPrice = get(secondLastOrder, 'tokenPrice', 0);

        return({
            lastPrice,
            lastPriceChange: (lastPrice >= secondLastPrice ? '+' : '-'),
            series:[{
                data:buildGraphData(orders)
            }]
        });
    }
)

const buildGraphData = (orders) => {
    // Group the orders by hour for the graph
    orders = groupBy(orders, (o) => moment.unix(o.timestamp).startOf('hour').format());
    // Get each hour where data exists
    const hours = Object.keys(orders);
    // Build the graph series
    const graphData = hours.map((hour) => {
        // Calculate price values for open, high, low, close
        const group = orders[hour];
        // Fetch all the orders from the current hour
        const open = group[0];
        const high = maxBy(group, 'tokenPrice');
        const low = minBy(group, 'tokenPrice');
        const close = group[group.length - 1];
        return({
            x: new Date(hour),
            y:[open.tokenPrice, high.tokenPrice, low.tokenPrice, close.tokenPrice]
        });
    })
    return graphData;
}

const orderCancelling = state => get(state, 'exchange.orderCancelling', false);
export const orderCancellingSelector = createSelector(orderCancelling, status => status);

const orderFilling = state => get(state, 'exchange.orderFilling', false);
export const orderFillingSelector = createSelector(orderFilling, status => status);

//BALANCES
const tokenBalance = state => get(state, 'token.balance', 0);
export const tokenBalanceSelector = createSelector(
    tokenBalance,
    (balance) => {
        return formatBalance(balance);
    }
);

const exchangeEtherBalance = state => get(state, 'exchange.etherBalance', 0);
export const exchangeEtherBalanceSelector = createSelector(
    exchangeEtherBalance,
    (balance) => {
        return formatBalance(balance);
    }
);

const exchangeTokenBalance = state => get(state, 'exchange.tokenBalance', 0);
export const exchangeTokenBalanceSelector = createSelector(
    exchangeTokenBalance,
    (balance) => {
        return formatBalance(balance);
    }
);

const etherBalance = state => get(state, 'web3.balance', 0);
export const etherBalanceSelector = createSelector(
    etherBalance,
    (balance) => {
        return formatBalance(balance);
    }
);

const balancesLoading = state => get(state, 'exchange.balancesLoading', true);
export const balancesLoadingSelector = createSelector(balancesLoading, status => status);

const etherDepositAmount = state => get(state, 'exchange.etherDepositAmount', null);
export const etherDepositAmountSelector = createSelector(etherDepositAmount, status => status);

const etherWithdrawAmount = state => get(state, 'exchange.etherWithdrawAmount', null);
export const etherWithdrawAmountSelector = createSelector(etherWithdrawAmount, status => status);

const tokenDepositAmount = state => get(state, 'exchange.tokenDepositAmount', null);
export const tokenDepositAmountSelector = createSelector(tokenDepositAmount, status => status);

const tokenWithdrawAmount = state => get(state, 'exchange.tokenWithdrawAmount', null);
export const tokenWithdrawAmountSelector = createSelector(tokenWithdrawAmount, status => status);

// New Orders
const buyOrder = state => get(state, 'exchange.buyOrder', {});
export const buyOrderSelector = createSelector(buyOrder, order => order);

const sellOrder = state => get(state, 'exchange.sellOrder', {});
export const sellOrderSelector = createSelector(sellOrder, order => order);