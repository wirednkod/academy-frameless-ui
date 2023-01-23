/* eslint-disable @typescript-eslint/no-unused-vars */
import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { Tuple, u8, u16, u32, Enum, Struct, Vector, str, Codec } from "scale-ts"
import "./App.css";

import { toHex } from '@unstoppablejs/utils';


const {
  mnemonicGenerate,
  mnemonicToMiniSecret,
  mnemonicValidate,
  sr25519PairFromSeed  
} = require('@polkadot/util-crypto');

const CHAIN_URL = 'http://127.0.0.1:9944';

enum Call {
  SetValue,
  Mint,
  Transfer,
  Burn,
  Upgrade
}

const basicExtrinsic = Struct({
  call: Enum({
    setValue: u32,
    mint: Tuple(u32, u32),
    transfer:  Tuple(u32, u32, u32),
    burn: Tuple(u32, u32),
    upgrade: Vector(u8)
  })
});

const removeSize = (inp: string): string =>  {
  return inp.slice(4);
}

const callAxios = async (id: number, method: string, params: any) => {
  return await axios.post(CHAIN_URL, { jsonrpc: "2.0", id, method, params });
}

const socket = new WebSocket('ws://127.0.0.1:9944');

interface Account {
  mnemonic: string;
  publickey: string;
  privatekey: string;
}

const App = () => {
    const [inputId, setInputId] = useState<number>(1);
    const [inputValue, setInputValue] = useState<string>("");
    const [method, setMethod] = useState<string>("author_submitExtrinsic");
    const [calledJson, setCalledJson] = useState<string>("");
    const [response, setResponse] = useState<string | undefined>("");
    const [result, setResult] = useState<number | undefined>();

    const [account, setAccount] = useState<Account>({mnemonic: "", publickey: "", privatekey: ""});

    const [call, setCall] = useState<string>("1")

    const [retrievedState, setRetrievedState] = useState<number | undefined>();

    const [connectMessage, setConnectMessage] = useState<string>("Disconnected");
    const [latestMessage, setLatestMessage] = useState<string>("");

    // 1st 2 bytes should be discared (its length)
    // 2nd 2 numbers of the incoming
    const encode = () => {
      if (!account?.mnemonic) {
        alert("you first must make an account");
      }
      let callForEncoding = {
        call: { tag: "mint", value: [str.enc(account?.publickey), u32.enc(100)]}
      };
      // basicExtrinsic.enc({ call: { tag: "mint", value: [str.enc(account?.publickey), u32.enc(100)]} });
    }

    const sendCall = async () => {
      setCalledJson(JSON.stringify({ jsonrpc: "2.0", id: inputId, method, params: [u32.enc(parseInt(inputValue))] }))
      const res = await callAxios(inputId, method, []);
      if (res?.data?.result) {
        setResponse(JSON.stringify(res.data));
        setResult(u8.dec(res?.data?.result));
      }
      setInputId(inputId + 1);
    }

    const getResponse = async() => {
      setRetrievedState(u16.dec(removeSize("14002a000000")));
    }

    useEffect(() => {
      socket.send('{"id":1,"jsonrpc":"2.0","method":"chain_subscribeFinalizedHeads","params":[]}');
      setConnectMessage("Connected");
      
      socket.addEventListener('close', (event) => {
        setConnectMessage("Closed");
      })
      socket.addEventListener('error', (event) => {
        console.log('WebSocket error: ', event);
        setConnectMessage("Error - see browser console for more details");
      });
      socket.addEventListener('message', (event) => {
          setLatestMessage(event.data)
      });

      if (socket.CLOSED) {
        console.log('closed')
      }
    }, []);

    const generateAccount = () => {
      // Create mnemonic string for Alice using BIP39
      const mnemonic = mnemonicGenerate();
        console.log(`Generated mnemonic: ${mnemonic}`);
      // Validate the mnemonic string that was generated
      const isValidMnemonic = mnemonicValidate(mnemonic);
      console.log(`isValidMnemonic: ${isValidMnemonic}`);
      // Create valid Substrate-compatible seed from mnemonic
      const seedAlice = mnemonicToMiniSecret(mnemonic);
      // Generate new public/secret keypair for Alice from the supplied seed
      const { publicKey, secretKey } = sr25519PairFromSeed(seedAlice);
      console.log('publicKey, secretKey', toHex(publicKey), toHex(secretKey));

      setAccount({
        mnemonic,
        publickey: toHex(publicKey),
        privatekey: toHex(secretKey)
      })
    }
   
    return (
      <div className="App">
          <div>Status: <span style={{ fontWeight: 'bold'}}>{connectMessage}</span></div>
          
          <div>
            <div style={{ padding: '30px 0' }}>Click the button below to generate an account (save the mnemonic for retrieval)</div>
            <button style={{ margin: '10px 0 20px' }} onClick={() => {
              generateAccount();
            }}> Create Account on the fly</button>
          </div>
          <div className="accountInfo">
            <div>Account Mnemonic:
              <div>
                <textarea disabled value={account?.mnemonic} rows={3} cols={70} />
              </div>
            </div>
            <div>Public Key:
              <div>
                <textarea disabled value={account?.publickey} rows={2} cols={70} />
              </div>
            </div>
            <div>Private Key:
              <div>
                <textarea disabled value={account?.privatekey} rows={2} cols={70} />
              </div>
            </div>
          </div>
          <select style={{ margin: '10px 0 20px' }} name="whichFn" value={call} onChange={v => setCall(v.target.value)}>
            <option value="0" disabled>SetValue</option>
            <option value="1">Mint</option>
            <option value="2">Transfer</option>
            <option value="3">Burn</option>
            <option value="4" disabled>Upgrade</option>
          </select>
          <div style={{ margin: '10px 0 20px' }}>Amount:<input value={inputValue} onChange={val => setInputValue(val.target.value)} /></div>
          <button style={{ margin: '10px 0 20px' }} onClick={() => sendCall()}> click me for submitting chosen extrinsic</button>
          <button style={{ margin: '10px 0 20px' }} onClick={() => sendCall()}> Check Balance</button>
          <div>JSON sent: {calledJson}</div>
          <div>Response: {response}</div>
          <div>Result: {result}</div>

          <div style={{ marginTop: "20px", fontWeight:"bold" }}>Latest Message:</div><div className="jsonMsg">{latestMessage}</div>
      </div>
    )
}

export default App;
