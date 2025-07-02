// kraken_dca.js
import axios from 'axios'
import crypto from 'crypto'
import dotenv from 'dotenv'
dotenv.config()

// Configuration
const BTC_AMOUNT_EUR = 250
const SOL_AMOUNT_EUR = 250
const TOTAL_ORDER_AMOUNT = BTC_AMOUNT_EUR + SOL_AMOUNT_EUR

const API_KEY = process.env.KRAKEN_API_KEY
const API_SECRET = process.env.KRAKEN_API_SECRET
const API_URL = 'https://api.kraken.com'

function getKrakenSignature (path, request, nonce, secret) {
  const message = new URLSearchParams(request).toString()
  const secretBuffer = Buffer.from(secret, 'base64')
  const hash = crypto.createHash('sha256')
  const hmac = crypto.createHmac('sha512', secretBuffer)
  const hashDigest = hash.update(nonce + message).digest()
  const hmacDigest = hmac.update(path + hashDigest).digest('base64')
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

  const response = await axios.post(
    `${API_URL}${path}`,
    new URLSearchParams(body),
    {
      headers
    }
  )
  return response.data.result
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

(async () => {
  try {
    const balance = await getBalance()
    console.log('Current balance:', balance)

    const eur = parseFloat(balance.ZEUR || '0')
    if (eur < TOTAL_ORDER_AMOUNT) {
      console.log(`⛔ Not enough EUR to DCA. Need €${TOTAL_ORDER_AMOUNT}, have €${eur.toFixed(2)}. Skipping.`)
      return
    }

    console.log('✅ Enough EUR available, placing orders...')
    const btcOrder = await buyMarketForFiat('XXBTZEUR', BTC_AMOUNT_EUR)
    const solOrder = await buyMarketForFiat('SOLZEUR', SOL_AMOUNT_EUR)
    console.log('BTC order:', btcOrder)
    console.log('SOL order:', solOrder)
  } catch (err) {
    console.error('Error:', err.response?.data?.error || err.message)
  }
})()
