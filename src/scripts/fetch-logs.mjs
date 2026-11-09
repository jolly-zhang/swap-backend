import { createRequire } from 'module';
import { createPublicClient, formatUnits, http, parseAbiItem } from 'viem';
import dotenv from 'dotenv';
import { mainnet } from 'viem/chains';

const require = createRequire(import.meta.url);
const { pool } = require('../db.js');

dotenv.config();

const USDC = '0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48';
const WETH = '0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2';

const client = createPublicClient({
  chain: mainnet,
  transport: http(process.env.RPC_URL, { timeout: 30_000 }),
});

const POOL_ADDRESS = process.env.LOG_ADDRESS;

const swapEvent = parseAbiItem(
  'event Swap(address indexed sender, address indexed recipient, int256 amount0, int256 amount1, uint160 sqrtPriceX96, uint128 liquidity, int24 tick)'
);
const mintEvent = parseAbiItem(
  'event Mint(address sender, address indexed owner, int24 indexed tickLower, int24 indexed tickUpper, uint128 amount, uint256 amount0, uint256 amount1)'
);
const burnEvent = parseAbiItem(
  'event Burn(address indexed owner, int24 indexed tickLower, int24 indexed tickUpper, uint128 amount, uint256 amount0, uint256 amount1)'
);

const poolAbi = [
  {
    name: 'token0',
    type: 'function',
    stateMutability: 'view',
    inputs: [],
    outputs: [{ type: 'address' }],
  },
  {
    name: 'token1',
    type: 'function',
    stateMutability: 'view',
    inputs: [],
    outputs: [{ type: 'address' }],
  },
  {
    name: 'slot0',
    type: 'function',
    stateMutability: 'view',
    inputs: [],
    outputs: [
      { name: 'sqrtPriceX96', type: 'uint160' },
      { name: 'tick', type: 'int24' },
      { name: 'observationIndex', type: 'uint16' },
      { name: 'observationCardinality', type: 'uint16' },
      { name: 'observationCardinalityNext', type: 'uint16' },
      { name: 'feeProtocol', type: 'uint8' },
      { name: 'unlocked', type: 'bool' },
    ],
  },
  {
    name: 'fee',
    type: 'function',
    stateMutability: 'view',
    inputs: [],
    outputs: [{ type: 'uint24' }],
  },
];

function abs(value) {
  return value < 0n ? -value : value;
}

function ethPriceUsd(sqrtPriceX96, token0) {
  const squared = sqrtPriceX96 * sqrtPriceX96;
  if (squared === 0n) return 0;
  const q192 = 2n ** 192n;
  const wethIsToken0 = token0 === WETH;
  const scaled = wethIsToken0
    ? (squared * 10n ** 12n * 1_000_000n) / q192
    : (10n ** 12n * q192 * 1_000_000n) / squared;
  return Number(scaled) / 1_000_000;
}

function amountsFromLog(log, token0) {
  const amount0 = log.args.amount0;
  const amount1 = log.args.amount1;
  const ethRaw = token0 === WETH ? amount0 : amount1;
  const usdcRaw = token0 === USDC ? amount0 : amount1;
  return { ethRaw, usdcRaw };
}

function normalizeLog(log, token0) {
  const { ethRaw } = amountsFromLog(log, token0);

  if (log.eventName === 'Swap') {
    return {
      type: ethRaw < 0n ? 'buy' : 'sell',
      wallet: log.args.recipient,
    };
  }

  return {
    type: log.eventName === 'Mint' ? 'mint' : 'burn',
    wallet: log.args.owner,
  };
}

const SYNC_NAME = 'pool_logs';
let syncing = false;

async function readCursor() {
  const { rows } = await pool.query(
    'SELECT last_synced_block FROM sync_state WHERE name = $1',
    [SYNC_NAME]
  );
  return rows[0] ? BigInt(rows[0].last_synced_block) : null;
}

async function saveRange(fromBlock, toBlock, token0, ethPrice, feePips) {
  const logs = await client.getLogs({
    address: POOL_ADDRESS,
    events: [swapEvent, mintEvent, burnEvent],
    fromBlock,
    toBlock,
  });
  const blockNumbers = [...new Set(logs.map((log) => log.blockNumber))];
  const blocks = await Promise.all(
    blockNumbers.map((blockNumber) => client.getBlock({ blockNumber }))
  );
  const timestampByBlock = new Map(
    blocks.map((block) => [block.number, Number(block.timestamp)])
  );

  const db = await pool.connect();
  try {
    await db.query('BEGIN');
    for (const log of logs) {
      const row = normalizeLog(log, token0);
      const { ethRaw, usdcRaw } = amountsFromLog(log, token0);
      const eth = Number(formatUnits(abs(ethRaw), 18));
      const usdc = Number(formatUnits(abs(usdcRaw), 6));
      const usd = log.eventName === 'Swap' ? usdc : usdc + eth * ethPrice;
      const feeUsd = log.eventName === 'Swap' ? (usd * Number(feePips)) / 1_000_000 : 0;
      await db.query(
        `INSERT INTO pool_transactions
           (tx_hash, log_index, block_number, timestamp, type, wallet,
            amount_eth, amount_usdc, amount_usd, fee_usd)
         VALUES ($1,$2,$3,to_timestamp($4),$5,$6,$7,$8,$9,$10)
         ON CONFLICT (tx_hash, log_index) DO NOTHING`,
        [
          log.transactionHash,
          log.logIndex,
          log.blockNumber.toString(),
          timestampByBlock.get(log.blockNumber),
          row.type,
          String(row.wallet).toLowerCase(),
          eth,
          usdc,
          usd,
          feeUsd,
        ]
      );
    }
    await db.query(
      `INSERT INTO sync_state (name, last_synced_block)
       VALUES ($1, $2)
       ON CONFLICT (name) DO UPDATE
       SET last_synced_block = EXCLUDED.last_synced_block,
           updated_at = now()`,
      [SYNC_NAME, toBlock.toString()]
    );
    await db.query('COMMIT');
  } catch (error) {
    await db.query('ROLLBACK');
    throw error;
  } finally {
    db.release();
  }
  return logs.length;
}

async function syncOnce() {
  const [token0, slot0, feePips, latest] = await Promise.all([
    client.readContract({ address: POOL_ADDRESS, abi: poolAbi, functionName: 'token0' }),
    client.readContract({ address: POOL_ADDRESS, abi: poolAbi, functionName: 'slot0' }),
    client.readContract({ address: POOL_ADDRESS, abi: poolAbi, functionName: 'fee' }),
    client.getBlockNumber(),
  ]);
  const token0Address = token0.toLowerCase();
  const ethPrice = ethPriceUsd(slot0[0], token0Address);
  let cursor = await readCursor();
  if (cursor === null) {
    cursor = latest - 1n;
  }
  if (latest <= cursor) {
    console.log(`没有新区块，停在 ${cursor}`);
    return;
  }

  let from = cursor + 1n;
  while (from <= latest) {
    const to = from + 19n > latest ? latest : from + 19n;
    const count = await saveRange(from, to, token0Address, ethPrice, feePips);
    console.log(`已同步 ${from} 到 ${to}，写入 ${count} 条`);
    from = to + 1n;
  }
}

async function startSync() {
  console.log('开始跟随新区块，每 6 秒检查一次');
  const tick = async () => {
    if (syncing) return;
    syncing = true;
    try {
      await syncOnce();
    } catch (error) {
      console.error('❌ 同步失败:', error.shortMessage || error.message);
      console.error(error.details);
      console.error(error.cause);
    } finally {
      syncing = false;
    }
  };
  await tick();
  setInterval(tick, 6000);
}

startSync();
