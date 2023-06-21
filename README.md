# ethereum-input-data-decoder

This is a fork of [ethereum-input-data-decoder](https://github.com/miguelmota/ethereum-input-data-decoder) with few improvements.

- Ethereum Unit Converter (Wei / Gwei / Ether converter)
- Timestamp Date Converter (UNIX timestamp / Human readable converter)
- Get ABI by Contract Address feature
- Auto Decode and paste units into Unit or Timestamp Converters

Please check the original repo for documentation and an NPM package.

The motivation behind this fork is that the archived code actually works fine and it's useful when your team needs to validate the transactions before actually deploying or executing them (e.g. via multi-sig).

web interface is available [here](https://bonnevoyager.github.io/ethereum-input-data-decoder/).

## Development

1. Clone repository:

  ```bash
  git clone git@github.com:BonneVoyager/ethereum-input-data-decoder.git

  cd ethereum-input-data-decoder/
  ```

2. Install dependencies:

  ```bash
  npm install
  ```

3. Make changes.

4. Run tests:

  ```bash
  npm test
  ```

5. Run linter:

  ```bash
  npm run lint
  ```

5. Build:

  ```bash
  npm run build
  ```

## License

[MIT](LICENSE)
