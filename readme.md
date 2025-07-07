# 🪙 Kraken Savings Plan CLI

A simple Node.js CLI tool to **automate recurring purchases of Bitcoin (BTC) and Solana (SOL)** via the **Kraken Pro API** – with minimal fees, full control, and a simple interface.

Designed for efficient Dollar/Euro-Cost Averaging, this tool helps you accumulate crypto over time while avoiding the higher fees of standard Kraken DCA.

---

## ✨ Features

- ✅ **Low-fee crypto purchases** via Kraken Pro API
- 🪄 Interactive CLI interface
- 💰 Supports buying BTC and SOL (more coming soon)
- 🧠 Smart order sizing and price checks

---

## 🚀 Getting Started

### 0. Not on Kraken yet?

If you use my referral code or link to try it, we'll both earn 50 EUR when you trade 200 EUR of crypto in the app!

**Code:** `g49jh2ps`  
**Link:** https://proinvite.kraken.com/9f1e/nb2p0buh

### 1. Clone the repo

```bash
git clone git@github.com:davidgruebl/kraken-savings-plan.git
cd kraken-savings-plan
```

### 2. Install dependencies

```bash
npm install
```

### 3. Set up your Kraken API key

- Go to [Kraken API Management](https://www.kraken.com/u/security/api)
- Create a new API key with the following permissions:
  - Query Funds
  - Query Open/Closed Orders & Trades
  - Create & Modify Orders
- **Do NOT enable withdrawal permissions for security.**
- Copy your API Key and API Secret.

### 4. Create a `.env` file

In the project root, create a file named `.env`:

```
KRAKEN_API_KEY=your_api_key_here
KRAKEN_API_SECRET=your_api_secret_here
# Optional: Set your default Dollar-Cost Averaging amounts (default: 0)
BTC_AMOUNT_EUR=250
SOL_AMOUNT_EUR=250
```

### 5. Run the CLI

```bash
node index.js
```

---

## 🖥️ Usage

- The CLI will show you current BTC and SOL prices (USD & EUR) and your portfolio value.
- You'll be asked if you want to run your savings plan.
- Enter the EUR amount to buy for BTC and/or SOL (press Enter for default, or 0 to skip either).
- Confirm your purchase.
- If you have enough EUR, the order(s) will be placed and your updated portfolio will be shown.
- Enjoy the fun, positive, and sometimes cheeky CLI experience! 🚀🌝

---

## 🛡️ Security

- Your API key and secret are loaded from `.env` and never logged or shared.
- Do **not** share your `.env` file or commit it to version control.
- For extra safety, restrict your API key to only the necessary permissions and consider IP whitelisting.

---

## 📝 Customization

- You can easily add more coins or change the default Dollar-Cost Averaging amounts by setting `BTC_AMOUNT_EUR` and `SOL_AMOUNT_EUR` in your `.env` file.
- The CLI is designed to be fun and interactive – feel free to tweak the messages or add your own!

---

## ❓ FAQ

**Q: Can I use this for other coins?**  
A: Currently, only BTC and SOL are supported, but you can add more by editing the code.

**Q: Does this work with Kraken's testnet?**  
A: No, this is for the live Kraken Pro API.

**Q: Is this safe?**  
A: As safe as your API key! Never enable withdrawal permissions and keep your `.env` file secure.

---

## 📄 License

MIT
