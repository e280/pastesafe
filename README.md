
# 🫙📜 pastesafe — secrets in public
> 👉 *https://pastesafe.org/* 👈

pastesafe turns private messages into publicly-viewable links that only intended recipients can decrypt.

### user-sovereign local-first technology.
- **your device, your secrets.** encryption and decryption happen locally in your browser.
- **no database, no api.** pastesafe is a 100% static clientside app. the data is in the links, nowhere else.
- **open-source cryptography.** powered by [authlocal](https://github.com/e280/authlocal#readme) and [noble cryptography](https://paulmillr.com/noble/).

### cypherpunk details.
- *ed25519, x25519, xchacha20poly1305, blake3.*
- authlocal provides a login with stable delegate crypt keypair with identity provenance.
- invite links offer the crypt pubkey with the identity provenance.
- secrets are encrypted with an ephemeral diffie-hellman off the recipient's crypt pubkey.
- secret links contain ciphertext and identity provenance signed by sender's crypt key.
- both sender and recipient crypt pubkeys are authenticated against their authlocal ids.



<br/><br/>

---

🧑‍💻 *https://e280.org/*

