// Initialize the SimplePool from NostrTools
const pool = new NostrTools.SimplePool();

// Default relay configuration
let relays = [
  { id: 0, url: 'wss://relay.nostr.band', read:  true, write: true, dms: false, name:'', description: "", pubkey: "", contact: "", supported_nips: [], enabled : true },
];

let userRelays = [];

/**
 * Fetches the user's preferred relays from their Nostr profile (kind 10002 events).
 * @param {string} publicKey - The user's public key.
 * @returns {Promise<Array>} - A promise that resolves to an array of relay objects.
 */
const getRelaysFromUser = async (publicKey) => {
  return new Promise((resolve, reject) => {

    try {
      const subscription = pool.subscribeMany(
        relays.map(relay => relay.url),
        [{ kinds: [10002, 10050], authors: [publicKey] }],
        {
          async onevent(event) {
            event.tags.forEach(tag => {
              if (tag[0] === 'r' || tag[0] === 'relay') {
                tag[1].endsWith('/') == true ? tag[1] = tag[1].slice(0, -1) : null;
                const existingRelay = userRelays.find(relay => relay.url == tag[1]);
                if (existingRelay) {
                  console.log("existing relay found", existingRelay, tag);
                  if (tag[2] == 'read' && tag[0] == 'r'){
                    existingRelay.read = true;
                    existingRelay.write = false;
                  }
                  if (tag[2] == 'write' && tag[0] == 'r'){
                    existingRelay.write = true;
                    existingRelay.read = false;
                  }
                  if (tag[2] == undefined && tag[0] == 'r'){
                    existingRelay.write = true;
                    existingRelay.read = true;
                  }
                  if (tag[0] == 'relay') existingRelay.dms = true;
                  
                  console.log("existing relay updated", existingRelay, tag);
                  return;
                }
                userRelays.push({ id : userRelays.length, 
                                  url: tag[1].endsWith('/') == true ? tag[1].slice(0, -1) : tag[1], 
                                  read: tag[2] == 'read' || tag[2] == undefined && tag[0] == 'r' ? true : false, 
                                  write: tag[2] == 'write' || tag[2] == undefined && tag[0] == 'r' ? true : false, 
                                  dms: tag[0] == 'relay' ? true : false, 
                                  name: '', 
                                  description: '', 
                                  pubkey: '', 
                                  contact: '', 
                                  supported_nips: [], 
                                  enabled : true });
              }
            });
          },
          oneose() {
            subscription.close();
            (async () => {
                for (const relay of userRelays) {
                    try {
                        const response = await fetch(relay.url.replace('wss://', 'https://').replace('ws://', 'http://'), {
                            headers: {
                                'Accept': 'application/nostr+json'
                            }
                        });
                        const data = await response.json();
                        relay.name = data.name;
                        relay.description = data.description;
                        relay.pubkey = data.pubkey;
                        relay.contact = data.contact;
                        relay.supported_nips = data.supported_nips;
                        relay.pubkey = data.pubkey;
                    } catch (error) {
                        console.debug('Error fetching relay data:', error);
                    }
                }
                console.log('User relays:', userRelays);
            
                resolve(userRelays);
            })();
          }
        }
      );
    } catch (error) {
      console.error("Error obtaining user relays:", error);
      reject(error);
    }
  });
};

/**
 * Checks if a relay is online.
 * @param {string} relayUrl - The URL of the relay to check.
 * @returns {Promise<Object>} - A promise that resolves to an object with the online status and response time.
 */
const isRelayOnline = async (relayUrl) => {
    return new Promise(async (resolve) => {
        const startTime = Date.now(); 
        new Promise((resolve) => {setTimeout(() => {
          resolve({ online: false, ping: null });
        }), 1000});
        const url = relayUrl.replace(/^wss?:\/\//, (match) => match === 'wss://' ? 'https://' : 'http://');
        try {
            await fetch(url, { method: 'GET', mode: 'no-cors' });
            const responseTime = Date.now() - startTime; 
            resolve({ online: true, ping: responseTime });
        } catch (error) {
            resolve({ online: false, ping: null });
        }
    });
};

/**
 * Ensures that the profile content has at least the minimum required fields.
 * @param {Object} content - The profile content to ensure.
 * @returns {Object} - The content with minimum required fields ensured.
 */
const ensureMinimumFields = (content) => {
  const defaultFields = {
    name: "",
    banner: null,
    picture: null,
    website: "",
    lud16: "",
    nip05: ""
  };
  return { ...defaultFields, ...content };
};

/**
 * Publishes the updated profile data to the user's relays.
 * @param {Object} updatedFields - The updated fields to merge into the profile.
 * @param {string} publicKey - The user's public key.
 * @param {string} secretKey - The user's secret key.
 * @returns {Promise<boolean>} - A promise that resolves to true if publishing was successful.
 */
const publishProfileData = async (updatedFields, publicKey, secretKey) => {
  if (!updatedFields || Object.keys(updatedFields).length === 0 || !publicKey) {
    console.error("No updated fields or public key provided.");
    return;
  }

  console.log("Default relays:", relays.map(relay => relay.url));

  let result = await getRelaysFromUser(publicKey);
  if (!result || userRelays.length === 0) {
    console.warn("No relays found for user, using default relays.");
  } else {
    relays = result;
  }

  console.log("Relays to use:", relays.map(relay => relay.url));

  return new Promise((resolve, reject) => {
    let combinedContent = {};

    try {
      const subscription = pool.subscribeMany(
        relays.map(relay => relay.url),
        [{ kinds: [0], authors: [publicKey] }],
        {
          async onevent(event) {
            try {
              const eventContent = JSON.parse(event.content);
              console.log("Received event:", eventContent);
              combinedContent = { ...combinedContent, ...eventContent };
            } catch (error) {
              console.error("Error parsing event content:", error);
              reject("Error parsing event content");
            }
          },
          async oneose() {
            subscription.close();
            const updatedContent = ensureMinimumFields({ ...combinedContent, ...updatedFields });

            const event = {
              kind: 0,
              created_at: Math.floor(Date.now() / 1000),
              tags: [],
              content: JSON.stringify(updatedContent),
              pubkey: publicKey
            };

            let signedEvent;
            try {
              if (secretKey) {
                const decodedSecretKey = NostrTools.nip19.decode(secretKey).data;
                signedEvent = await NostrTools.finalizeEvent(event, decodedSecretKey);
              } else if (window.nostr && window.nostr.signEvent) {
                signedEvent = await window.nostr.signEvent(event);
              } else {
                throw new Error("No secret key provided and window.nostr is not available.");
              }
            } catch (error) {
              console.error("Error signing event:", error);
              reject(error);
            }

            if (!NostrTools.verifyEvent(signedEvent)) {
              console.error("Signed event is not valid.");
              reject("Signed event is not valid.");
            }

            console.log("Signed event generated:", signedEvent);

            try {
              await Promise.any(pool.publish(relays.map(relay => relay.url), signedEvent));
              console.log("Event published successfully.");
              resolve(true);
            } catch (error) {
              console.error("Failed to publish event:", error);
              reject(error);
            }
          },
        }
      );
    } catch (error) {
      console.error("Error during publishing profile data:", error);
      reject(error);
    }
  });
};

const subscribeRelays = async (kind, pubkeys, since, until) => {
  if (!Array.isArray(pubkeys)) pubkeys = [pubkeys];

  if (pubkeys.length === 0 || kind === undefined) {
    console.error("No pubkeys or kind provided.");
    return;
  }

  const p = [...new Set(pubkeys)].map(pubkey => {
    if (!pubkey.startsWith('npub')) return pubkey;
    try {
      return NostrTools.nip19.decode(pubkey).data; 
    } catch (error) {
      console.error(`Error decoding pubkey: ${pubkey}`, error);
      return null; 
    }
  }).filter(pubkey => pubkey !== null); 

  return new Promise((resolve, reject) => {
    const notes = [];

    try {
      const subscription = pool.subscribeMany(
        relays.map(relay => relay.url), 
        [{
          kinds: [kind], 
          authors: p,
          since: since || Math.floor(Date.now() / 1000) - (30 * 24 * 60 * 60), // default to 30 days
          until: until || Math.floor(Date.now() / 1000) // default to now
        }],
        {
          async onevent(event) {
            notes.push(event);
          },
          oneose() {
            resolve(notes.sort((a, b) => b.created_at - a.created_at)); 
            subscription.close();
          }
        }
      );
    } catch (error) {
      subscription.close();
      console.error("Error obtaining pubkey notes:", error);
      reject(error);
    }
  });
}


