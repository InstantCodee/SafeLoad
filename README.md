# SafeLoad

Be your own file sharing service with ease.

## Install
Download this repository and put it somewhere on your server.

Then do the following:
```sh
cd SafeLoad             # If you aren't in the folder already.
sudo npm i -g serve
npm i --production
serve
```

## Use cases
You ...
* ... want to share huge files¹
* ... need a secure way to exchange files
* ... want to be in control of everything
* ... trust no one
* ... value a modern design
* ... FOSS everything

*¹ As long as your server can handle it*

If one or more points apply to you then: **SafeLoad is the way to go**.

## Security
When handling files of various users it's very important to deal with proper security. Therefore, we follow the principle of **zero-knownledge**. Anyone can create a instance of SafeLoad and all users can be sure that **the owner of that instance cannot read your data.** Only your recipients can decrypt your valuable data.

The way we achive this is by encrypting all data on client-side using **OpenPGP.js**. The password that was used for the encryption will be sent to the server but as a **Argon2 hash**.
