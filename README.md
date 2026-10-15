
# 🤫 https://pastesafe.org/ secrets in public

***pastesafe turns private messages into public links that only intended recipients can decrypt.***

occasionally, my dad and i need to exchange passwords or credit card numbers or whatever, and every time, he's like *"should we email this or what?"* then i'm like *"that's not exactly ideal"* and he's like *"okay so what's a good way?"* then i'm like *"well we could use gpg"* and he's like *"use what??"* then i'm like... *"nevermind"...*  
so that's why i built pastesafe.

📜→🫙

### pastesafe is local-first and user-sovereign.
- **no database, no api.** 100% static clientside app. secrets are in the links, literally.
- **your device, your data.** encryption and decryption happen locally in your browser.
- **open-source cryptography.** powered by [authlocal](https://github.com/e280/authlocal#readme) and [noble cryptography](https://paulmillr.com/noble/).
- **hand-crafted.** with care. by a human being.

### pastesafe is cypherpunk.
- *ed25519. x25519. xchacha20poly1305. blake3.*
- authlocal provides a login with a stable delegate crypt keypair with identity provenance.
- invite link contains recipient crypt pubkey with provenance.
- secret is encrypted with an ephemeral diffie-hellman off the recipient's crypt pubkey.
- secret link contains ciphertext and sender provenance signed by sender crypt key.
- both sender and recipient crypt pubkeys are authenticated against their authlocal ids.



<br/><br/>

---

🧑‍💻 *https://e280.org/*

