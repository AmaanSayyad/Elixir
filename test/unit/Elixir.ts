import { Client, Provider, ProviderRegistry, Result } from "@blockstack/clarity"
import { readFileSync } from 'fs'

const chai = require('chai')
chai.use(require('chai-string'))
const assert = chai.assert

import { providerWithInitialAllocations } from "./providerWithInitialAllocations";

import { ElixirClient } from "../../src/clients/Elixir-client"
import { GeyserClient } from "../../src/clients/geyser-client"
import { OracleClient } from "../../src/clients/oracle-client"
import { SwaprClient } from "../../src/clients/swapr-client"
import { ElixirStxTokenClient } from "../../src/clients/Elixir-stx-token-client"
import { PlaidStxTokenClient } from "../../src/clients/plaid-stx-token-client"
import { StxClient } from "../../src/clients/stx-client"
import { PlaidClient } from "../../src/clients/plaid-client"
import {
  NoLiquidityError,
  NotOKErr,
  NotOwnerError,
  TransferError,
} from '../../src/errors'

import * as balances from '../../balances.json'

console.log(balances)

describe("full test suite", () => {
  let provider: Provider

  let src20TraitClient: Client
  let swaprTraitClient: Client

  let ElixirClient: Client
  let geyserClient: Client
  let oracleClient: Client
  let swaprClient: Client
  let ElixirStxTokenClient: Client
  let stxClient: Client
  let plaidClient: Client
  let plaidStxTokenClient: Client

  const prices = [
    1_100_000,
    1_150_000,
    1_050_000,
      950_000,
      900_000,
    1_000_000,
    1_000_000,
    1_000_000,
  ]

  const addresses = [
    "SP2J6ZY48GV1EZ5V2V5RB9MP66SW86PYKKNRV9EJ7",  // alice, u20 tokens of each
    "S02J6ZY48GV1EZ5V2V5RB9MP66SW86PYKKPVKG2CE",  // bob, u10 tokens of each
    "SZ2J6ZY48GV1EZ5V2V5RB9MP66SW86PYKKQ9H6DPR",  // zoe, no tokens
    "SP138CBPVKYBQQ480EZXJQK89HCHY32XBQ0T4BCCD",  // TBD
    "SP30JX68J79SMTTN0D2KXQAJBFVYY56BZJEYS3X0B",  // Elixir treasury

  ]
  const alice = addresses[0]
  const bob = addresses[1]
  const zoe = addresses[2]
  const Elixir_treasury = `${addresses[4]}`
  const Elixir_token = `ST3J2GVMMM2R07ZFBJDWTYEYAR8FZH5WKDTFJ9AHA.Elixir-token`
  const Elixir_stx_token = `ST3J2GVMMM2R07ZFBJDWTYEYAR8FZH5WKDTFJ9AHA.Elixir-stx-token`
  const stx_token = `ST3J2GVMMM2R07ZFBJDWTYEYAR8FZH5WKDTFJ9AHA.stx-token`

  before(async () => {
    ProviderRegistry.registerProvider(
      providerWithInitialAllocations(balances)
    )
    provider = await ProviderRegistry.createProvider()

    src20TraitClient = new Client("ST3J2GVMMM2R07ZFBJDWTYEYAR8FZH5WKDTFJ9AHA.src20-trait", "src20-trait", provider)
    swaprTraitClient = new Client("ST3J2GVMMM2R07ZFBJDWTYEYAR8FZH5WKDTFJ9AHA.swapr-trait", "swapr-trait", provider)

    ElixirClient = new ElixirClient("ST3J2GVMMM2R07ZFBJDWTYEYAR8FZH5WKDTFJ9AHA", provider)
    geyserClient = new GeyserClient("ST3J2GVMMM2R07ZFBJDWTYEYAR8FZH5WKDTFJ9AHA", provider)
    oracleClient = new OracleClient("ST3J2GVMMM2R07ZFBJDWTYEYAR8FZH5WKDTFJ9AHA", provider)
    swaprClient = new SwaprClient("ST3J2GVMMM2R07ZFBJDWTYEYAR8FZH5WKDTFJ9AHA", provider)
    ElixirStxTokenClient = new ElixirStxTokenClient("Elixir-stx", "ST3J2GVMMM2R07ZFBJDWTYEYAR8FZH5WKDTFJ9AHA", provider)
    stxClient = new StxClient("ST3J2GVMMM2R07ZFBJDWTYEYAR8FZH5WKDTFJ9AHA", provider)
    plaidClient = new PlaidClient("ST3J2GVMMM2R07ZFBJDWTYEYAR8FZH5WKDTFJ9AHA", provider)
    plaidStxTokenClient = new PlaidStxTokenClient("plaid-stx", "ST3J2GVMMM2R07ZFBJDWTYEYAR8FZH5WKDTFJ9AHA", provider)
  })

  describe("Check contracts", () => {
    it("should have a valid syntax", async () => {
      await src20TraitClient.checkContract()
      await src20TraitClient.deployContract()

      await swaprTraitClient.checkContract()
      await swaprTraitClient.deployContract()

      await plaidClient.checkContract()
      await plaidClient.deployContract()

      await swaprClient.checkContract()
      await swaprClient.deployContract()

      await stxClient.checkContract()
      await stxClient.deployContract()

      await oracleClient.checkContract()
      await oracleClient.deployContract()

      await ElixirClient.checkContract()
      await ElixirClient.deployContract()

      await ElixirStxTokenClient.checkContract()
      await ElixirStxTokenClient.deployContract()

      await geyserClient.checkContract()
      await geyserClient.deployContract()

      await plaidStxTokenClient.checkContract()
      await plaidStxTokenClient.deployContract()
    })
  })

  describe("Full scenario", () => {
    before(async () => {
      // // wrap stx into wrapr
      // console.log("======>  wrap.treasury")
      // assert(await wraprClient.wrap(50_000_000_000_000, {sender: Elixir_treasury}))

      // create flerx-swapr pair
      console.log("======>  createPair.treasury")
      assert(await swaprClient.createPair(Elixir_token, stx_token, Elixir_stx_token, "Elixir-stx", 50_000_000_000_000, 50_000_000_000_000, {sender: Elixir_treasury}), "createPair did not return true")


      // // Alice wraps STX
      // console.log("======>  wrap.alice")
      // assert(await wraprClient.wrap(100_000_000_000, {sender: alice}))
      // Alice gets some ELIXIR
      console.log("======>  swapExactYforX.alice")
      assert(await swaprClient.swapYforExactX(Elixir_token, stx_token, 40_000_000_000, {sender: alice}))
      // Alice add a position on swapr's Elixir-stx pair
      console.log("======>  addToPosition.alice")
      assert(await swaprClient.addToPosition(Elixir_token, stx_token, Elixir_stx_token, 40_000_000_000, 40_000_000_000, {sender: alice}), "addToPosition did not return true")
      // Alice stakes her position on geyser
      console.log("======>  stake.alice")
      assert.equal(await ElixirStxTokenClient.balanceOf(alice, {sender: alice}), 40_000_000_000)
      assert(await geyserClient.stake(40_000_000_000, {sender: alice}), "stake did not return true")
      assert.equal(await ElixirClient.balanceOf(alice, {sender: alice}), 0)
      assert.equal(await ElixirStxTokenClient.balanceOf(alice, {sender: alice}), 0)

      // // Bob wraps STX
      // console.log("======>  wrap.bob")
      // assert(await wraprClient.wrap(50_000_000_000, {sender: bob}))

      // // Zoe wraps STX
      // console.log("======>  wrap.zoe")
      // assert(await wraprClient.wrap(50_000_000_000, {sender: zoe}))
      // Zoe gets a lot of ELIXIR
      console.log("======>  swapExactYforX.zoe")
      assert(await swaprClient.swapExactYforX(Elixir_token, stx_token, 50_000_000_000, {sender: zoe}))

      for (let i = 0; i < 5; i++) {
        console.log(`======>  swapExactYforX.bob - round ${i}`)

        // Bob exhanges stx for Elixir (back and forth 5x)
        console.log("======>  swapExactYforX.bob")
        assert(await swaprClient.swapExactYforX(Elixir_token, stx_token, 2_000_000_000, {sender: bob}))
        // Zoe exhanges Elixir for stx (back and forth 5x)
        console.log("======>  swapExactXforY.zoe")
        assert(await swaprClient.swapExactXforY(Elixir_token, stx_token, 2_000_000_000, {sender: zoe}))

        console.log("======>  updatePrice.zoe")
        assert(await oracleClient.updatePrice(prices[i], {sender: zoe}))
        console.log(`======>  rebase.zoe - ${prices[i]}`)
        assert(await ElixirClient.rebase({sender: zoe}))
      }

      // Alice collects her reward on geyser
      console.log("======>  unstake.alice")
      assert(await geyserClient.unstake({sender: alice}), "stake did not return true")
    })

    it("check balances after running scenario", async () => {
      // Alice checks the fees she collected
      assert.equal(await ElixirClient.balanceOf(alice, {sender: alice}), 880_000)
      assert.equal(await ElixirStxTokenClient.balanceOf(alice, {sender: alice}), 40_000_000_000)

      // total ELIXIR supply
      assert.equal(await ElixirClient.totalSupply({sender: alice}), 1_014_873_127_537_500) // starting value: 1_000_000_000_000_000
    })

  })

  after(async () => {
    await provider.close()
  })
})
