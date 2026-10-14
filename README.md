
# 🫙📜 https://pastesafe.org/
> *secrets in public*

pastesafe turns private messages into publicly-viewable links that only intended recipients can decrypt.

### pastesafe is user-sovereign local-first technology.
- **your device, your secrets.** encryption and decryption happen locally in your browser.
- **no database, no api.** pastesafe is a 100% static clientside app with no api calls. the data is in the links, do what you want with them.
- **open-source cryptography.** powered by [authlocal](https://github.com/e280/authlocal#readme) and [noble cryptography](https://paulmillr.com/noble/).

### cypherpunk details
- authlocal provides logins with a verifiable chain-of-custody to the user's stable ed25519 crypt keypair.
- invite links offer the crypt pubkey verifiably originating from authlocal identity via proof token.
- secrets are encrypted with an ephemeral keypair diffie-hellman'd off the proven recipient crypt pubkey.
- secret links contain the ciphertext and also the sender's crypt pubkey with identity proof.
- both sender and recipient are authenticated against their authlocal ids in all cases.



<br/><br/>

---

🧑‍💻 *https://e280.org/*

