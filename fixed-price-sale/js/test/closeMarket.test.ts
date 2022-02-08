import test from 'tape';
import {
  mintNFT,
  createStore,
  createPrerequisites,
  initSellingResource,
  createMarket,
} from './actions';
import {
  assertConfirmedTransaction,
  assertError,
  defaultSendOptions,
} from '@metaplex-foundation/amman';
import { killStuckProcess, logDebug, sleep } from './utils';
import { closeMarket } from './transactions';

killStuckProcess();

test('close-market: success', async (t) => {
  const { payer, connection, transactionHandler } = await createPrerequisites();

  const store = await createStore({
    test: t,
    transactionHandler,
    payer,
    connection,
    params: {
      name: 'Store',
      description: 'Description',
    },
  });

  const { sellingResource } = await initSellingResource({
    test: t,
    transactionHandler,
    payer,
    connection,
    store: store.publicKey,
    maxSupply: 100,
  });

  const { mint: treasuryMint } = await mintNFT({
    transactionHandler,
    payer,
    connection,
  });

  const startDate = Math.round(Date.now() / 1000) + 2;
  const params = {
    name: 'Market',
    description: '',
    startDate,
    endDate: null,
    mutable: true,
    price: 1,
    piecesInOneWallet: 1,
  };

  const { market } = await createMarket({
    test: t,
    transactionHandler,
    payer,
    connection,
    store: store.publicKey,
    sellingResource: sellingResource.publicKey,
    treasuryMint: treasuryMint.publicKey,
    params,
  });

  await sleep(3000);

  const marketTx = await closeMarket({
    transactionHandler,
    payer,
    connection,
    market,
  });

  const MarketRes = await transactionHandler.sendAndConfirmTransaction(
    marketTx,
    [payer],
    defaultSendOptions,
  );

  logDebug(`market: ${market.publicKey}`);
  assertConfirmedTransaction(t, MarketRes.txConfirmed);
});

test('close-market: should fail when the market has the specific endDate', async (t) => {
  const { payer, connection, transactionHandler } = await createPrerequisites();

  const store = await createStore({
    test: t,
    transactionHandler,
    payer,
    connection,
    params: {
      name: 'Store',
      description: 'Description',
    },
  });

  const { sellingResource } = await initSellingResource({
    test: t,
    transactionHandler,
    payer,
    connection,
    store: store.publicKey,
    maxSupply: 100,
  });

  const { mint: treasuryMint } = await mintNFT({
    transactionHandler,
    payer,
    connection,
  });

  const startDate = Math.round(Date.now() / 1000) + 2;
  const params = {
    name: 'Market',
    description: '',
    startDate,
    endDate: startDate + 4000,
    mutable: true,
    price: 1,
    piecesInOneWallet: 1,
  };

  const { market } = await createMarket({
    test: t,
    transactionHandler,
    payer,
    connection,
    store: store.publicKey,
    sellingResource: sellingResource.publicKey,
    treasuryMint: treasuryMint.publicKey,
    params,
  });

  await sleep(3000);

  const marketTx = await closeMarket({
    transactionHandler,
    payer,
    connection,
    market,
  });

  logDebug(`market: ${market.publicKey}`);

  try {
    await transactionHandler.sendAndConfirmTransaction(marketTx, [payer], defaultSendOptions);
  } catch (error) {
    logDebug('expected transaction to fail due to limited market duration ');
    assertError(t, error, [/0x1782/i]);
  }
});
