// kraken_dca.js
import axios from 'axios'
import crypto from 'crypto'
import dotenv from 'dotenv'
import chalk from 'chalk'
import readline from 'readline/promises'
import { stdin as input, stdout as output } from 'process'
dotenv.config()

// Configuration
const BTC_AMOUNT_EUR = parseInt(process.env.BTC_AMOUNT_EUR) || 0
const SOL_AMOUNT_EUR = parseInt(process.env.SOL_AMOUNT_EUR) || 0
const TOTAL_ORDER_AMOUNT = BTC_AMOUNT_EUR + SOL_AMOUNT_EUR

const API_KEY = process.env.KRAKEN_API_KEY
const API_SECRET = process.env.KRAKEN_API_SECRET
const API_URL = 'https://api.kraken.com'

function getKrakenSignature (path, request, nonce, secret) {
  const message = new URLSearchParams(request).toString()
  const secretBuffer = Buffer.from(secret, 'base64')
  const hash = crypto.createHash('sha256')
  const hashDigest = hash.update(nonce + message).digest()
  const hmac = crypto.createHmac('sha512', secretBuffer)
  const hmacDigest = hmac.update(Buffer.concat([Buffer.from(path), hashDigest])).digest('base64')
  return hmacDigest
}

async function getBalance () {
  const path = '/0/private/Balance'
  const nonce = Date.now() * 1000
  const body = { nonce: nonce.toString() }
  const signature = getKrakenSignature(
    path,
    body,
    nonce.toString(),
    API_SECRET
  )

  const headers = {
    'API-Key': API_KEY,
    'API-Sign': signature,
    'Content-Type': 'application/x-www-form-urlencoded'
  }

  try {
    const response = await axios.post(
      `${API_URL}${path}`,
      new URLSearchParams(body),
      {
        headers
      }
    )

    if (response.data.error && response.data.error.length > 0) {
      console.error('❌ Kraken API Error:', response.data.error)
      return null
    }

    return response.data.result
  } catch (error) {
    console.error('🚨 Axios Error:', error.response
      ? {
          status: error.response.status,
          statusText: error.response.statusText,
          data: error.response.data
        }
      : error.message)
    return null
  }
}

async function getMarketPrice (pair) {
  const response = await axios.get(`${API_URL}/0/public/Ticker?pair=${pair}`)
  const ask = parseFloat(
    response.data.result[Object.keys(response.data.result)[0]].a[0]
  )
  return ask
}

async function buyMarketForFiat (pair, eurAmount) {
  const price = await getMarketPrice(pair)
  const volume = (eurAmount / price).toFixed(8) // 8 decimals is usually safe
  console.log(`Price for ${pair}: €${price}, buying volume: ${volume}`)
  return await placeMarketOrder(pair, volume)
}

async function placeMarketOrder (pair, volume) {
  const path = '/0/private/AddOrder'
  const nonce = Date.now() * 1000
  const body = {
    nonce: nonce.toString(),
    pair,
    type: 'buy',
    ordertype: 'market',
    volume: volume.toString()
  }

  const signature = getKrakenSignature(
    path,
    body,
    nonce.toString(),
    API_SECRET
  )
  const headers = {
    'API-Key': API_KEY,
    'API-Sign': signature,
    'Content-Type': 'application/x-www-form-urlencoded'
  }

  const response = await axios.post(
    `${API_URL}${path}`,
    new URLSearchParams(body),
    {
      headers
    }
  )
  return response.data
}

async function testApiKey () {
  const path = '/0/private/Balance'
  const nonce = Date.now() * 1000
  const body = { nonce: nonce.toString() }
  const signature = getKrakenSignature(
    path,
    body,
    nonce.toString(),
    API_SECRET
  )

  const headers = {
    'API-Key': API_KEY,
    'API-Sign': signature,
    'Content-Type': 'application/x-www-form-urlencoded'
  }

  try {
    const response = await axios.post(
      `${API_URL}${path}`,
      new URLSearchParams(body),
      {
        headers
      }
    )

    if (response.data.error && response.data.error.length > 0) {
      console.error('❌ Kraken API Error:', response.data.error)
      return false
    }

    return true
  } catch (error) {
    console.error('🚨 Axios Error:', error.response
      ? {
          status: error.response.status,
          statusText: error.response.statusText,
          data: error.response.data
        }
      : error.message)
    return false
  }
}

(async () => {
  try {
    // Fetch and log current prices with error handling
    const pairs = [
      { name: 'SOL/USD', pair: 'SOLUSD' },
      { name: 'SOL/EUR', pair: 'SOLEUR' },
      { name: 'BTC/USD', pair: 'XBTUSD' },
      { name: 'BTC/EUR', pair: 'XBTEUR' }
    ];
    const prices = {};
    for (const { name, pair } of pairs) {
      try {
        prices[name] = await getMarketPrice(pair);
        if (typeof prices[name] !== 'number' || isNaN(prices[name])) {
          throw new Error('Price is not a number');
        }
      } catch (err) {
        console.error(chalk.red(`❌ Failed to fetch price for ${name} (${pair}):`), err.message || err);
        return;
      }
    }
    // Group and print market prices by asset
    console.log(chalk.bold.cyan('--- Current Market Prices ---'));
    console.log(chalk.yellow(`SOL: $${prices['SOL/USD']} / €${prices['SOL/EUR']}`));
    console.log(chalk.yellow(`BTC: $${prices['BTC/USD']} / €${prices['BTC/EUR']}`));

    // Test API key first
    const apiKeyValid = await testApiKey()
    if (!apiKeyValid) {
      console.log(chalk.red('❌ API key test failed. Please check your credentials and permissions.'))
      return
    }
        
    const balance = await getBalance()
    
    if (!balance) {
      console.log(chalk.red('❌ Failed to get balance. Exiting.'))
      return
    }
    
    // Format and print current balance like market prices
    console.log(chalk.bold.cyan('--- Current Balance ---'));
    Object.entries(balance).forEach(([asset, amount]) => {
      if (parseFloat(amount) > 0) {
        console.log(chalk.yellow(`${asset}: ${amount}`));
      }
    });

    // Calculate portfolio value
    const btc = parseFloat(balance.XXBT || balance.XBT || '0')
    const sol = parseFloat(balance.SOL || '0')
    let eur = parseFloat(balance.ZEUR || '0')
    const btcValueEur = btc * prices['BTC/EUR']
    const solValueEur = sol * prices['SOL/EUR']
    const btcValueUsd = btc * prices['BTC/USD']
    const solValueUsd = sol * prices['SOL/USD']
    const totalEur = btcValueEur + solValueEur + eur
    const totalUsd = btcValueUsd + solValueUsd + (eur * (prices['BTC/USD'] / prices['BTC/EUR']))
    console.log(chalk.bold.cyan('--- Portfolio Value ---'))
    console.log(chalk.yellow(`BTC: ${btc} ≈ €${btcValueEur.toFixed(2)} / $${btcValueUsd.toFixed(2)}`))
    console.log(chalk.yellow(`SOL: ${sol} ≈ €${solValueEur.toFixed(2)} / $${solValueUsd.toFixed(2)}`))
    console.log(chalk.yellow(`EUR (uninvested): €${eur.toFixed(2)} ≈ $${(eur * (prices['BTC/USD'] / prices['BTC/EUR'])).toFixed(2)}`))
    console.log(chalk.greenBright(`Total ≈ €${totalEur.toFixed(2)} / $${totalUsd.toFixed(2)}`))
    console.log(chalk.bold.cyan('-----------------------'))

    // Interactive CLI for savings plan
    const rl = readline.createInterface({ input, output });
    const runPlan = await rl.question(chalk.magenta('Do you want to run your savings plan? (y/N): '));
    if (!/^y(es)?$/i.test(runPlan.trim())) {
      console.log(chalk.magentaBright('🛸 Your portfolio is already flying to the moon anyways! 🌝🚀'));
      console.log(chalk.magentaBright('Trotzdem ein Geringverdiener move von dir 💩'));
      rl.close();
      return;
    }
    // Prompt for BTC and SOL EUR amounts
    const btcInput = await rl.question(chalk.magenta(`Enter € amount to buy BTC (default ${BTC_AMOUNT_EUR}, 0 to skip): `));
    const solInput = await rl.question(chalk.magenta(`Enter € amount to buy SOL (default ${SOL_AMOUNT_EUR}, 0 to skip): `));
    const btcEurAmount = btcInput.trim() === '' ? BTC_AMOUNT_EUR : parseFloat(btcInput);
    const solEurAmount = solInput.trim() === '' ? SOL_AMOUNT_EUR : parseFloat(solInput);
    if (
      isNaN(btcEurAmount) || btcEurAmount < 0 ||
      isNaN(solEurAmount) || solEurAmount < 0
    ) {
      console.log(chalk.red('Invalid input for BTC or SOL amount. Exiting.'));
      rl.close();
      return;
    }
    if (btcEurAmount === 0 && solEurAmount === 0) {
      console.log(chalk.blue('No purchase selected. Exiting.'));
      rl.close();
      return;
    }
    const totalNeeded = btcEurAmount + solEurAmount;
    if (eur < totalNeeded) {
      console.log(chalk.red(`⛔ Not enough EUR to DCA. Need €${totalNeeded}, have €${eur.toFixed(2)}.`));
      rl.close();
      return;
    }
    // Confirm purchase
    let confirmMsg = 'Confirm purchase:';
    if (btcEurAmount > 0) confirmMsg += ` €${btcEurAmount} BTC`;
    if (solEurAmount > 0) confirmMsg += (btcEurAmount > 0 ? ' and' : '') + ` €${solEurAmount} SOL`;
    confirmMsg += ' (y/N): ';
    const confirm = await rl.question(chalk.yellowBright(confirmMsg));
    if (!/^y(es)?$/i.test(confirm.trim())) {
      console.log(chalk.blue('Purchase cancelled. Exiting.'));
      console.log(chalk.magentaBright('🌙 No worries, maybe next time we catch the moon! 🚀🌝'));
      rl.close();
      return;
    }
    // Place orders
    console.log(chalk.green('Placing orders...'));
    let btcOrder, solOrder;
    if (btcEurAmount > 0) {
      btcOrder = await buyMarketForFiat('XBTEUR', btcEurAmount);
      console.log(chalk.green('BTC order result:'), btcOrder);
    }
    if (solEurAmount > 0) {
      solOrder = await buyMarketForFiat('SOLEUR', solEurAmount);
      console.log(chalk.green('SOL order result:'), solOrder);
    }
    console.log(chalk.magentaBright('🚀 Orders placed! Next stop: the moon! 🌝✨'));
    // Fetch updated balance and show new portfolio value
    const newBalance = await getBalance();
    const newBtc = parseFloat(newBalance.XXBT || newBalance.XBT || '0')
    const newSol = parseFloat(newBalance.SOL || '0')
    const newEur = parseFloat(newBalance.ZEUR || '0')
    const newBtcValueEur = newBtc * prices['BTC/EUR']
    const newSolValueEur = newSol * prices['SOL/EUR']
    const newBtcValueUsd = newBtc * prices['BTC/USD']
    const newSolValueUsd = newSol * prices['SOL/USD']
    const newTotalEur = newBtcValueEur + newSolValueEur + newEur
    const newTotalUsd = newBtcValueUsd + newSolValueUsd + (newEur * (prices['BTC/USD'] / prices['BTC/EUR']))
    console.log(chalk.bold.cyan('--- Updated Portfolio Value ---'))
    console.log(chalk.yellow(`BTC: ${newBtc} ≈ €${newBtcValueEur.toFixed(2)} / $${newBtcValueUsd.toFixed(2)}`))
    console.log(chalk.yellow(`SOL: ${newSol} ≈ €${newSolValueEur.toFixed(2)} / $${newSolValueUsd.toFixed(2)}`))
    console.log(chalk.yellow(`EUR (uninvested): €${newEur.toFixed(2)} ≈ $${(newEur * (prices['BTC/USD'] / prices['BTC/EUR'])).toFixed(2)}`))
    console.log(chalk.greenBright(`Total ≈ €${newTotalEur.toFixed(2)} / $${newTotalUsd.toFixed(2)}`))
    console.log(chalk.bold.cyan('-------------------------------'))
    rl.close();
  } catch (err) {
    console.error(chalk.red('Error:'), err.response?.data?.error || err.message)
  }
})();
